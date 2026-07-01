import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { sendWA, sendWATemplate, sendWATemplateWithDoc } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { target, message, templateName, bodyParams, documentUrl, documentFilename } = body;

  if (!target) {
    return NextResponse.json({ error: 'target wajib diisi' }, { status: 400 });
  }

  try {
    let wamid: string | undefined;
    if (templateName && documentUrl) {
      // Template dengan DOCUMENT header (hindari — iOS tidak support)
      await sendWATemplateWithDoc(target, templateName, bodyParams ?? [], documentUrl, documentFilename ?? 'dokumen.pdf');
    } else if (templateName) {
      // Template body-only (cross-platform iOS + Android)
      await sendWATemplate(target, templateName, bodyParams ?? []);
    } else {
      if (!message) return NextResponse.json({ error: 'message wajib diisi' }, { status: 400 });
      wamid = await sendWA(target, message);
    }
    return NextResponse.json({ ok: true, wamid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-wa] error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
