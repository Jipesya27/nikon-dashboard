/**
 * Karyawan login — public endpoint (no admin_session required).
 * Verifies username+password against the karyawan table using service_role,
 * then sets admin_session so the Supabase proxy (/api/admin/sb) works for
 * all subsequent requests from the dashboard.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildSessionToken } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

// Simple rate limit: max 10 attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();
function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: 429 },
    );
  }

  let username: string, password: string;
  try {
    ({ username, password } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
  }

  // Use service_role — this is the auth endpoint, so no session is available yet
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: karyawan } = await supabase
    .from('karyawan')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (!karyawan) {
    return NextResponse.json({ error: 'Username atau Password salah!' }, { status: 401 });
  }

  if (karyawan.status_aktif === false) {
    return NextResponse.json(
      { error: 'Akun dinonaktifkan. Silakan hubungi Admin.' },
      { status: 403 },
    );
  }

  // Create admin_session so the Supabase proxy works for all dashboard requests.
  // Use ADMIN_PASSWORD if set, fall back to SESSION_SECRET — middleware uses same derivation.
  const secret = process.env.ADMIN_PASSWORD || process.env.SESSION_SECRET!;
  const token = await buildSessionToken(secret);

  const res = NextResponse.json({ success: true, karyawan });
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}
