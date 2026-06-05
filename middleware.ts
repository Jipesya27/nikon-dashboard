import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware berjalan di Edge Runtime (bukan Node.js) — tidak bisa akses
 * env vars server-side (ADMIN_PASSWORD / SESSION_SECRET) untuk HMAC verification.
 *
 * Strategi keamanan berlapis:
 *  - Middleware: cek KEBERADAAN cookie (blok anonymous request di edge)
 *  - Route handlers (Node.js): HMAC + timestamp verification penuh (keamanan kriptografis)
 *
 * Dengan pendekatan ini, request tanpa cookie apapun diblok di edge (cepat).
 * Request dengan cookie yang salah/kadaluarsa akan ditolak di handler (verifyAdminSession).
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rute publik — selalu diizinkan tanpa cek
  if (pathname === '/api/admin/auth') return NextResponse.next();
  if (pathname === '/api/auth/karyawan-login') return NextResponse.next();
  if (pathname === '/api/auth/forgot-password') return NextResponse.next();

  // Cek keberadaan session cookie (verifikasi HMAC sesungguhnya ada di setiap route handler)
  const session = request.cookies.get('admin_session')?.value;
  const hasSession = typeof session === 'string' && session.length > 20;

  // /api/admin/* — return 401 JSON jika tidak ada cookie
  if (pathname.startsWith('/api/admin')) {
    if (!hasSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // /api/kurir/* — return 401 JSON jika tidak ada cookie
  else if (pathname.startsWith('/api/kurir')) {
    if (!hasSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // /admin/* dan /chatbot — redirect ke /dashboard jika tidak ada cookie
  else if (pathname.startsWith('/admin') || pathname.startsWith('/chatbot')) {
    if (!hasSession) return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/kurir/:path*', '/chatbot', '/chatbot/:path*'],
};
