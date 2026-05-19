import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://ibnux.github.io/data-indonesia';
const CACHE_SECONDS = 86400; // 24 jam

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await params;
  const path = segments.join('/');

  const upstream = `${BASE}/${path}`;

  try {
    const res = await fetch(upstream, {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=3600`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
