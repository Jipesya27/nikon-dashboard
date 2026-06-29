import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const WA_TOKEN   = process.env.WHATSAPP_ACCESS_TOKEN || '';
const PHONE_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const G_CLIENT   = process.env.GOOGLE_CLIENT_ID || '';
const G_SECRET   = process.env.GOOGLE_CLIENT_SECRET || '';
const G_REFRESH  = process.env.GOOGLE_REFRESH_TOKEN || '';

const VALID_ID = /^[a-zA-Z0-9_-]{10,100}$/;

function toE164(n: string) {
  if (n.startsWith('+')) return n.slice(1);
  if (n.startsWith('0')) return '62' + n.slice(1);
  return n;
}

async function getGoogleToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: G_CLIENT, client_secret: G_SECRET, refresh_token: G_REFRESH, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(7000),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Google auth gagal');
  return data.access_token as string;
}

/** Upload file bytes ke WhatsApp /media endpoint, return media_id */
async function uploadToWhatsApp(bytes: ArrayBuffer, mimeType: string): Promise<string> {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', new Blob([bytes], { type: mimeType }), 'media');
  const res = await fetch(`https://graph.facebook.com/v25.0/${PHONE_ID}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(data?.error?.message || 'Upload WA media gagal');
  return data.id as string;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { driveFileId, target, mediaType, caption } = await req.json() as {
    driveFileId: string;
    target: string;
    mediaType: 'image' | 'video' | 'document';
    caption?: string;
  };

  if (!driveFileId || !VALID_ID.test(driveFileId) || !target || !mediaType) {
    return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
  }

  try {
    // 1. Fetch file dari Google Drive server-side
    const gToken = await getGoogleToken();
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
      { headers: { Authorization: `Bearer ${gToken}` }, signal: AbortSignal.timeout(20000) },
    );
    if (!driveRes.ok) throw new Error('Gagal ambil file dari Google Drive');
    const mimeType = driveRes.headers.get('content-type') || 'image/jpeg';
    const bytes = await driveRes.arrayBuffer();

    // 2. Upload ke WhatsApp media endpoint
    const mediaId = await uploadToWhatsApp(bytes, mimeType);

    // 3. Kirim pesan WA menggunakan media_id
    const mediaBody: Record<string, string> = { id: mediaId };
    if (caption) mediaBody.caption = caption;
    if (mediaType === 'document') mediaBody.filename = 'file';

    const sendRes = await fetch(`https://graph.facebook.com/v25.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: toE164(target), type: mediaType, [mediaType]: mediaBody }),
      signal: AbortSignal.timeout(15000),
    });
    const sendData = await sendRes.json();
    if (!sendRes.ok) throw new Error(sendData?.error?.message || 'Kirim WA gagal');

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('[send-chat-media]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
