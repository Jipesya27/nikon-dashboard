import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { password } = await req.json() as { password: string };
    const secret = process.env.ADMIN_PASSWORD || '';

    if (!secret || password !== secret) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('admin_session', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
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
