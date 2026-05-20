import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminSession } from '@/app/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always-public routes — no session check
  if (pathname === '/api/admin/auth') return NextResponse.next();
  if (pathname === '/api/auth/karyawan-login') return NextResponse.next();
  if (pathname === '/api/auth/forgot-password') return NextResponse.next();

  // Verify session using HMAC + timestamp (same logic as route handlers)
  const ok = await verifyAdminSession(request.cookies);

  // /api/admin/* — return 401 JSON (API callers expect JSON, not redirect)
  if (pathname.startsWith('/api/admin')) {
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // /admin/* dan /chatbot — redirect ke /dashboard
  else if (pathname.startsWith('/admin') || pathname.startsWith('/chatbot')) {
    if (!ok) return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/chatbot', '/chatbot/:path*'],
};
