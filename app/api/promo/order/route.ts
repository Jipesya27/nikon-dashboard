import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

/** Angka 1–500 tanpa digit berulang */
function candidateCodes(): number[] {
  const out: number[] = [];
  for (let n = 1; n <= 500; n++) {
    const s = n.toString();
    if (new Set(s).size === s.length) out.push(n);
  }
  return out;
}

async function pickUniqueCode(): Promise<number> {
  const { data } = await supabase
    .from('promo_datacolor_orders')
    .select('kode_unik')
    .in('status', ['menunggu_pembayaran', 'menunggu_verifikasi', 'diproses']);
  const used = new Set((data || []).map((r: { kode_unik: number }) => r.kode_unik));
  const pool = candidateCodes().filter(n => !used.has(n));
  if (pool.length === 0) throw new Error('Tidak ada kode unik tersisa, coba beberapa menit lagi');
  return pool[Math.floor(Math.random() * pool.length)];
}

// POST — buat order baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { promo_item_id, nama_pembeli, nomor_wa, alamat, kodepos, nota_kamera_url, garansi_kamera_url } = body;

    if (!promo_item_id || !nama_pembeli || !nomor_wa || !alamat) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Ambil item untuk snapshot harga & cek stok
    const { data: item } = await supabase
      .from('promo_datacolor_items')
      .select('*')
      .eq('id', promo_item_id)
      .maybeSingle();

    if (!item) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    if (item.stock !== null && item.stock <= 0) return NextResponse.json({ error: 'Stok habis' }, { status: 409 });

    const kode_unik = await pickUniqueCode();
    const harga_transfer = item.harga_promo + kode_unik;

    const { data: order, error } = await supabase
      .from('promo_datacolor_orders')
      .insert({
        promo_item_id,
        nama_barang_snapshot: item.nama_barang,
        harga_promo_snapshot: item.harga_promo,
        nama_pembeli,
        nomor_wa: nomor_wa.replace(/\D/g, '').replace(/^0/, '62'),
        alamat,
        kodepos: kodepos || null,
        nota_kamera_url: nota_kamera_url || null,
        garansi_kamera_url: garansi_kamera_url || null,
        harga_transfer,
        kode_unik,
        status: 'menunggu_pembayaran',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PATCH — upload bukti transfer
export async function PATCH(req: NextRequest) {
  try {
    const { order_id, bukti_transfer_url } = await req.json();
    if (!order_id || !bukti_transfer_url) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });

    const { data: order, error } = await supabase
      .from('promo_datacolor_orders')
      .update({ bukti_transfer_url, status: 'menunggu_verifikasi' })
      .eq('id', order_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
