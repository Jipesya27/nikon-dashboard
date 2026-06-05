import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const TOKEN          = process.env.WHATSAPP_ACCESS_TOKEN || '';
const PHONE_ID       = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TOKEN || !PHONE_ID) {
    return NextResponse.json({ error: 'WHATSAPP env belum dikonfigurasi' }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File wajib diisi' }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type || 'application/pdf' });

  const uploadForm = new FormData();
  uploadForm.append('messaging_product', 'whatsapp');
  uploadForm.append('type', file.type || 'application/pdf');
  uploadForm.append('file', blob, file.name || 'sample.pdf');

  try {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${PHONE_ID}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: uploadForm,
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.error_user_msg || data?.error?.message || 'Upload gagal' },
        { status: res.status },
      );
    }
    return NextResponse.json({ handle: data.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
