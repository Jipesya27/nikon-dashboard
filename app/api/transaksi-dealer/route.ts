import { NextResponse } from 'next/server';
import { getGoogleAccessToken } from '@/app/lib/google-drive';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = '1_nBUzC8Zcfxqj4Vjw0uK6S84_CNnGW_yINdoXxbgzVo';
const SHEET_GID = 383796866;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSheetName(accessToken: string): Promise<string> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000) }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Sheets metadata error: ${data.error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheet = (data.sheets || []).find((s: any) => s.properties?.sheetId === SHEET_GID);
  return sheet?.properties?.title ?? 'Sheet1';
}

export async function GET() {
  try {
    const accessToken = await getGoogleAccessToken();
    const sheetName = await getSheetName(accessToken);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12000) }
    );
    const data = await res.json();
    if (data.error) throw new Error(`Sheets data error: ${data.error.message}`);

    const allRows: string[][] = data.values ?? [];
    if (allRows.length === 0) {
      return NextResponse.json({ success: true, headers: [], rows: [], sheetName });
    }

    const headers: string[] = allRows[0].map(h => String(h ?? '').trim());
    const rows: string[][] = allRows.slice(1).map(row => {
      // pad row to header length so indices always match
      const padded = [...row];
      while (padded.length < headers.length) padded.push('');
      return padded.map(c => String(c ?? '').trim());
    }).filter(row => row.some(c => c !== ''));

    return NextResponse.json({ success: true, headers, rows, sheetName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
