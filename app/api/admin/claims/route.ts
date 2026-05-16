import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const status   = searchParams.get('status') || 'all';
    const search   = searchParams.get('search') || '';
    const page     = parseInt(searchParams.get('page') || '1');
    const limit    = 20;
    const offset   = (page - 1) * limit;

    let query = supabase
      .from('claim_promo')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('validasi_by_mkt', status);
    }
    if (search) {
      query = query.or(
        `nama_pendaftar.ilike.%${search}%,nomor_wa.ilike.%${search}%,nomor_seri.ilike.%${search}%,tipe_barang.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ claims: data || [], total: count || 0, page, limit });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
