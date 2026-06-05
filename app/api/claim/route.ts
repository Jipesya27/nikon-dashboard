import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotif } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

// Lazy-init agar build tidak fail jika env tidak tersedia saat build
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum di-set di environment.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getAccessToken() {
  let res: Response;
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    throw new Error('Google Auth timeout atau jaringan bermasalah. Coba lagi.');
  }
  const data = await res.json();
  if (!data.access_token) {
    const hint = data.error === 'invalid_grant'
      ? 'Refresh token expired — minta admin perbarui GOOGLE_REFRESH_TOKEN.'
      : JSON.stringify(data);
    throw new Error(`Google Auth gagal: ${hint}`);
  }
  return data.access_token as string;
}

async function uploadToDrive(file: File, fileName: string, accessToken: string): Promise<string> {
  const metadata = { name: fileName, parents: [FOLDER_ID] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  let res: Response;
  try {
    res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form, signal: AbortSignal.timeout(15000) }
    );
  } catch {
    throw new Error('Upload ke Google Drive timeout. File mungkin terlalu besar atau koneksi lambat.');
  }
  const data = await res.json();
  if (!data.id) throw new Error(`Upload Drive gagal: ${JSON.stringify(data)}`);

  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

function normalizePhone(phone: string): string[] {
  const variants = [phone];
  if (phone.startsWith('62')) variants.push('0' + phone.slice(2), '+' + phone);
  else if (phone.startsWith('0')) variants.push('62' + phone.slice(1), '+62' + phone.slice(1));
  else if (phone.startsWith('+62')) variants.push(phone.slice(1), '0' + phone.slice(3));
  return variants;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findKonsumen(supabase: any, phone: string) {
  const variants = normalizePhone(phone);
  for (const v of variants) {
    const { data } = await supabase.from('konsumen').select('*').eq('nomor_wa', v).single();
    if (data) return { konsumen: data, matchedPhone: v };
  }
  return { konsumen: null, matchedPhone: phone };
}

// Helper: anggap placeholder seperti string kosong
function clean(value: string | null | undefined): string {
  if (!value) return '';
  return value === 'BELUM_DIISI' ? '' : value;
}

// GET: pre-fill data konsumen jika sudah ada
export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone')?.trim();
    if (!phone) return NextResponse.json({ error: 'phone wajib' }, { status: 400 });

    const { konsumen } = await findKonsumen(supabase, phone);
    if (!konsumen) {
      return NextResponse.json({ error: 'Nomor WA tidak terdaftar. Silakan mulai chat dengan bot terlebih dahulu.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      konsumen: {
        nomor_wa: konsumen.nomor_wa,
        nama_lengkap: clean(konsumen.nama_lengkap),
        email: clean(konsumen.email),
        // NIK tidak dikirim ke client karena merupakan data sensitif PII
        alamat_rumah: clean(konsumen.alamat_rumah),
        kelurahan: clean(konsumen.kelurahan),
        kecamatan: clean(konsumen.kecamatan),
        kabupaten_kotamadya: clean(konsumen.kabupaten_kotamadya),
        provinsi: clean(konsumen.provinsi),
        kodepos: clean(konsumen.kodepos),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// POST: submit form claim — UPDATE konsumen + INSERT claim_promo + UPLOAD ke Drive
export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const formData = await req.formData();

    // Data Diri Pendaftar (→ tabel konsumen)
    const phone               = (formData.get('phone') as string)?.trim();
    const email               = (formData.get('email') as string)?.trim().toLowerCase() || null;
    const nama_lengkap        = (formData.get('nama_lengkap') as string)?.trim();
    const nik                 = (formData.get('nik') as string)?.trim();
    const alamat_rumah        = (formData.get('alamat_rumah') as string)?.trim();
    const kelurahan           = (formData.get('kelurahan') as string)?.trim();
    const kecamatan           = (formData.get('kecamatan') as string)?.trim();
    const kabupaten_kotamadya = (formData.get('kabupaten_kotamadya') as string)?.trim();
    const provinsi            = (formData.get('provinsi') as string)?.trim();
    const kodepos             = (formData.get('kodepos') as string)?.trim();

    // Data Produk (→ tabel claim_promo)
    const nomor_seri          = (formData.get('nomor_seri') as string)?.trim();
    const tipe_barang         = (formData.get('tipe_barang') as string)?.trim();
    const jenis_promosi       = (formData.get('jenis_promosi') as string)?.trim() || null;
    const tanggal_pembelian   = (formData.get('tanggal_pembelian') as string)?.trim() || null;
    const nama_toko           = (formData.get('nama_toko') as string)?.trim();
    const alamat_pengiriman   = (formData.get('alamat_pengiriman') as string)?.trim();

    // Penerima = pendaftar itu sendiri
    const nama_penerima_claim = nama_lengkap;

    // File
    const fileGaransi = formData.get('foto_kartu_garansi') as File | null;
    const fileNota    = formData.get('foto_nota_pembelian') as File | null;

    // Validasi field wajib (NIK opsional)
    const required = { phone, nama_lengkap, alamat_rumah, kelurahan, kecamatan, kabupaten_kotamadya, provinsi, kodepos, nomor_seri, tipe_barang, nama_toko, alamat_pengiriman };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return NextResponse.json({ error: `Field '${k}' wajib diisi.` }, { status: 400 });
    }
    if (!fileGaransi || !fileNota) {
      return NextResponse.json({ error: 'File Kartu Garansi dan Nota Pembelian wajib diunggah.' }, { status: 400 });
    }

    // Validasi tipe dan ukuran file
    for (const [label, file] of [['Kartu Garansi', fileGaransi], ['Nota Pembelian', fileNota]] as [string, File][]) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `File ${label}: tipe tidak diizinkan. Gunakan JPG, PNG, WEBP, GIF, atau PDF.` }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File ${label}: ukuran maksimal 10 MB.` }, { status: 400 });
      }
    }

    // Validasi panjang input
    if (nama_lengkap && nama_lengkap.length > 150) return NextResponse.json({ error: 'Nama terlalu panjang.' }, { status: 400 });
    if (nomor_seri && nomor_seri.length > 60) return NextResponse.json({ error: 'Nomor seri terlalu panjang.' }, { status: 400 });
    if (tipe_barang && tipe_barang.length > 100) return NextResponse.json({ error: 'Tipe barang terlalu panjang.' }, { status: 400 });
    if (alamat_rumah && alamat_rumah.length > 500) return NextResponse.json({ error: 'Alamat terlalu panjang.' }, { status: 400 });
    if (alamat_pengiriman && alamat_pengiriman.length > 500) return NextResponse.json({ error: 'Alamat pengiriman terlalu panjang.' }, { status: 400 });

    // Cari atau buat konsumen baru (upsert)
    let { konsumen, matchedPhone } = await findKonsumen(supabase, phone);
    if (!konsumen) {
      // Normalisasi phone: jika mulai dari 0 → ganti ke 62
      const normalizedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
      const { error: insertErr } = await supabase.from('konsumen').insert({
        nomor_wa: normalizedPhone,
        nama_lengkap,
        email: email || null,
        nik: nik || null,
        alamat_rumah,
        kelurahan,
        kecamatan,
        kabupaten_kotamadya,
        provinsi,
        kodepos,
        status_langkah: 'START',
      });
      if (insertErr && insertErr.code !== '23505') {
        console.error('Gagal buat konsumen baru:', insertErr);
        return NextResponse.json({ error: 'Gagal mendaftarkan nomor WA: ' + insertErr.message }, { status: 500 });
      }
      matchedPhone = normalizedPhone;
      konsumen = { nomor_wa: normalizedPhone };
    }

    // 1. UPDATE tabel konsumen dengan data diri terbaru
    //    NIK opsional: hanya update kalau diisi, supaya tidak menimpa NIK lama dengan kosong
    const konsumenUpdate: Record<string, string | null> = {
      nama_lengkap,
      alamat_rumah,
      kelurahan,
      kecamatan,
      kabupaten_kotamadya,
      provinsi,
      kodepos,
      updated_at: new Date().toISOString(),
    };
    if (nik)    konsumenUpdate.nik   = nik;
    if (email)  konsumenUpdate.email = email;

    const { error: updateKonsumenError } = await supabase
      .from('konsumen')
      .update(konsumenUpdate)
      .eq('nomor_wa', matchedPhone);

    if (updateKonsumenError) {
      console.error('Gagal update konsumen:', updateKonsumenError);
      return NextResponse.json({ error: 'Gagal menyimpan data diri: ' + updateKonsumenError.message }, { status: 500 });
    }

    // 2. UPLOAD file ke Google Drive
    const accessToken = await getAccessToken();
    const extGaransi = fileGaransi.name.split('.').pop() || 'jpg';
    const extNota    = fileNota.name.split('.').pop() || 'jpg';

    const namaGaransi = `${nomor_seri}_${tipe_barang}_KartuGaransi_${Date.now()}.${extGaransi}`;
    const namaNota    = `${nomor_seri}_${tipe_barang}_NotaPembelian_${Date.now()}.${extNota}`;

    const [urlGaransi, urlNota] = await Promise.all([
      uploadToDrive(fileGaransi, namaGaransi, accessToken),
      uploadToDrive(fileNota, namaNota, accessToken),
    ]);

    const nomor_wa_update = matchedPhone;

    // 3. INSERT ke tabel claim_promo (relasi via nomor_wa)
    const { error: insertClaimError } = await supabase.from('claim_promo').insert({
      nomor_wa: matchedPhone,
      nama_pendaftar: nama_lengkap,
      nama_penerima_claim,
      nomor_seri,
      tipe_barang,
      jenis_promosi,
      tanggal_pembelian,
      nama_toko,
      alamat_pengiriman,
      nomor_wa_update,
      link_kartu_garansi: urlGaransi,
      link_nota_pembelian: urlNota,
    });

    if (insertClaimError) {
      console.error('Gagal insert claim_promo:', insertClaimError);
      return NextResponse.json({ error: 'Gagal menyimpan data claim: ' + insertClaimError.message }, { status: 500 });
    }

    // 4. Reset status_langkah konsumen ke START
    await supabase
      .from('konsumen')
      .update({ status_langkah: 'START' })
      .eq('nomor_wa', matchedPhone);

    // 5+6. Notif ke konsumen & admin (channel: WA / Email / keduanya)
    const pesanWA = `Pengisian data Claim Promo Anda berhasil dan dokumen telah diterima. Proses verifikasi memerlukan waktu maksimal 14 hari kerja. Ketik MENU untuk kembali ke menu utama.`;

    const pesanAdmin =
      `🔔 *Claim Promo Baru!*\n\n` +
      `👤 *Nama:* ${nama_lengkap}\n` +
      `📱 *WhatsApp:* ${matchedPhone}\n` +
      `📧 *Email:* ${email || '-'}\n` +
      `📦 *Produk:* ${tipe_barang}\n` +
      `🔢 *No. Seri:* ${nomor_seri}\n` +
      `🎁 *Promosi:* ${jenis_promosi || '-'}\n` +
      `🏪 *Toko:* ${nama_toko}\n` +
      `📅 *Tgl Beli:* ${tanggal_pembelian || '-'}\n\n` +
      `Verifikasi di Dashboard → tab Claim`;

    await sendNotif(
      {
        phone: matchedPhone, email, message: pesanWA,
        subject: 'Claim Promo Anda Telah Diterima — Nikon',
        waTemplate: { name: 'notif_claim_received', params: [] },
      },
      { message: pesanAdmin, subject: '🔔 Claim Promo Baru — Nikon' },
    );

    return NextResponse.json({ success: true, message: 'Data claim berhasil dikirim!' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server.';
    console.error('Error submit claim:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
