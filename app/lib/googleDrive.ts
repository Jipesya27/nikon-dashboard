/**
 * Shared Google Drive utility
 * Dipakai oleh upload-google-drive/route.ts dan webhook/whatsapp/route.ts
 */

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
export const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

export async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
    signal: AbortSignal.timeout(7000),
  });
  const data = await res.json();
  if (!data.access_token) {
    const hint = data.error === 'invalid_grant'
      ? 'Refresh token expired — perbarui GOOGLE_REFRESH_TOKEN.'
      : JSON.stringify(data);
    throw new Error(`Google Auth gagal: ${hint}`);
  }
  return data.access_token as string;
}

/** Cari subfolder berdasarkan nama di dalam parentId. Buat baru jika belum ada. */
export async function getOrCreateFolder(
  folderName: string,
  parentId: string,
  accessToken: string,
): Promise<string> {
  const q = encodeURIComponent(
    `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const { files } = await searchRes.json() as { files?: { id: string }[] };
  if (files && files.length > 0) return files[0].id;

  // Buat folder baru
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  const created = await createRes.json() as { id: string };
  return created.id;
}

/** Upload buffer/blob ke Google Drive dan kembalikan URL permanen. */
export async function uploadBufferToDrive(
  buffer: ArrayBuffer,
  mimeType: string,
  fileName: string,
  folderId: string,
  accessToken: string,
): Promise<string> {
  const metadata = { name: fileName, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([buffer], { type: mimeType }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
      signal: AbortSignal.timeout(20000),
    },
  );
  const data = await res.json() as { id?: string };
  if (!data.id) throw new Error(`Upload Drive gagal: ${JSON.stringify(data)}`);
  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').trim().substring(0, 200);
}
