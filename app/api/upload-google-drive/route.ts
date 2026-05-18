import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

// Sanitasi nama file: hapus karakter yang bermasalah di filesystem/Drive
function sanitizeFileName(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim().substring(0, 200);
}

async function getAccessToken() {
  let res: Response;
  try {
    res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    throw new Error("Google Auth timeout atau jaringan bermasalah. Coba lagi.");
  }
  const data = await res.json();
  if (!data.access_token) {
    const hint = data.error === "invalid_grant"
      ? "Refresh token expired — minta admin perbarui GOOGLE_REFRESH_TOKEN."
      : JSON.stringify(data);
    throw new Error(`Google Auth gagal: ${hint}`);
  }
  return data.access_token as string;
}

async function uploadToGoogleDrive(file: File, fileName: string, accessToken: string) {
  const metadata = { name: fileName, parents: [FOLDER_ID] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: form,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Upload ke Google Drive timeout. File mungkin terlalu besar atau koneksi lambat.");
  }
  const data = await res.json();

  if (!data.id) {
    throw new Error(`Google Drive upload failed: ${JSON.stringify(data)}`);
  }

  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

async function deleteFromGoogleDrive(fileId: string, accessToken: string) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        console.error(`Failed to delete file ${fileId} from Google Drive:`, await res.text());
    }
}


const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  try {
    // Require admin session for file uploads
    const cookieStore = await cookies();
    if (!(await verifyAdminSession(cookieStore))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const prefix = formData.get('prefix') as string;
    const serial = formData.get('serial') as string;

    if (!file || !prefix || !serial) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Validate file type and size
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipe file tidak diizinkan. Gunakan JPG, PNG, WEBP, GIF, atau PDF.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran file maksimal 10 MB.' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const originalName = file.name.split('.');
    const ext = originalName.length > 1 ? originalName.pop() : '';
    const cleanBaseName = sanitizeFileName(originalName.join('.'));

    const fileName = `${prefix}_${serial}_${cleanBaseName}_${Date.now()}.${ext}`;
    const url = await uploadToGoogleDrive(file, fileName, accessToken);

    return NextResponse.json({ success: true, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // Require admin session for file deletion
    const cookieStore = await cookies();
    if (!(await verifyAdminSession(cookieStore))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await req.json();
    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }
    const accessToken = await getAccessToken();
    await deleteFromGoogleDrive(fileId, accessToken);
    return NextResponse.json({ success: true, message: 'File deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}