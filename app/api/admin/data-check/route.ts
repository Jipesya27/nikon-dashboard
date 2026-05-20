/**
 * Direct server-side Supabase connectivity test.
 * Bypasses the proxy entirely — queries Supabase directly using env vars.
 * GET /api/admin/data-check
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const result: Record<string, unknown> = {
    sbUrl: SB_URL ? (SB_URL.slice(0, 40) + '...') : 'MISSING',
    serviceKeySet: !!SB_KEY,
    anonKeySet: !!ANON_KEY,
    tables: {},
    error: null,
  };

  if (!SB_URL || !SB_KEY) {
    result.error = 'SUPABASE env vars tidak lengkap di server Vercel';
    return NextResponse.json(result, { status: 503 });
  }

  try {
    const supabase = createClient(SB_URL, SB_KEY);

    const tables = ['karyawan', 'konsumen', 'claim_promo', 'garansi', 'promosi', 'peminjaman_barang'];
    const counts: Record<string, number | string> = {};

    await Promise.all(tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      counts[table] = error ? `ERR: ${error.message}` : (count ?? 0);
    }));

    result.tables = counts;
    result.ok = true;
  } catch (err) {
    result.error = String(err);
  }

  return NextResponse.json(result);
}
