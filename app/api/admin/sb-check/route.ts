/**
 * Diagnostic endpoint — cek apakah proxy Supabase bisa fetch data nyata.
 * GET /api/admin/sb-check
 * Returns: { ok, envOk, sessionOk, rowCount, error }
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result: Record<string, unknown> = {
    envOk: false,
    sessionOk: false,
    rowCount: null,
    error: null,
  };

  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  result.envOk = !!(SB_URL && SB_KEY);
  result.sbUrl = SB_URL ? SB_URL.slice(0, 30) + '...' : 'MISSING';

  if (!result.envOk) {
    result.error = 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment';
    return NextResponse.json(result, { status: 503 });
  }

  const cookieStore = await cookies();
  result.sessionOk = await verifyAdminSession(cookieStore);

  if (!result.sessionOk) {
    result.error = 'admin_session cookie invalid or expired';
    return NextResponse.json(result, { status: 401 });
  }

  try {
    const supabase = createClient(SB_URL!, SB_KEY!);
    const { count, error } = await supabase
      .from('karyawan')
      .select('*', { count: 'exact', head: true });

    if (error) {
      result.error = error.message;
      result.errorCode = error.code;
    } else {
      result.rowCount = count;
    }
  } catch (err) {
    result.error = String(err);
  }

  result.ok = !result.error;
  return NextResponse.json(result);
}
