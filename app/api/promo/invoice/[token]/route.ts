import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: order } = await supabase
    .from('promo_datacolor_orders')
    .select('*, promo_datacolor_items(*, promo_datacolor(judul, tanggal_mulai, tanggal_berakhir))')
    .eq('invoice_token', token)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ order });
}
