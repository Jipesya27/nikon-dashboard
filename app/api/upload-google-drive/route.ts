import { NextRequest, NextResponse } from 'next/server';
import { uploadToGoogleDrive, deleteFromGoogleDrive } from '@/app/lib/google-drive';

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
    const fileId = await uploadToGoogleDrive(file, fileName);
    // New working format — old `uc?id=X&export=view` returns virus-scan HTML page now
    const publicUrl = `https://lh3.googleusercontent.com/d/${fileId}=w2000`;

    return NextResponse.json({ success: true, fileId, fileName, url: publicUrl });
  } catch (error: any) {
    console.error('Google Drive upload error:', error?.message);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { fileId } = await request.json();
    if (!fileId) {
      return NextResponse.json({ error: 'No fileId provided' }, { status: 400 });
    }

    await deleteFromGoogleDrive(fileId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Google Drive delete error:', error?.message);
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}
