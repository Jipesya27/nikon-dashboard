import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    id_peminjaman: string;
    foto_kondisi_kurir?: string[];
    foto_bukti_pengiriman?: string[];
    status_pengiriman?: 'dikirim' | 'terkirim';
    id_kurir?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
  }

  const { id_peminjaman, ...updateFields } = body;
  if (!id_peminjaman) {
    return NextResponse.json({ error: 'id_peminjaman wajib diisi' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  if (updateFields.foto_kondisi_kurir !== undefined) payload.foto_kondisi_kurir = updateFields.foto_kondisi_kurir;
  if (updateFields.foto_bukti_pengiriman !== undefined) payload.foto_bukti_pengiriman = updateFields.foto_bukti_pengiriman;
  if (updateFields.id_kurir !== undefined) payload.id_kurir = updateFields.id_kurir;

  if (updateFields.status_pengiriman === 'dikirim') {
    payload.status_pengiriman = 'dikirim';
    payload.tanggal_dikirim = new Date().toISOString();
  } else if (updateFields.status_pengiriman === 'terkirim') {
    payload.status_pengiriman = 'terkirim';
    payload.tanggal_dikirim = payload.tanggal_dikirim ?? undefined;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase
    .from('peminjaman_barang')
    .update(payload)
    .eq('id_peminjaman', id_peminjaman);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
