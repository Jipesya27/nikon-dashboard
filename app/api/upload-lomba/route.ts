/**
 * POST /api/upload-lomba
 * Upload foto lomba ke Google Drive folder "Upload File Lomba".
 * Public endpoint (tidak butuh admin session) — validasi lewat file type + size.
 *
 * Body: FormData
 *   eventName  — nama event
 *   igAccount  — akun Instagram peserta (tanpa @)
 *   fotoIndex  — nomor foto (1-10)
 *   file       — file gambar
 *
 * Nama file di Drive: {EventName}_{IGAccount}_foto{N}.{ext}
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const PARENT_FOLDER_ID     = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const LOMBA_FOLDER_NAME    = 'Upload File Lomba';

const ALLOWED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/heic', 'image/heif',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function sanitize(s: string): string {
  return s
    .replace(/^@/, '')
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .trim()
    .substring(0, 80);
}

async function getAccessToken(): Promise<string> {
  let res: Response;
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    throw new Error('Google Auth timeout — coba lagi.');
  }
  const data = await res.json();
  if (!data.access_token) {
    const hint = data.error === 'invalid_grant'
      ? 'Refresh token expired.'
      : JSON.stringify(data);
    throw new Error('Google Auth gagal: ' + hint);
  }
  return data.access_token as string;
}

/** Cari folder by name di parent. Buat jika belum ada. */
async function getOrCreateFolder(name: string, parentId: string, token: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(7000) },
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) return searchData.files[0].id as string;

  // Buat folder baru
  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
      signal: AbortSignal.timeout(7000),
    },
  );
  const createData = await createRes.json();
  if (!createData.id) throw new Error('Gagal membuat folder Drive.');
  return createData.id as string;
}

async function uploadFileToDrive(
  file: File,
  fileName: string,
  folderId: string,
  token: string,
): Promise<{ fileId: string; viewUrl: string }> {
  const metadata = { name: fileName, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  let res: Response;
  try {
    res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: AbortSignal.timeout(60000),
      },
    );
  } catch {
    throw new Error('Upload timeout — file terlalu besar atau koneksi lambat.');
  }
  const data = await res.json();
  if (!data.id) throw new Error('Upload gagal: ' + JSON.stringify(data));
  return {
    fileId: data.id,
    viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const eventName = (formData.get('eventName') as string | null)?.trim();
    const eventDate = (formData.get('eventDate') as string | null)?.trim() || '';
    const igAccount = (formData.get('igAccount') as string | null)?.trim();
    const fotoIndex = (formData.get('fotoIndex') as string | null)?.trim();
    const file      = formData.get('file') as File | null;

    if (!eventName || !igAccount || !fotoIndex || !file) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }
    const idx = parseInt(fotoIndex);
    if (isNaN(idx) || idx < 1 || idx > 10) {
      return NextResponse.json({ error: 'Nomor foto tidak valid (1-10).' }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.' },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran foto maksimal 20 MB.' }, { status: 400 });
    }

    const ext       = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanEvt  = sanitize(eventName);
    const cleanDate = eventDate ? `_${sanitize(eventDate)}` : '';
    const cleanIg   = sanitize(igAccount);
    const fileName  = `${cleanEvt}${cleanDate}_${cleanIg}_foto${idx}.${ext}`;

    const token    = await getAccessToken();
    const folderId = await getOrCreateFolder(LOMBA_FOLDER_NAME, PARENT_FOLDER_ID, token);
    const result   = await uploadFileToDrive(file, fileName, folderId, token);

    return NextResponse.json({ success: true, ...result, fileName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
