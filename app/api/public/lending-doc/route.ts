import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_ID = /^[a-zA-Z0-9_-]{10,100}$/;

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID     || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
      grant_type:    'refresh_token',
    }),
    signal: AbortSignal.timeout(7000),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Auth gagal');
  return data.access_token as string;
}

/**
 * GET /api/public/lending-doc?id={driveFileId}
 *
 * Route publik (tanpa session) untuk serve PDF rincian peminjaman.
 * Digunakan sebagai documentUrl di Meta WA template — Meta perlu URL
 * yang dapat diakses langsung tanpa redirect (Google Drive uc?export=download
 * melakukan redirect yang tidak selalu diikuti oleh iOS WhatsApp).
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !VALID_ID.test(id)) {
    return new NextResponse('Invalid file ID', { status: 400 });
  }

  try {
    const token = await getAccessToken();
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20000),
      },
    );

    if (!driveRes.ok) return new NextResponse('File not found', { status: 404 });

    const body = await driveRes.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control':       'public, max-age=86400',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[public/lending-doc] error:', message);
    return new NextResponse('Gagal mengambil file', { status: 500 });
  }
}
