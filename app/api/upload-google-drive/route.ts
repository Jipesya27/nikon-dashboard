import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

// Sanitasi nama file: hapus karakter yang bermasalah di filesystem/Drive
function sanitizeFileName(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim().substring(0, 200);
}

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Google Auth failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function uploadToGoogleDrive(file: File, fileName: string, accessToken: string) {
  const metadata = { name: fileName, parents: [FOLDER_ID] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}` },
    body: form,
  });
  const data = await res.json();

  if (!data.id) {
    throw new Error(`Google Drive upload failed: ${JSON.stringify(data)}`);
  }

  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

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


export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const prefix = formData.get('prefix') as string;
    const serial = formData.get('serial') as string;

    if (!file || !prefix || !serial) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const originalName = file.name.split('.');
    const ext = originalName.length > 1 ? originalName.pop() : '';
    const cleanBaseName = sanitizeFileName(originalName.join('.'));
    
    const fileName = `${prefix}_${serial}_${cleanBaseName}_${Date.now()}.${ext}`;
    const url = await uploadToGoogleDrive(file, fileName, accessToken);

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
        const { fileId } = await req.json();
        if (!fileId) {
            return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
        }
        const accessToken = await getAccessToken();
        await deleteFromGoogleDrive(fileId, accessToken);
        return NextResponse.json({ success: true, message: 'File deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}