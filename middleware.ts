import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildSessionToken } from '@/app/lib/session';

/** Constant-time string comparison (prevents timing attacks in Edge Runtime) */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const aB = enc.encode(a);
  const bB = enc.encode(b);
  let result = 0;
  for (let i = 0; i < aB.length; i++) result |= aB[i] ^ bB[i];
  return result === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always-public routes
  if (pathname === '/api/admin/auth') return NextResponse.next();
  if (pathname === '/api/auth/karyawan-login') return NextResponse.next();

  const session = request.cookies.get('admin_session')?.value;
  // ADMIN_PASSWORD optional — fall back to SESSION_SECRET (set by karyawan login)
  const secret = process.env.ADMIN_PASSWORD || process.env.SESSION_SECRET || '';

  let ok = false;
  if (secret && session) {
    const expected = await buildSessionToken(secret);
    ok = safeEqual(session, expected);
  }

  // /api/admin/* — return 401 (API, no redirect)
  if (pathname.startsWith('/api/admin')) {
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // /admin/* dan /chatbot — redirect ke /dashboard (pintu masuk internal)
  else if (pathname.startsWith('/admin') || pathname.startsWith('/chatbot')) {
    if (!ok) return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/chatbot', '/chatbot/:path*'],
};
