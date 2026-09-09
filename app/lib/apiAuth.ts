/**
 * Helper auth untuk Route Handlers (server-only, pakai next/headers cookies()).
 *
 * Middleware hanya cek KEBERADAAN cookie `admin_session` (cepat, di edge) — itu
 * BUKAN verifikasi. Setiap route sensitif WAJIB memanggil `requireAdmin()` untuk
 * verifikasi HMAC + umur token yang sesungguhnya.
 *
 * Pemakaian:
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

/** Return `NextResponse` 401 kalau sesi admin tidak valid, atau `null` kalau lolos. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
