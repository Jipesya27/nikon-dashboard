import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

const SYN_HOST = process.env.SYNOLOGY_HOST || 'http://192.168.18.169:5000';
const SYN_USER = process.env.SYNOLOGY_USER || 'admin';
const SYN_PASS = process.env.SYNOLOGY_PASS || '';

// Cache SID to avoid re-login every poll
let cachedSid: string | null = null;
let sidExpiry = 0;
// Setelah auth gagal, jangan coba login lagi 5 menit — mencegah DSM Auto Block memblokir IP
let authFailedUntil = 0;

async function getSid(): Promise<string> {
  if (cachedSid && Date.now() < sidExpiry) return cachedSid;
  if (Date.now() < authFailedUntil) {
    throw new Error('Auth cooldown aktif (login gagal sebelumnya, tunggu 5 menit)');
  }

  const url = `${SYN_HOST}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login` +
    `&account=${encodeURIComponent(SYN_USER)}&passwd=${encodeURIComponent(SYN_PASS)}&format=sid`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  const json = await res.json();
  if (!json.success) {
    authFailedUntil = Date.now() + 5 * 60 * 1000;
    throw new Error(`Synology auth failed: ${JSON.stringify(json.error)}`);
  }

  cachedSid = json.data.sid as string;
  sidExpiry = Date.now() + 20 * 60 * 1000; // 20 min
  return cachedSid;
}

async function dsm(api: string, version: number, method: string, extra = '') {
  const sid = await getSid();
  const url = `${SYN_HOST}/webapi/entry.cgi?api=${api}&version=${version}&method=${method}&_sid=${sid}${extra}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  const json = await res.json();
  if (!json.success) {
    // SID expired — clear cache and retry once
    if (json.error?.code === 105 || json.error?.code === 106) {
      cachedSid = null;
      const sid2 = await getSid();
      const url2 = `${SYN_HOST}/webapi/entry.cgi?api=${api}&version=${version}&method=${method}&_sid=${sid2}${extra}`;
      const res2 = await fetch(url2, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      return (await res2.json()).data ?? null;
    }
    return null;
  }
  return json.data ?? null;
}

export async function GET() {
  const cookieStore = await cookies();
  if (!await verifyAdminSession(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [utilization, storage, info] = await Promise.all([
      dsm('SYNO.Core.System.Utilization', 1, 'get'),
      dsm('SYNO.Storage.CGI.Storage', 1, 'load_info'),
      dsm('SYNO.Core.System', 1, 'info'),
    ]);

    return NextResponse.json({ ok: true, data: { utilization, storage, info } });
  } catch (err: unknown) {
    cachedSid = null; // reset on error
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
