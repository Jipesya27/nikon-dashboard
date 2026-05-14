const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

export async function getGoogleAccessToken() {
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
  if (!data.access_token) throw new Error(`Google Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

export function getGoogleDriveFolderId() {
  return FOLDER_ID;
}

// Cache subfolder IDs untuk kurangi roundtrip ke Google API
const subfolderCache: Record<string, string> = {};

export async function getOrCreateSubfolder(name: string, parentId?: string): Promise<string> {
  const parent = parentId || FOLDER_ID;
  const cacheKey = `${parent}/${name}`;
  if (subfolderCache[cacheKey]) return subfolderCache[cacheKey];

  const accessToken = await getGoogleAccessToken();
  // Cari folder yg sudah ada
  const escName = name.replace(/'/g, "\\'");
  const q = `'${parent}' in parents and name='${escName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    subfolderCache[cacheKey] = searchData.files[0].id;
    return searchData.files[0].id;
  }
  // Buat folder baru
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parent],
    }),
  });
  const createData = await createRes.json();
  if (!createData.id) throw new Error(`Failed to create folder: ${JSON.stringify(createData)}`);
  subfolderCache[cacheKey] = createData.id;
  return createData.id;
}

export async function uploadToGoogleDrive(
  file: Blob,
  fileName: string,
  options?: { mimeType?: string; folderName?: string; folderId?: string }
): Promise<string> {
  const accessToken = await getGoogleAccessToken();
  let parentFolderId = options?.folderId || FOLDER_ID;
  if (options?.folderName) {
    parentFolderId = await getOrCreateSubfolder(options.folderName);
  }
  const metadata: { name: string; parents: string[]; mimeType?: string } = { name: fileName, parents: [parentFolderId] };
  if (options?.mimeType) metadata.mimeType = options.mimeType;

  const body = new FormData();
  body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  body.append('file', file);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body }
  );
  const uploadData = await uploadRes.json();
  if (!uploadData.id) throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);

  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  return uploadData.id;
}

export async function deleteFromGoogleDrive(fileId: string) {
  const accessToken = await getGoogleAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
