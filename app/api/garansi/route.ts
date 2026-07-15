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

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const formData = await request.formData();

  const phone = formData.get('phone') as string;
  const idClaim = formData.get('id_claim') as string | null;
  
  // Extract files first
  const foto_kartu_garansi = formData.get('foto_kartu_garansi') as File;
  const foto_nota_pembelian = formData.get('foto_nota_pembelian') as File;

  // Simple validation
  if (!phone || !foto_kartu_garansi || !foto_nota_pembelian) {
    return NextResponse.json({ error: 'Missing required fields or files.' }, { status: 400 });
  }

  // TODO: Upload files to Supabase Storage and get URLs
  // This is a placeholder. You need to implement the actual upload logic.
  // Example:
  // const { data: garansiUpload, error: garansiError } = await supabase.storage
  //   .from('garansi-docs')
  //   .upload(`public/${phone}_${Date.now()}_garansi.jpg`, foto_kartu_garansi);
  // if (garansiError) throw garansiError;
  // const garansiUrl = supabase.storage.from('garansi-docs').getPublicUrl(garansiUpload.path).data.publicUrl;

  const garansiUrl = 'placeholder_garansi_url';
  const notaUrl = 'placeholder_nota_url';

  const garansiData = {
    nomor_wa: phone,
    // email is not in the 'garansi' table schema
    nama_pendaftar: formData.get('nama_lengkap') as string,
    nik: formData.get('nik') as string,
    alamat_rumah: formData.get('alamat_rumah') as string,
    kelurahan: formData.get('kelurahan') as string,
    kecamatan: formData.get('kecamatan') as string,
    kabupaten_kotamadya: formData.get('kabupaten_kotamadya') as string,
    provinsi: formData.get('provinsi') as string,
    kodepos: formData.get('kodepos') as string,
    tipe_barang: formData.get('tipe_barang') as string,
    nomor_seri: formData.get('nomor_seri') as string,
    tanggal_pembelian: formData.get('tanggal_pembelian') as string,
    nama_toko: formData.get('nama_toko') as string,
    link_kartu_garansi: garansiUrl,
    link_nota_pembelian: notaUrl,
    id_claim: idClaim,
  };

  const { data, error } = await supabase
    .from('garansi')
    .insert([garansiData])
    .select();

  if (error) {
    return NextResponse.json({ error: 'Failed to save warranty registration.', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}