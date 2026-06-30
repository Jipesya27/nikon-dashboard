import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

// Hanya karakter aman yang diizinkan untuk order ID (hex + huruf kapital)
const ORDER_ID_RE = /^[0-9A-F]{4,8}$/;
// Hanya digit untuk nomor WA
const WA_RE = /^[0-9+\s]{4,20}$/;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q')?.trim() || '';

  if (!raw || raw.length < 4 || raw.length > 20) {
    return NextResponse.json({ error: 'Masukkan 4–20 karakter' }, { status: 400 });
  }

  const q = raw.toUpperCase();

  // Tentukan tipe pencarian berdasarkan karakter
  const isWa = WA_RE.test(raw);
  const isOrderId = ORDER_ID_RE.test(q);

  if (!isWa && !isOrderId) {
    return NextResponse.json({ error: 'Format tidak valid. Masukkan No. Order (contoh: 85474506) atau Nomor WA (contoh: 08123...)' }, { status: 400 });
  }

  const SELECT = 'id, nama_pembeli, nama_barang_snapshot, harga_transfer, status, invoice_token, created_at';

  let data, error;

  if (isOrderId) {
    // UUID disimpan sebagai tipe uuid di Postgres — gunakan range query
    // first 8 hex chars = segmen pertama UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const prefix = q.toLowerCase();
    const lower = `${prefix}-0000-0000-0000-000000000000`;
    const upper = `${prefix}-ffff-ffff-ffff-ffffffffffff`;
    ({ data, error } = await supabase
      .from('promo_datacolor_orders')
      .select(SELECT)
      .gte('id', lower)
      .lte('id', upper)
      .limit(5));
  } else {
    // Nomor WA — normalisasi 0xxx → 62xxx
    const waClean = raw.replace(/\D/g, '').replace(/^0/, '62');
    ({ data, error } = await supabase
      .from('promo_datacolor_orders')
      .select(SELECT)
      .eq('nomor_wa', waClean)
      .order('created_at', { ascending: false })
      .limit(5));
  }

  if (error) {
    console.error('[cek-order]', error.message);
    return NextResponse.json({ error: 'Gagal mencari pesanan. Silakan coba beberapa saat lagi.' }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}
