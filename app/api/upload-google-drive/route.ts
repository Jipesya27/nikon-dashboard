import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Google Auth failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const prefix = formData.get('prefix') as string || 'file';
    const serial = formData.get('serial') as string || 'unknown';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop();
    const fileName = `${serial}_${prefix}_${Date.now()}.${ext}`;

    const accessToken = await getAccessToken();

    // Upload via Google Drive REST API (multipart)
    const metadata = { name: fileName, parents: [FOLDER_ID] };
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    body.append('file', file);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
      }
    );
    const uploadData = await uploadRes.json();

    if (!uploadData.id) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }

    // Make file publicly viewable
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });

    const publicUrl = `https://drive.google.com/uc?id=${uploadData.id}&export=view`;

    return NextResponse.json({
      success: true,
      fileId: uploadData.id,
      fileName,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('Google Drive upload error:', error?.message);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { fileId } = await request.json();
    if (!fileId) {
      return NextResponse.json({ error: 'No fileId provided' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Google Drive delete error:', error?.message);
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
