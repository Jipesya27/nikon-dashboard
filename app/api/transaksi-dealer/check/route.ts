import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { createClient } from '@supabase/supabase-js';
import { getGoogleAccessToken } from '@/app/lib/google-drive';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = '1_nBUzC8Zcfxqj4Vjw0uK6S84_CNnGW_yINdoXxbgzVo';
const SHEET_GID = 383796866;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

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
      else if (ch === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows.filter(r => r.some(c => c !== ''));
}

function rowHash(headers: string[], row: string[]): string {
  const content = headers.map((h, i) => `${h}:${row[i] ?? ''}`).join('|');
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (Math.imul(31, hash) + content.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Ambil semua row_hash dari Supabase
    const supabase = getSupabase();
    const { data: sbData, error } = await supabase
      .from('transaksi_dealer')
      .select('row_hash');

    if (error) throw new Error(error.message);
    const sbHashes = new Set((sbData ?? []).map((r: { row_hash: string }) => r.row_hash));

    // 2. Ambil data Google Sheets
    const accessToken = await getGoogleAccessToken();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Sheets error HTTP ${res.status}`);
    const csvText = await res.text();
    const allRows = parseCsv(csvText);
    if (allRows.length < 2) {
      return NextResponse.json({ sheets_count: 0, supabase_count: sbHashes.size, unsynced_count: 0 });
    }

    const headers = allRows[0].map(h => h.trim());
    const dataRows = allRows.slice(1)
      .map(row => { const p = [...row]; while (p.length < headers.length) p.push(''); return p.map(c => c.trim()); })
      .filter(row => row.some(c => c !== ''));

    const unsynced = dataRows.filter(row => !sbHashes.has(rowHash(headers, row)));

    return NextResponse.json({
      sheets_count: dataRows.length,
      supabase_count: sbHashes.size,
      unsynced_count: unsynced.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
