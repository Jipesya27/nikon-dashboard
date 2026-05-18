import { NextResponse } from 'next/server';
import { buildSessionToken } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { password } = await req.json() as { password: string };
    const secret = process.env.ADMIN_PASSWORD || '';

    if (!secret || password !== secret) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    const token = await buildSessionToken(secret);
    const res = NextResponse.json({ success: true });
    res.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('admin_session');
  return res;
}
