import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { sendWA } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { target, message } = await req.json();
  if (!target || !message) {
    return NextResponse.json({ error: 'target dan message wajib diisi' }, { status: 400 });
  }

  try {
    await sendWA(target, message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-wa] error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
