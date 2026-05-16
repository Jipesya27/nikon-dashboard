import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') return NextResponse.next();

  const session = request.cookies.get('admin_session')?.value;
  const secret  = process.env.ADMIN_PASSWORD || '';
  const ok      = secret !== '' && session === secret;

  if (pathname.startsWith('/api/admin')) {
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } else if (pathname.startsWith('/admin')) {
    if (!ok) return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
