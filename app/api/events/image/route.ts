/**
 * Public proxy untuk gambar event dari Google Drive.
 * Tidak butuh admin session — dipakai di halaman publik /events/register.
 */
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

/** Ekstrak Google Drive file ID dari berbagai format URL. */
function extractDriveId(url: string): string | null {
  if (!url) return null;
  // Format: drive.google.com/uc?id=FILE_ID
  const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{10,100})/);
  if (ucMatch) return ucMatch[1];
  // Format: drive.google.com/file/d/FILE_ID/...
  const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]{10,100})/);
  if (fileMatch) return fileMatch[1];
  // Raw ID
  if (VALID_ID.test(url)) return url;
  return null;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('url') || '';
  const fileId = extractDriveId(raw);

  if (!fileId) {
    return new NextResponse('Invalid file ID', { status: 400 });
  }

  try {
    const token = await getAccessToken();
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!driveRes.ok) {
      return new NextResponse('File not found', { status: 404 });
    }

    const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
    const body = await driveRes.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'Content-Type':  contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400', // cache 1 hari
      },
    });
  } catch (err) {
    console.error('[event-image] gagal fetch Drive:', err);
    return new NextResponse('Gagal mengambil gambar', { status: 500 });
  }
}
