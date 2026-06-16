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

// Hash sederhana dari isi row (tanpa crypto module)
function rowHash(headers: string[], row: string[]): string {
  const content = headers.map((h, i) => `${h}:${row[i] ?? ''}`).join('|');
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (Math.imul(31, hash) + content.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Ambil data dari Google Sheets
    const accessToken = await getGoogleAccessToken();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Export gagal HTTP ${res.status}`);
    const csvText = await res.text();
    const allRows = parseCsv(csvText);
    if (allRows.length < 2) return NextResponse.json({ synced: 0, message: 'Sheet kosong' });

    const headers = allRows[0].map(h => h.trim());
    const dataRows = allRows.slice(1)
      .map(row => { const p = [...row]; while (p.length < headers.length) p.push(''); return p.map(c => c.trim()); })
      .filter(row => row.some(c => c !== ''));

    // 2. Bangun payload upsert
    const upsertPayload = dataRows.map(row => {
      const rowData: Record<string, string> = {};
      headers.forEach((h, i) => { if (h) rowData[h.toLowerCase().replace(/\s+/g, '_')] = row[i] ?? ''; });
      return {
        row_hash: rowHash(headers, row),
        row_data: rowData,
        synced_at: new Date().toISOString(),
      };
    });

    // 3. Upsert ke Supabase (batch 100)
    const supabase = getSupabase();
    let inserted = 0;
    let updated = 0;
    const BATCH = 100;
    for (let i = 0; i < upsertPayload.length; i += BATCH) {
      const batch = upsertPayload.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from('transaksi_dealer')
        .upsert(batch, { onConflict: 'row_hash', ignoreDuplicates: false })
        .select('id');
      if (error) throw new Error(`Supabase error: ${error.message}`);
      // Tidak bisa bedakan insert vs update dari upsert, hitung total saja
      inserted += data?.length ?? 0;
    }

    return NextResponse.json({
      success: true,
      total_rows: dataRows.length,
      synced: inserted,
      message: `Berhasil sync ${dataRows.length} baris ke Supabase`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — ambil data dari Supabase (bukan Google Sheets)
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('transaksi_dealer')
    .select('row_data, synced_at')
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ headers: [], rows: [], total: 0 });

  // Rekonstruksi headers dari key pertama yang ada
  const allKeys = new Set<string>();
  data.forEach(d => Object.keys(d.row_data).forEach(k => allKeys.add(k)));
  const headers = Array.from(allKeys);
  const rows = data.map(d => headers.map(h => d.row_data[h] ?? ''));

  return NextResponse.json({ headers, rows, total: data.length, source: 'supabase' });
}
