import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const IMMICH_URL = process.env.IMMICH_URL || 'http://192.168.18.210:2283';
const IMMICH_API_KEY = process.env.IMMICH_API_KEY || '';

const DELL_ML_URL = 'http://127.0.0.1:3003';
const LAPTOP_ML_URL = 'http://192.168.18.94:3003';

const isDellUrl = (url: string) =>
  url === 'http://127.0.0.1:3003' || url === 'http://localhost:3003';

async function immichFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${IMMICH_URL}${path}`, {
    ...options,
    headers: {
      'x-api-key': IMMICH_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Immich API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function GET() {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!IMMICH_API_KEY) {
    return NextResponse.json({ error: 'IMMICH_API_KEY belum dikonfigurasi di .env' }, { status: 503 });
  }
  try {
    const config = await immichFetch('/api/system-config');
    const ml = config?.machineLearning;
    // Immich menyimpan URL sebagai string (url) atau array (urls) tergantung versi
    const currentUrl: string = ml?.url ?? (Array.isArray(ml?.urls) ? ml.urls[0] : '') ?? '';
    const mode = currentUrl === LAPTOP_ML_URL ? 'laptop' : isDellUrl(currentUrl) ? 'dell' : 'unknown';
    return NextResponse.json({ mode, url: currentUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!IMMICH_API_KEY) {
    return NextResponse.json({ error: 'IMMICH_API_KEY belum dikonfigurasi di .env' }, { status: 503 });
  }
  const { mode } = await req.json() as { mode: string };
  if (mode !== 'dell' && mode !== 'laptop') {
    return NextResponse.json({ error: 'mode harus "dell" atau "laptop"' }, { status: 400 });
  }
  try {
    const config = await immichFetch('/api/system-config');
    const newUrl = mode === 'laptop' ? LAPTOP_ML_URL : DELL_ML_URL;
    // Handle kedua format: string url atau array urls
    if (Array.isArray(config?.machineLearning?.urls)) {
      config.machineLearning.urls = [newUrl];
    } else {
      config.machineLearning.url = newUrl;
    }
    await immichFetch('/api/system-config', { method: 'PUT', body: JSON.stringify(config) });
    return NextResponse.json({ ok: true, mode, url: newUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
