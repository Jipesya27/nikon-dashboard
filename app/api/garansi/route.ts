import { NextResponse } from 'next/server';
// import { createClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const fromClaim = searchParams.get('from_claim') === '1';

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  try {
    // First, get consumer data based on phone number
    const { data: konsumen, error: konsumenError } = await supabase
      .from('konsumen')
      .select('*')
      .eq('nomor_wa', phone)
      .single();

    if (konsumenError && konsumenError.code !== 'PGRST116') { // PGRST116: "The query returned no rows"
      console.error('Error fetching konsumen:', konsumenError);
      throw konsumenError;
    }

    let claimData = null;
    // If it's from a claim, try to get the latest claim data
    if (fromClaim) {
      const { data: claim, error: claimError } = await supabase
        .from('claim_promo')
        .select('id_claim, tipe_barang, nomor_seri, tanggal_pembelian, nama_toko')
        .eq('nomor_wa', phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (claimError && claimError.code !== 'PGRST116') {
        console.error('Error fetching claim data:', claimError);
        // Don't throw, it's optional
      }
      claimData = claim;
    }

    return NextResponse.json({ konsumen: konsumen || null, claim: claimData || null });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to fetch initial data.', details: errorMessage }, { status: 500 });
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

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
  return data.access_token as string;
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

export async function POST(request: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const formData = await request.formData();

    const phone = (formData.get('phone') as string)?.trim();
    const idClaimInput = (formData.get('id_claim') as string | null)?.trim() || null;

    const nama_lengkap = (formData.get('nama_lengkap') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const nik = (formData.get('nik') as string)?.trim();
    const alamat_rumah = (formData.get('alamat_rumah') as string)?.trim();
    const kelurahan = (formData.get('kelurahan') as string)?.trim();
    const kecamatan = (formData.get('kecamatan') as string)?.trim();
    const kabupaten_kotamadya = (formData.get('kabupaten_kotamadya') as string)?.trim();
    const provinsi = (formData.get('provinsi') as string)?.trim();
    const kodepos = (formData.get('kodepos') as string)?.trim();

    const tipe_barang = (formData.get('tipe_barang') as string)?.trim();
    const nomor_seri = (formData.get('nomor_seri') as string)?.trim();
    const tanggal_pembelian = (formData.get('tanggal_pembelian') as string)?.trim() || null;
    const nama_toko = (formData.get('nama_toko') as string)?.trim();

    const foto_kartu_garansi = formData.get('foto_kartu_garansi') as File | null;
    const foto_nota_pembelian = formData.get('foto_nota_pembelian') as File | null;

    const required = { phone, nama_lengkap, email, nik, alamat_rumah, kelurahan, kecamatan, kabupaten_kotamadya, provinsi, kodepos, tipe_barang, nomor_seri, nama_toko };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return NextResponse.json({ error: `Field '${k}' wajib diisi.` }, { status: 400 });
    }
    if (!foto_kartu_garansi || !foto_nota_pembelian) {
      return NextResponse.json({ error: 'Harap unggah kedua file (Kartu Garansi dan Nota Pembelian).' }, { status: 400 });
    }

    // Simpan/perbarui data diri di tabel konsumen (bukan garansi — kolom identitas ada di sana)
    const { error: konsumenError } = await supabase
      .from('konsumen')
      .upsert([{
        nomor_wa: phone,
        nama_lengkap, email, nik, alamat_rumah, kelurahan, kecamatan,
        kabupaten_kotamadya, provinsi, kodepos,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'nomor_wa' });

    if (konsumenError) {
      return NextResponse.json({ error: 'Gagal menyimpan data diri.', details: konsumenError.message }, { status: 500 });
    }

    // Upload dokumen ke Google Drive
    const accessToken = await getAccessToken();
    const extGaransi = foto_kartu_garansi.name.split('.').pop() || 'jpg';
    const extNota = foto_nota_pembelian.name.split('.').pop() || 'jpg';
    const [linkGaransi, linkNota] = await Promise.all([
      uploadToDrive(foto_kartu_garansi, `${nomor_seri}_${tipe_barang}_Garansi_KartuGaransi_${Date.now()}.${extGaransi}`, accessToken),
      uploadToDrive(foto_nota_pembelian, `${nomor_seri}_${tipe_barang}_Garansi_NotaPembelian_${Date.now()}.${extNota}`, accessToken),
    ]);

    // Validasi id_claim milik nomor WA ini (opsional)
    let id_claim: string | null = null;
    if (idClaimInput) {
      const { data: claimCheck } = await supabase
        .from('claim_promo')
        .select('id_claim')
        .eq('id_claim', idClaimInput)
        .eq('nomor_wa', phone)
        .maybeSingle();
      if (claimCheck) id_claim = claimCheck.id_claim;
    }

    const garansiData = {
      nomor_wa: phone,
      nama_pendaftar: nama_lengkap,
      tipe_barang,
      nomor_seri,
      tanggal_pembelian,
      nama_toko,
      link_kartu_garansi: linkGaransi,
      link_nota_pembelian: linkNota,
      status_validasi: 'Menunggu',
      id_claim,
    };

    const { data, error } = await supabase
      .from('garansi')
      .insert([garansiData])
      .select();

    if (error) {
      return NextResponse.json({ error: 'Failed to save warranty registration.', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to save warranty registration.', details: message }, { status: 500 });
  }
}