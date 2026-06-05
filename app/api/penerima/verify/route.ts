import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let kode: string, wa_last4: string;
  try {
    ({ kode, wa_last4 } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
  }

  if (!kode || kode.trim().length !== 5) {
    return NextResponse.json({ error: 'Kode peminjaman harus 5 karakter' }, { status: 400 });
  }
  if (!wa_last4 || !/^\d{4}$/.test(wa_last4.trim())) {
    return NextResponse.json({ error: '4 digit terakhir nomor WhatsApp tidak valid' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: lending, error } = await supabase
    .from('peminjaman_barang')
    .select('*')
    .eq('kode_peminjaman', kode.trim().toUpperCase())
    .single();

  if (error || !lending) {
    return NextResponse.json({ error: 'Kode peminjaman tidak ditemukan' }, { status: 404 });
  }

  // Verify last 4 digits of WhatsApp number
  const waNumber: string = lending.nomor_wa_peminjam || '';
  const actualLast4 = waNumber.slice(-4);
  if (actualLast4 !== wa_last4.trim()) {
    return NextResponse.json({ error: '4 digit terakhir nomor WhatsApp tidak cocok' }, { status: 403 });
  }

  // Return sanitized data (remove sensitive fields)
  const safeData = {
    id_peminjaman: lending.id_peminjaman,
    kode_peminjaman: lending.kode_peminjaman,
    nama_peminjam: lending.nama_peminjam,
    items_dipinjam: lending.items_dipinjam,
    tanggal_peminjaman: lending.tanggal_peminjaman,
    tanggal_estimasi_pengembalian: lending.tanggal_estimasi_pengembalian,
    status_peminjaman: lending.status_peminjaman,
    status_pengiriman: lending.status_pengiriman,
    foto_kondisi_kurir: lending.foto_kondisi_kurir,
    foto_bukti_pengiriman: lending.foto_bukti_pengiriman,
    foto_kondisi_penerima: lending.foto_kondisi_penerima,
    catatan_penerima: lending.catatan_penerima,
    tanggal_dikirim: lending.tanggal_dikirim,
    tanggal_diterima: lending.tanggal_diterima,
  };

  return NextResponse.json({ lending: safeData });
}
