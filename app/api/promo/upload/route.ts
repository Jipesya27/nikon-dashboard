import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getOrCreateFolder, uploadBufferToDrive, ROOT_FOLDER_ID, sanitizeFileName } from '@/app/lib/googleDrive';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const prefix = (form.get('prefix') as string) || 'PromoUpload';

    if (!file) return NextResponse.json({ error: 'File wajib diisi' }, { status: 400 });
    if (!ALLOWED_MIME.includes(file.type)) return NextResponse.json({ error: 'Tipe file tidak didukung' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Ukuran file maksimal 10 MB' }, { status: 400 });

    const token = await getAccessToken();
    const folderId = await getOrCreateFolder('PromoDatacolor', ROOT_FOLDER_ID, token);
    const ext = file.name.split('.').pop() || 'jpg';
    const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
    const fileName = `${prefix}_${baseName}_${Date.now()}.${ext}`;
    const buf = await file.arrayBuffer();
    const url = await uploadBufferToDrive(buf, file.type, fileName, folderId, token);

    // Set public permission so WhatsApp can access if needed
    const fileId = url.match(/id=([^&]+)/)?.[1];
    if (fileId) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      });
    }

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
