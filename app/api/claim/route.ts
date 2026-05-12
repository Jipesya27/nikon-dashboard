import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FONNTE_TOKEN = process.env.FONNTE_TOKEN || '';

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
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Google Auth gagal: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function uploadToDrive(file: File, fileName: string, accessToken: string): Promise<string> {
  const metadata = { name: fileName, parents: [FOLDER_ID] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
  );
  const data = await res.json();
  if (!data.id) throw new Error(`Upload Drive gagal: ${JSON.stringify(data)}`);

  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

async function kirimWA(nomor: string, pesan: string) {
  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN },
      body: new URLSearchParams({ target: nomor, message: pesan }),
    });
  } catch (e) {
    console.error('Gagal kirim WA:', e);
  }
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
        nik: clean(konsumen.nik),
        alamat_rumah: clean(konsumen.alamat_rumah),
        kelurahan: clean(konsumen.kelurahan),
        kecamatan: clean(konsumen.kecamatan),
        kabupaten_kotamadya: clean(konsumen.kabupaten_kotamadya),
        provinsi: clean(konsumen.provinsi),
        kodepos: clean(konsumen.kodepos),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: submit form claim — UPDATE konsumen + INSERT claim_promo + UPLOAD ke Drive
export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const formData = await req.formData();

    // Penerima
    const recipient_type      = ((formData.get('recipient_type') as string) || 'sendiri').toLowerCase();

    // Data Diri Pendaftar (→ tabel konsumen)
    const phone               = (formData.get('phone') as string)?.trim();
    const nama_lengkap        = (formData.get('nama_lengkap') as string)?.trim();
    const nik                 = (formData.get('nik') as string)?.trim();
    const alamat_rumah        = (formData.get('alamat_rumah') as string)?.trim();
    const kelurahan           = (formData.get('kelurahan') as string)?.trim();
    const kecamatan           = (formData.get('kecamatan') as string)?.trim();
    const kabupaten_kotamadya = (formData.get('kabupaten_kotamadya') as string)?.trim();
    const provinsi            = (formData.get('provinsi') as string)?.trim();
    const kodepos             = (formData.get('kodepos') as string)?.trim();

    // Data Penerima (→ claim_promo, hanya kalau ORANG LAIN)
    const nama_penerima_input = (formData.get('nama_penerima_claim') as string)?.trim();
    const nomor_wa_update_input = ((formData.get('nomor_wa_update') as string) || '').replace(/[^0-9]/g, '');

    // Data Produk (→ tabel claim_promo)
    const nomor_seri          = (formData.get('nomor_seri') as string)?.trim();
    const tipe_barang         = (formData.get('tipe_barang') as string)?.trim();
    const jenis_promosi       = (formData.get('jenis_promosi') as string)?.trim() || null;
    const tanggal_pembelian   = (formData.get('tanggal_pembelian') as string)?.trim() || null;
    const nama_toko           = (formData.get('nama_toko') as string)?.trim();
    const alamat_pengiriman   = (formData.get('alamat_pengiriman') as string)?.trim();

    // Tentukan penerima & nomor update final
    const isOrangLain = recipient_type === 'orang_lain';
    const nama_penerima_claim = isOrangLain ? nama_penerima_input : nama_lengkap;
    if (isOrangLain && !nama_penerima_input) {
      return NextResponse.json({ error: 'Nama Penerima wajib diisi untuk claim atas nama orang lain.' }, { status: 400 });
    }

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

    // Cari konsumen
    const { konsumen, matchedPhone } = await findKonsumen(supabase, phone);
    if (!konsumen) {
      return NextResponse.json({ error: 'Nomor WhatsApp tidak terdaftar. Pastikan Anda sudah mulai chat dengan bot terlebih dahulu.' }, { status: 404 });
    }

    // 1. UPDATE tabel konsumen dengan data diri terbaru
    //    NIK opsional: hanya update kalau diisi, supaya tidak menimpa NIK lama dengan kosong
    const konsumenUpdate: Record<string, string> = {
      nama_lengkap,
      alamat_rumah,
      kelurahan,
      kecamatan,
      kabupaten_kotamadya,
      provinsi,
      kodepos,
      updated_at: new Date().toISOString(),
    };
    if (nik) konsumenUpdate.nik = nik;

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

    // Tentukan nomor_wa_update final:
    // - ORANG LAIN + ada input → pakai nomor penerima
    // - SENDIRI / tidak diisi → default = nomor pendaftar (akan dikonfirmasi via bot)
    const nomor_wa_update = (isOrangLain && nomor_wa_update_input.length >= 10)
      ? nomor_wa_update_input
      : matchedPhone;

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

    // 4. Update status_langkah konsumen
    //    - Kalau ORANG LAIN dan sudah isi nomor update → langsung selesai (status START)
    //    - Kalau SENDIRI / tidak isi nomor update → konfirmasi via bot (TANYA_UPDATE_WA)
    const nextStatus = (isOrangLain && nomor_wa_update_input.length >= 10) ? 'START' : 'TANYA_UPDATE_WA';
    await supabase
      .from('konsumen')
      .update({ status_langkah: nextStatus })
      .eq('nomor_wa', matchedPhone);

    // 5. Kirim notifikasi WA ke pendaftar
    const pesanWA = nextStatus === 'START'
      ? `Pengisian data Claim Promo berhasil dan dokumen telah diterima! 🎉\n\nNotifikasi update status Claim akan kami kirim ke nomor *${nomor_wa_update}*.\n\nProses verifikasi memerlukan waktu maksimal 14 hari kerja. Terima kasih.\n\nKetik *MENU* untuk kembali ke menu utama.`
      : `Pengisian data Claim Promo berhasil dan dokumen telah diterima! 🎉\n\n*Untuk notifikasi update status Claim*, apakah Anda ingin menggunakan nomor WA ini, atau mendaftarkan nomor lain? Ketik *INI* atau *NOMOR LAIN*?`;

    await kirimWA(matchedPhone, pesanWA);

    return NextResponse.json({ success: true, message: 'Data claim berhasil dikirim!' });
  } catch (error: any) {
    console.error('Error submit claim:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
