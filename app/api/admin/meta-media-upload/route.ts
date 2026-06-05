import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const TOKEN   = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

async function getAppId(): Promise<string> {
  // Ambil app_id dari daftar app yang subscribe ke WABA
  const res = await fetch(
    `https://graph.facebook.com/v25.0/${WABA_ID}/subscribed_apps`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(8000) },
  );
  const data = await res.json();
  const appId = data?.data?.[0]?.whatsapp_business_api_data?.id
    || data?.data?.[0]?.id;
  if (!appId) throw new Error('Tidak dapat menemukan App ID dari WABA');
  return appId;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TOKEN || !WABA_ID) {
    return NextResponse.json({ error: 'WHATSAPP env belum dikonfigurasi' }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File wajib diisi' }, { status: 400 });

  const fileBytes = await file.arrayBuffer();
  const fileSize  = fileBytes.byteLength;
  const fileType  = file.type || 'application/pdf';

  try {
    // Step 1: Ambil App ID
    const appId = await getAppId();

    // Step 2: Buat upload session
    const sessionRes = await fetch(
      `https://graph.facebook.com/v25.0/${appId}/uploads?file_length=${fileSize}&file_type=${encodeURIComponent(fileType)}&messaging_product=whatsapp`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    const sessionData = await sessionRes.json();
    if (!sessionRes.ok || !sessionData.id) {
      return NextResponse.json(
        { error: sessionData?.error?.error_user_msg || sessionData?.error?.message || 'Gagal membuat upload session' },
        { status: sessionRes.status },
      );
    }
    const sessionId = sessionData.id;

    // Step 3: Upload file ke session
    const uploadRes = await fetch(
      `https://graph.facebook.com/v25.0/${sessionId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${TOKEN}`,
          file_offset: '0',
          'Content-Type': fileType,
        },
        body: fileBytes,
        signal: AbortSignal.timeout(30000),
      },
    );
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.h) {
      return NextResponse.json(
        { error: uploadData?.error?.error_user_msg || uploadData?.error?.message || 'Upload file gagal' },
        { status: uploadRes.status },
      );
    }

    return NextResponse.json({ handle: uploadData.h });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[meta-media-upload] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
