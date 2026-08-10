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
  const source = searchParams.get('source');
  const severity = searchParams.get('severity');
  const resolved = searchParams.get('resolved'); // 'true' | 'false' | null (semua)
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 50;

  let q = sbAdmin
    .from('system_error_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (source) q = q.eq('source', source);
  if (severity) q = q.eq('severity', severity);
  if (resolved === 'true' || resolved === 'false') q = q.eq('resolved', resolved === 'true');
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, page, pageSize });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string; resolved?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id || typeof body.resolved !== 'boolean') {
    return NextResponse.json({ error: 'id dan resolved wajib diisi' }, { status: 400 });
  }

  const { error } = await sbAdmin
    .from('system_error_log')
    .update({ resolved: body.resolved })
    .eq('id', body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
