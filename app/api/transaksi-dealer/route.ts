import { NextResponse } from 'next/server';
import { getGoogleAccessToken } from '@/app/lib/google-drive';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = '1_nBUzC8Zcfxqj4Vjw0uK6S84_CNnGW_yINdoXxbgzVo';
const SHEET_GID = 383796866;

/**
 * Parse CSV teks menjadi array of array string.
 * Mendukung field yang di-quote dan newline di dalam quote.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n') {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
        // skip \r sebelum \n
      } else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  // baris terakhir
  if (field || row.length > 0) { row.push(field.trim()); rows.push(row); }

  return rows.filter(r => r.some(c => c !== ''));
}

/**
 * Gunakan Google Drive export (format=csv) — tidak memerlukan Sheets API,
 * cukup scope https://www.googleapis.com/auth/drive yang sudah ada.
 */
export async function GET() {
  try {
    const accessToken = await getGoogleAccessToken();

    const exportUrl =
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Export gagal (HTTP ${res.status}): ${errText.substring(0, 300)}`);
    }

    const csvText = await res.text();
    const allRows = parseCsv(csvText);

    if (allRows.length === 0) {
      return NextResponse.json({ success: true, headers: [], rows: [], sheetName: 'Sheet' });
    }

    const headers = allRows[0].map(h => h.trim());
    const rows = allRows.slice(1).map(row => {
      const padded = [...row];
      while (padded.length < headers.length) padded.push('');
      return padded.map(c => c.trim());
    }).filter(row => row.some(c => c !== ''));

    return NextResponse.json({ success: true, headers, rows, sheetName: 'Sheet' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
