import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FONNTE_TOKEN    = process.env.FONNTE_TOKEN || '';
const ADMIN_WA_NUMBER = process.env.ADMIN_WA_NUMBER || '';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE env belum di-set.');
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

  // Set permission non-blocking
  fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    signal: AbortSignal.timeout(5000),
  }).catch(e => console.error('Set Drive permission gagal (non-kritis):', e));

  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

async function kirimWA(nomor: string, pesan: string) {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN },
      body: new URLSearchParams({ target: nomor, message: pesan }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error('Fonnte kirimWA HTTP error:', res.status, await res.text());
  } catch (e) {
    console.error('Gagal kirim WA (non-kritis):', e);
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

function clean(value: string | null | undefined): string {
  if (!value) return '';
  return value === 'BELUM_DIISI' ? '' : value;
}

// GET: pre-fill data konsumen + (opsional) data produk dari claim terbaru
export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone')?.trim();
    const fromClaim = searchParams.get('from_claim') === '1';
    if (!phone) return NextResponse.json({ error: 'phone wajib' }, { status: 400 });

    const { konsumen, matchedPhone } = await findKonsumen(supabase, phone);
    if (!konsumen) {
      return NextResponse.json({ error: 'Nomor WA tidak terdaftar. Silakan mulai chat dengan bot terlebih dahulu.' }, { status: 404 });
    }

    const payload: Record<string, unknown> = {
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
    };

    if (fromClaim) {
      const { data: claim } = await supabase
        .from('claim_promo')
        .select('id_claim, nomor_seri, tipe_barang, tanggal_pembelian, nama_toko')
        .eq('nomor_wa', matchedPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (claim) {
        payload.claim = claim;
      }
    }

    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: submit form garansi
export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const formData = await req.formData();

    const phone               = (formData.get('phone') as string)?.trim();
    const nama_lengkap        = (formData.get('nama_lengkap') as string)?.trim();
    const nik                 = (formData.get('nik') as string)?.trim();
    const alamat_rumah        = (formData.get('alamat_rumah') as string)?.trim();
    const kelurahan           = (formData.get('kelurahan') as string)?.trim();
    const kecamatan           = (formData.get('kecamatan') as string)?.trim();
    const kabupaten_kotamadya = (formData.get('kabupaten_kotamadya') as string)?.trim();
    const provinsi            = (formData.get('provinsi') as string)?.trim();
    const kodepos             = (formData.get('kodepos') as string)?.trim();

    const nomor_seri          = (formData.get('nomor_seri') as string)?.trim();
    const tipe_barang         = (formData.get('tipe_barang') as string)?.trim();
    const tanggal_pembelian   = (formData.get('tanggal_pembelian') as string)?.trim() || null;
    const nama_toko           = (formData.get('nama_toko') as string)?.trim();
    const id_claim_input      = (formData.get('id_claim') as string)?.trim() || null;

    const fileGaransi = formData.get('foto_kartu_garansi') as File | null;
    const fileNota    = formData.get('foto_nota_pembelian') as File | null;

    const required = { phone, nama_lengkap, nik, alamat_rumah, kelurahan, kecamatan, kabupaten_kotamadya, provinsi, kodepos, nomor_seri, tipe_barang, nama_toko };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return NextResponse.json({ error: `Field '${k}' wajib diisi.` }, { status: 400 });
    }
    if (!fileGaransi || !fileNota) {
      return NextResponse.json({ error: 'File Kartu Garansi dan Nota Pembelian wajib diunggah.' }, { status: 400 });
    }

    let { konsumen, matchedPhone } = await findKonsumen(supabase, phone);
    if (!konsumen) {
      const normalizedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
      const { error: insertErr } = await supabase.from('konsumen').insert({
        nomor_wa: normalizedPhone,
        nama_lengkap,
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
        return NextResponse.json({ error: 'Gagal mendaftarkan nomor WA: ' + insertErr.message }, { status: 500 });
      }
      matchedPhone = normalizedPhone;
      konsumen = { nomor_wa: normalizedPhone };
    }

    // Update konsumen
    const { error: updateKonsumenError } = await supabase
      .from('konsumen')
      .update({
        nama_lengkap, nik, alamat_rumah, kelurahan, kecamatan,
        kabupaten_kotamadya, provinsi, kodepos,
        updated_at: new Date().toISOString(),
      })
      .eq('nomor_wa', matchedPhone);

    if (updateKonsumenError) {
      return NextResponse.json({ error: 'Gagal menyimpan data diri: ' + updateKonsumenError.message }, { status: 500 });
    }

    // Upload files
    const accessToken = await getAccessToken();
    const extGaransi = fileGaransi.name.split('.').pop() || 'jpg';
    const extNota    = fileNota.name.split('.').pop() || 'jpg';
    const namaGaransi = `${nomor_seri}_${tipe_barang}_Garansi_KartuGaransi_${Date.now()}.${extGaransi}`;
    const namaNota    = `${nomor_seri}_${tipe_barang}_Garansi_NotaPembelian_${Date.now()}.${extNota}`;
    const [urlGaransi, urlNota] = await Promise.all([
      uploadToDrive(fileGaransi, namaGaransi, accessToken),
      uploadToDrive(fileNota, namaNota, accessToken),
    ]);

    // Cek apakah id_claim valid (kalau diisi, pastikan punya user ini)
    let id_claim: string | null = null;
    if (id_claim_input) {
      const { data: claimCheck } = await supabase
        .from('claim_promo')
        .select('id_claim, validasi_by_mkt, validasi_by_fa')
        .eq('id_claim', id_claim_input)
        .eq('nomor_wa', matchedPhone)
        .maybeSingle();
      if (claimCheck) {
        id_claim = claimCheck.id_claim;
      }
    }

    // Kalau ada id_claim, warisi status validasi dari claim
    let validasi_by_mkt: string | null = null;
    let validasi_by_fa: string | null = null;
    if (id_claim) {
      const { data: claimStatus } = await supabase
        .from('claim_promo')
        .select('validasi_by_mkt, validasi_by_fa')
        .eq('id_claim', id_claim)
        .maybeSingle();
      validasi_by_mkt = claimStatus?.validasi_by_mkt || null;
      validasi_by_fa = claimStatus?.validasi_by_fa || null;
    }

    // Insert ke garansi
    const { error: insertError } = await supabase.from('garansi').insert({
      id_claim,
      nomor_wa: matchedPhone,
      nama_pendaftar: nama_lengkap,
      nomor_seri,
      tipe_barang,
      tanggal_pembelian,
      nama_toko,
      status_validasi: validasi_by_mkt && validasi_by_fa
        ? (validasi_by_mkt === 'Valid' && validasi_by_fa === 'Valid' ? 'Valid' : 'Proses Validasi')
        : 'Proses Validasi',
      validasi_by_mkt,
      validasi_by_fa,
      link_kartu_garansi: urlGaransi,
      link_nota_pembelian: urlNota,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Gagal menyimpan data garansi: ' + insertError.message }, { status: 500 });
    }

    // Update status konsumen
    await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', matchedPhone);

    // Notif WA ke ADMIN
    if (ADMIN_WA_NUMBER) {
      const pesanAdmin = `🔔 *Registrasi Garansi Baru!*\n\n👤 ${nama_lengkap}\n📱 ${matchedPhone}\n📦 ${tipe_barang}\n🔢 ${nomor_seri}\n🏪 ${nama_toko}\n📅 ${tanggal_pembelian || '-'}\n\nVerifikasi: /admin/garansi`;
      kirimWA(ADMIN_WA_NUMBER, pesanAdmin);
    }

    // Notif WA ke konsumen
    const pesanWA = `Pendaftaran Garansi berhasil dan dokumen telah diterima! 🎉\n\nAdmin akan memverifikasi data Anda dalam maksimal 14 hari kerja dan menghubungi Anda via WhatsApp.\n\nTerima kasih!`;
    await kirimWA(matchedPhone, pesanWA);

    return NextResponse.json({ success: true, message: 'Data garansi berhasil dikirim!' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
