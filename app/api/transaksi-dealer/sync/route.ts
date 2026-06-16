import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { createClient } from '@supabase/supabase-js';
import { getGoogleAccessToken } from '@/app/lib/google-drive';

export const dynamic = 'force-dynamic';

const SPREADSHEET_ID = '1_nBUzC8Zcfxqj4Vjw0uK6S84_CNnGW_yINdoXxbgzVo';
const SHEET_GID = 383796866;

// Kolom yang tampil di tabel (urutan & label display)
const DISPLAY_COLS = [
  { key: 'form_timestamp',     label: 'Timestamp' },
  { key: 'nama_toko',          label: 'Nama Toko' },
  { key: 'tanggal_penjualan',  label: 'Tanggal Penjualan' },
  { key: 'type_barang',        label: 'Type Barang' },
  { key: 'serial_number',      label: 'Serial Number' },
  { key: 'foto_kartu_garansi', label: 'Foto Kartu Garansi' },
  { key: 'foto_invoice',       label: 'Foto Invoice/Nota' },
  { key: 'foto_box_serial',    label: 'Foto Box Serial' },
  { key: 'nama_sales',         label: 'Nama Sales/PIC' },
  { key: 'nomor_hp_sales',     label: 'No HP Sales/PIC' },
];

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

// Map nama kolom Google Sheets → kolom Supabase
// Matching case-insensitive, ignore spasi/underscore/slash
function mapHeader(raw: string): keyof typeof COL_MAP | null {
  const n = raw.toLowerCase().replace(/[\s_\/\-]+/g, '');
  return COL_MAP[n] ?? null;
}

const COL_MAP: Record<string, string> = {
  'timestamp':                        'form_timestamp',
  'namatoko':                         'nama_toko',
  'tanggalpenjualan':                 'tanggal_penjualan',
  'tglpenjualan':                     'tanggal_penjualan',
  'typebarang':                       'type_barang',
  'tipebarang':                       'type_barang',
  'serialnumber':                     'serial_number',
  'noseri':                           'serial_number',
  'sn':                               'serial_number',
  'fotokartugaransiresmialtanikondo': 'foto_kartu_garansi',
  'fotokartugaransi':                 'foto_kartu_garansi',
  'fotogaransi':                      'foto_kartu_garansi',
  'fotoinvoicenota':                  'foto_invoice',
  'fotoinvoicenotapenjualan':         'foto_invoice',
  'fotoinvoice':                      'foto_invoice',
  'fotonotapenjualan':                'foto_invoice',
  'fotoboxyangterlihatserialnumber':  'foto_box_serial',
  'fotoboxserialnumber':              'foto_box_serial',
  'fotobox':                          'foto_box_serial',
  'namasalespicstore':                'nama_sales',
  'namasales':                        'nama_sales',
  'pic':                              'nama_sales',
  'nomorhandphonesalespicstore':      'nomor_hp_sales',
  'nohpsales':                        'nomor_hp_sales',
  'nomorhp':                          'nomor_hp_sales',
  'nohp':                             'nomor_hp_sales',
  'nomortelepon':                     'nomor_hp_sales',
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    const upsertPayload = dataRows.map(row => {
      const rec: Record<string, string> = { row_hash: rowHash(headers, row), synced_at: new Date().toISOString() };
      headers.forEach((h, i) => {
        const col = mapHeader(h);
        if (col) rec[col] = row[i] ?? '';
      });
      return rec;
    });

    const supabase = getSupabase();
    let synced = 0;
    const BATCH = 100;
    for (let i = 0; i < upsertPayload.length; i += BATCH) {
      const batch = upsertPayload.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from('transaksi_dealer')
        .upsert(batch, { onConflict: 'row_hash', ignoreDuplicates: false })
        .select('id');
      if (error) throw new Error(`Supabase error: ${error.message}`);
      synced += data?.length ?? 0;
    }

    return NextResponse.json({
      success: true,
      total_rows: dataRows.length,
      synced,
      message: `Berhasil sync ${dataRows.length} baris ke Supabase`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

// GET — ambil data dari Supabase, kembalikan sebagai headers+rows untuk DealerTab
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const cols = DISPLAY_COLS.map(c => c.key).join(', ');
  const { data, error } = await supabase
    .from('transaksi_dealer')
    .select(cols)
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ headers: DISPLAY_COLS.map(c => c.label), rows: [], total: 0, source: 'supabase' });
  }

  const headers = DISPLAY_COLS.map(c => c.label);
  const rows = data.map(d => DISPLAY_COLS.map(c => ((d as unknown) as Record<string, string>)[c.key] ?? ''));

  return NextResponse.json({ headers, rows, total: data.length, source: 'supabase' });
}
