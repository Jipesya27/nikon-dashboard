/**
 * Generic admin write endpoint — handles INSERT/UPDATE/DELETE/UPSERT
 * for any table, using service_role key. Bypass generic /api/admin/sb proxy
 * which has issues forwarding body for non-GET methods.
 *
 * Body schema:
 * {
 *   action: 'insert' | 'update' | 'delete' | 'upsert',
 *   table: string,
 *   data?: object | object[],   // required for insert/update/upsert
 *   match?: Record<string, unknown>,  // equality filters for update/delete
 *   filters?: { col, op, val }[],     // operator filters (lt/gte/in/...) for update/delete
 *   onConflict?: string,         // optional for upsert
 * }
 *
 * update/delete wajib punya minimal satu kondisi (match atau filters) —
 * tanpa itu PostgREST akan mengenai SELURUH tabel.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { getAuditUser, writeAuditLog } from '@/app/lib/audit';
import { logSystemError } from '@/app/lib/errorLog';

export const dynamic = 'force-dynamic';

const AUDIT_TABLES = new Set([
  'promosi', 'claim_promo', 'garansi', 'status_service',
  'peminjaman_barang', 'barang_aset',
  'affiliates', 'affiliate_skema', 'affiliate_penjualan',
  'budget_approval', 'events', 'event_registrations',
]);

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type WriteAction = 'insert' | 'update' | 'delete' | 'upsert';
interface WriteFilter {
  col: string;
  op: 'eq' | 'neq' | 'gte' | 'lte' | 'gt' | 'lt' | 'like' | 'ilike' | 'in' | 'is';
  val: unknown;
}
interface WritePayload {
  action: WriteAction;
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
  filters?: WriteFilter[];
  onConflict?: string;
  /** kolom-kolom yg ingin dikembalikan setelah operasi, contoh: "id, nama" */
  select?: string;
}

/** Terapkan match (equality) + filters (operator) ke query update/delete. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyConditions<Q extends { eq: (c: string, v: any) => Q }>(
  q: Q,
  match: Record<string, unknown> | undefined,
  filters: WriteFilter[],
): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let out: any = q;
  for (const [col, val] of Object.entries(match ?? {})) out = out.eq(col, val);
  for (const f of filters) {
    switch (f.op) {
      case 'eq':    out = out.eq(f.col, f.val); break;
      case 'neq':   out = out.neq(f.col, f.val); break;
      case 'gte':   out = out.gte(f.col, f.val); break;
      case 'lte':   out = out.lte(f.col, f.val); break;
      case 'gt':    out = out.gt(f.col, f.val); break;
      case 'lt':    out = out.lt(f.col, f.val); break;
      case 'like':  out = out.like(f.col, f.val as string); break;
      case 'ilike': out = out.ilike(f.col, f.val as string); break;
      case 'in':    out = out.in(f.col, f.val as unknown[]); break;
      case 'is':    out = out.is(f.col, f.val as null | boolean); break;
      default:
        throw new Error(`Operator filter tidak dikenal: ${(f as WriteFilter).op}`);
    }
  }
  return out as Q;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auditUser = getAuditUser(cookieStore);

  let payload: WritePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, table, data, match, filters = [], onConflict, select } = payload;

  if (!action || !table) {
    return NextResponse.json({ error: 'action dan table wajib diisi' }, { status: 400 });
  }

  // Guard mass-update/delete: update/delete tanpa kondisi apa pun mengenai seluruh tabel.
  const hasCondition = Object.keys(match ?? {}).length > 0 || filters.length > 0;

  try {
    let baseQ;
    switch (action) {
      case 'insert': {
        if (!data) return NextResponse.json({ error: 'data wajib untuk insert' }, { status: 400 });
        baseQ = sbAdmin.from(table).insert(Array.isArray(data) ? data : [data]);
        break;
      }
      case 'update': {
        if (!data) return NextResponse.json({ error: 'data wajib untuk update' }, { status: 400 });
        if (!hasCondition) return NextResponse.json({ error: 'match atau filters wajib untuk update' }, { status: 400 });
        baseQ = applyConditions(sbAdmin.from(table).update(data as Record<string, unknown>), match, filters);
        break;
      }
      case 'delete': {
        if (!hasCondition) return NextResponse.json({ error: 'match atau filters wajib untuk delete' }, { status: 400 });
        baseQ = applyConditions(sbAdmin.from(table).delete(), match, filters);
        break;
      }
      case 'upsert': {
        if (!data) return NextResponse.json({ error: 'data wajib untuk upsert' }, { status: 400 });
        baseQ = sbAdmin.from(table).upsert(Array.isArray(data) ? data : [data], onConflict ? { onConflict } : undefined);
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const recordId = hasCondition
      ? JSON.stringify({ ...(match ?? {}), ...(filters.length ? { filters } : {}) })
      : action === 'insert' ? '(new)' : '(unknown)';
    const newValues = data ? (Array.isArray(data) ? data[0] : data) : {};

    // Jika diminta return data
    if (select) {
      const { data: returnedData, error } = await baseQ.select(select);
      if (error) {
        console.error(`[sb-write] ${action} ${table} error:`, JSON.stringify(error));
        void logSystemError({
          source: `api:sb-write:${table}`,
          message: error.message || error.details || error.hint || JSON.stringify(error),
          detail: { action, table, match, user: auditUser },
        });
        return NextResponse.json(
          { error: error.message || error.details || error.hint || JSON.stringify(error) },
          { status: 400 }
        );
      }
      if (AUDIT_TABLES.has(table)) {
        const firstRow = (Array.isArray(returnedData) ? returnedData?.[0] : returnedData) as unknown as Record<string, unknown> | null | undefined;
        const firstKey = firstRow ? Object.keys(firstRow)[0] : undefined;
        const auditId = firstKey ? String(firstRow![firstKey]) : recordId;
        void writeAuditLog({ user_name: auditUser, action, table_name: table, record_id: auditId, new_values: newValues as Record<string, unknown> });
      }
      return NextResponse.json({ success: true, data: returnedData });
    }

    const { error } = await baseQ;
    if (error) {
      console.error(`[sb-write] ${action} ${table} error:`, JSON.stringify(error));
      void logSystemError({
        source: `api:sb-write:${table}`,
        message: error.message || error.details || error.hint || JSON.stringify(error),
        detail: { action, table, match, user: auditUser },
      });
      return NextResponse.json(
        { error: error.message || error.details || error.hint || JSON.stringify(error) },
        { status: 400 }
      );
    }

    if (AUDIT_TABLES.has(table)) {
      void writeAuditLog({ user_name: auditUser, action, table_name: table, record_id: recordId, new_values: newValues as Record<string, unknown> });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sb-write] ${action} ${table} exception:`, msg);
    void logSystemError({
      source: `api:sb-write:${table}`,
      severity: 'error',
      message: msg,
      detail: { action, table, match, user: auditUser, exception: true },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
