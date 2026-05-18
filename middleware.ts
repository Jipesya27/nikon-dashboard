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

  // Routes that are always public
  // Always-public routes
  if (pathname === '/admin/login') return NextResponse.next();
  if (pathname === '/admin/google-auth') return NextResponse.next();
  if (pathname === '/api/admin/auth') return NextResponse.next();
  if (pathname === '/api/auth/karyawan-login') return NextResponse.next(); // karyawan auth — creates admin_session

  const session = request.cookies.get('admin_session')?.value;
  // ADMIN_PASSWORD optional — fall back to SESSION_SECRET so karyawan login works
  const secret = process.env.ADMIN_PASSWORD || process.env.SESSION_SECRET || '';

  let ok = false;
  if (secret && session) {
    const expected = await buildSessionToken(secret);
    ok = safeEqual(session, expected); // constant-time compare
  }

  // Protect /api/admin/* — return 401 JSON
  if (pathname.startsWith('/api/admin')) {
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Protect /admin/* — redirect to login
  else if (pathname.startsWith('/admin')) {
    if (!ok) return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  // /dashboard — NO middleware redirect; the page has its own karyawan login form.
  // Data is still protected: all queries go through /api/admin/sb proxy which checks admin_session.
  // Protect /chatbot — admin-only bot management page
  else if (pathname.startsWith('/chatbot')) {
    if (!ok) return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/chatbot', '/chatbot/:path*'],
};
