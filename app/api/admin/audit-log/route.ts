import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  const user = searchParams.get('user');
  const action = searchParams.get('action');
  const search = searchParams.get('search');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const isExport = searchParams.get('export') === '1';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = isExport ? 5000 : 50;

  let q = sbAdmin
    .from('data_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (table) q = q.eq('table_name', table);
  if (action) q = q.eq('action', action);
  if (user) q = q.ilike('user_name', `%${user}%`);
  if (search) {
    // Buang karakter yang bisa merusak sintaks filter PostgREST (koma, kurung, titik).
    const safe = search.replace(/[(),.*]/g, ' ').trim();
    if (safe) q = q.or(`record_id.ilike.%${safe}%,note.ilike.%${safe}%`);
  }
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Daftar nilai distinct untuk dropdown filter (ringan — tabel kecil, di-cap 1000)
  const { data: meta } = await sbAdmin
    .from('data_log')
    .select('table_name, action, user_name')
    .order('created_at', { ascending: false })
    .limit(1000);
  const uniq = (arr: (string | null)[]) => [...new Set(arr.filter(Boolean) as string[])].sort();

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    filters: {
      tables: uniq((meta || []).map(m => m.table_name)),
      actions: uniq((meta || []).map(m => m.action)),
      users: uniq((meta || []).map(m => m.user_name)),
    },
  });
}
