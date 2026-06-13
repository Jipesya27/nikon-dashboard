import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

const STB_URL = process.env.STB_METRICS_URL || 'http://192.168.18.63:9091';

export async function GET() {
  const cookieStore = await cookies();
  if (!await verifyAdminSession(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${STB_URL}/metrics`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`STB responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
