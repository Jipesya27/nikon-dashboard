import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAccessToken, getOrCreateFolder, ROOT_FOLDER_ID } from '@/app/lib/googleDrive';

export const dynamic = 'force-dynamic';

async function uploadFileToDrive(file: File, prefix: string, kode: string): Promise<string> {
  const accessToken = await getAccessToken();
  const subfolder = await getOrCreateFolder('Penerima_Barang', ROOT_FOLDER_ID, accessToken);
  const kodeFolder = await getOrCreateFolder(kode, subfolder, accessToken);

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${prefix}_${kode}_${Date.now()}.${ext}`;
  const metadata = { name: fileName, parents: [kodeFolder] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = await res.json() as { id?: string };
  if (!data.id) throw new Error('Upload Google Drive gagal');
  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

export async function POST(req: Request) {
  const formData = await req.formData();

  const kode = (formData.get('kode') as string || '').trim().toUpperCase();
  const wa_last4 = (formData.get('wa_last4') as string || '').trim();
  const catatan = (formData.get('catatan') as string || '').trim();
  const fotoFiles = formData.getAll('foto_kondisi_penerima') as File[];

  if (!kode || kode.length !== 5) {
    return NextResponse.json({ error: 'Kode tidak valid' }, { status: 400 });
  }
  if (!/^\d{4}$/.test(wa_last4)) {
    return NextResponse.json({ error: '4 digit WA tidak valid' }, { status: 400 });
  }
  if (fotoFiles.length > 3) {
    return NextResponse.json({ error: 'Maksimal 3 foto' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: lending, error } = await supabase
    .from('peminjaman_barang')
    .select('id_peminjaman, nomor_wa_peminjam, status_pengiriman, foto_kondisi_penerima')
    .eq('kode_peminjaman', kode)
    .single();

  if (error || !lending) {
    return NextResponse.json({ error: 'Kode tidak ditemukan' }, { status: 404 });
  }

  const waNumber: string = lending.nomor_wa_peminjam || '';
  if (waNumber.slice(-4) !== wa_last4) {
    return NextResponse.json({ error: '4 digit WA tidak cocok' }, { status: 403 });
  }

  // Upload foto jika ada
  const uploadedUrls: string[] = [];
  for (const file of fotoFiles) {
    if (!(file instanceof File) || file.size === 0) continue;
    try {
      const url = await uploadFileToDrive(file, 'kondisi_penerima', kode);
      uploadedUrls.push(url);
    } catch (e) {
      console.error('[penerima/submit] Upload gagal:', e);
    }
  }

  const existingFotos: string[] = Array.isArray(lending.foto_kondisi_penerima)
    ? lending.foto_kondisi_penerima
    : [];
  const allFotos = [...existingFotos, ...uploadedUrls];

  const updateData: Record<string, unknown> = {
    catatan_penerima: catatan || null,
    tanggal_diterima: new Date().toISOString(),
  };
  if (allFotos.length > 0) updateData.foto_kondisi_penerima = allFotos;
  if (lending.status_pengiriman === 'terkirim') {
    // sudah terkirim, hanya update catatan/foto
  } else {
    updateData.status_pengiriman = 'terkirim';
  }

  const { error: updErr } = await supabase
    .from('peminjaman_barang')
    .update(updateData)
    .eq('id_peminjaman', lending.id_peminjaman);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, foto_count: uploadedUrls.length });
}
