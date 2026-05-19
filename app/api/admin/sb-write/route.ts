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
 *   match?: Record<string, unknown>,  // required for update/delete
 *   onConflict?: string,         // optional for upsert
 * }
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

type WriteAction = 'insert' | 'update' | 'delete' | 'upsert';
interface WritePayload {
  action: WriteAction;
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
  onConflict?: string;
  /** kolom-kolom yg ingin dikembalikan setelah operasi, contoh: "id, nama" */
  select?: string;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: WritePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, table, data, match, onConflict, select } = payload;

  if (!action || !table) {
    return NextResponse.json({ error: 'action dan table wajib diisi' }, { status: 400 });
  }

  try {
    let baseQ;
    switch (action) {
      case 'insert': {
        if (!data) return NextResponse.json({ error: 'data wajib untuk insert' }, { status: 400 });
        baseQ = sbAdmin.from(table).insert(Array.isArray(data) ? data : [data]);
        break;
      }
      case 'update': {
        if (!data || !match) return NextResponse.json({ error: 'data dan match wajib untuk update' }, { status: 400 });
        let updateQ = sbAdmin.from(table).update(data as Record<string, unknown>);
        for (const [col, val] of Object.entries(match)) {
          updateQ = updateQ.eq(col, val as never);
        }
        baseQ = updateQ;
        break;
      }
      case 'delete': {
        if (!match) return NextResponse.json({ error: 'match wajib untuk delete' }, { status: 400 });
        let deleteQ = sbAdmin.from(table).delete();
        for (const [col, val] of Object.entries(match)) {
          deleteQ = deleteQ.eq(col, val as never);
        }
        baseQ = deleteQ;
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

    // Jika diminta return data
    if (select) {
      const { data: returnedData, error } = await baseQ.select(select);
      if (error) {
        console.error(`[sb-write] ${action} ${table} error:`, JSON.stringify(error));
        return NextResponse.json(
          { error: error.message || error.details || error.hint || JSON.stringify(error) },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, data: returnedData });
    }

    const { error } = await baseQ;
    if (error) {
      console.error(`[sb-write] ${action} ${table} error:`, JSON.stringify(error));
      return NextResponse.json(
        { error: error.message || error.details || error.hint || JSON.stringify(error) },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sb-write] ${action} ${table} exception:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
