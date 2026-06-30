import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toUpperCase() || '';
  if (!q || q.length < 4) {
    return NextResponse.json({ error: 'Masukkan minimal 4 karakter' }, { status: 400 });
  }

  // Cari by nomor WA (digits only) ATAU by short order ID (8 karakter pertama UUID)
  const isWa = /^\d+$/.test(q.replace(/[+ ]/g, ''));
  let data, error;

  if (isWa) {
    const waClean = q.replace(/\D/g, '').replace(/^0/, '62');
    ({ data, error } = await supabase
      .from('promo_datacolor_orders')
      .select('id, nama_pembeli, nama_barang_snapshot, harga_transfer, status, invoice_token, created_at, nomor_wa')
      .eq('nomor_wa', waClean)
      .order('created_at', { ascending: false })
      .limit(5));
  } else {
    // Cari by 8-char order ID prefix
    ({ data, error } = await supabase
      .from('promo_datacolor_orders')
      .select('id, nama_pembeli, nama_barang_snapshot, harga_transfer, status, invoice_token, created_at, nomor_wa')
      .ilike('id', q + '%')
      .limit(5));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data || [] });
}
