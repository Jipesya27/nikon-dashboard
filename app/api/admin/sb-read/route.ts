/**
 * Generic admin READ endpoint — mirrors sb-write but for SELECT queries.
 * Bypasses supabase-js proxy client (which has cookie/credential issues).
 * Uses service_role key directly, verifies admin session via cookie.
 *
 * POST /api/admin/sb-read
 * Body: { table, select?, filters?, order?, limit?, count? }
 *
 * filters: Array of { col, op, val } where op is PostgREST operator
 *   e.g. { col: 'created_at', op: 'gte', val: '2024-01-01T00:00:00' }
 * order: { col, ascending? }
 * count: boolean — include exact row count
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ReadFilter {
  col: string;
  op: 'eq' | 'neq' | 'gte' | 'lte' | 'gt' | 'lt' | 'like' | 'ilike' | 'in';
  val: unknown;
}

interface ReadPayload {
  table: string;
  select?: string;
  filters?: ReadFilter[];
  order?: { col: string; ascending?: boolean };
  limit?: number;
  offset?: number; // pagination: row index to start from (0-based)
  count?: boolean; // return exact count alongside data
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: ReadPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { table, select = '*', filters = [], order, limit, offset, count } = payload;

  if (!table) {
    return NextResponse.json({ error: 'table wajib diisi' }, { status: 400 });
  }

  try {
    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = sbAdmin.from(table).select(select, count ? { count: 'exact' } : undefined);

    for (const f of filters) {
      switch (f.op) {
        case 'eq':  q = q.eq(f.col, f.val); break;
        case 'neq': q = q.neq(f.col, f.val); break;
        case 'gte': q = q.gte(f.col, f.val); break;
        case 'lte': q = q.lte(f.col, f.val); break;
        case 'gt':  q = q.gt(f.col, f.val); break;
        case 'lt':  q = q.lt(f.col, f.val); break;
        case 'like':  q = q.like(f.col, f.val as string); break;
        case 'ilike': q = q.ilike(f.col, f.val as string); break;
        case 'in':  q = q.in(f.col, f.val as unknown[]); break;
      }
    }

    if (order) q = q.order(order.col, { ascending: order.ascending ?? false });
    // range(from, to) inklusif kedua ujung; jika ada offset pakai range, jika tidak pakai limit biasa
    if (typeof offset === 'number' && limit) {
      q = q.range(offset, offset + limit - 1);
    } else if (limit) {
      q = q.limit(limit);
    }

    const { data, error, count: rowCount } = await q;

    if (error) {
      console.error(`[sb-read] ${table} error:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data, count: rowCount ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sb-read] ${table} exception:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
