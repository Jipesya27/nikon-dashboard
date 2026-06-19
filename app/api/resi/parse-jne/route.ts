import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export interface JneRow {
  no: number;
  cnote_no: string;
  date: string;
  time: string;
  service: string;
  destination: string;
  amount: number;
  receiver_name: string;
  goods: string;
}

const JNE_MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', MEI: '05',
  JUN: '06', JUL: '07', AUG: '08', AGU: '08', SEP: '09',
  OCT: '10', OKT: '10', NOV: '11', DEC: '12', DES: '12',
};

function parsePeriodeDate(lines: string[]): string | null {
  for (const line of lines) {
    const m = line.match(/Periode\s*:\s*(\d{1,2})-([A-Z]{3})-(\d{4})/i);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mon = JNE_MONTHS[m[2].toUpperCase()] ?? '01';
      return `${m[3]}-${mon}-${dd}`;
    }
  }
  return null;
}

function parseJneText(text: string): JneRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rows: JneRow[] = [];

  const periodeDate = parsePeriodeDate(lines);

  // Tiap block dimulai baris: <no 1-3 digit><cnote 15 digit mulai 0>
  const starts: { idx: number; no: number; cnote: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\d{1,3})(0\d{14})$/);
    if (m) starts.push({ idx: i, no: parseInt(m[1]), cnote: m[2] });
  }

  for (let b = 0; b < starts.length; b++) {
    const s = starts[b].idx;
    const e = b + 1 < starts.length ? starts[b + 1].idx : lines.length;
    const bl = lines.slice(s, e);

    // ── Tanggal & waktu ────────────────────────────────────────────────────
    // Utama: ambil dari header "Periode : DD-MON-YYYY" — andal & konsisten.
    // Fallback: parse bl[1] jika header tidak ditemukan.
    let isoDate = periodeDate ?? '';
    let timeIdx = 2;
    if (!periodeDate) {
      let dateStr = bl[1];
      const dateNoYear = /^\d{2}-\d{2}-?$/.test(bl[1]);
      if (dateNoYear) {
        const part2 = bl[2];
        const mergedYT = part2.match(/^(\d{2,4})\s+(\d{2}:\d{2})$/);
        const base = bl[1].endsWith('-') ? bl[1] : bl[1] + '-';
        if (mergedYT) {
          dateStr = base + mergedYT[1];
        } else {
          dateStr = base + part2;
          timeIdx = 3;
        }
      }
      const [dd, mm, yy] = dateStr.split('-');
      const yearNum = yy && yy.length === 4 ? parseInt(yy) : 2000 + parseInt(yy);
      isoDate = `${yearNum}-${mm}-${dd}`;
    }
    // Ekstrak HH:MM dari baris timeIdx
    const timeRaw = bl[timeIdx] ?? '';
    const timeM = timeRaw.match(/(\d{2}:\d{2})/);
    const time = timeM ? timeM[1] : timeRaw;

    // ── Service & destination ─────────────────────────────────────────────
    let service = '', destination = '';
    let rest = timeIdx + 2;
    const l3 = bl[timeIdx + 1];

    // Case 1 — with phone: service+weight+qty+dest+phone semua 1 baris
    const full = l3.match(/^(.+?)(\d)(\d)([A-Z].+)\+\d+$/);
    // Case 2 — no phone: service+weight+qty+dest menyatu, tanpa phone
    const noPhone = !full ? l3.match(/^(.+?)(\d)(\d)([A-Z].+)$/) : null;

    if (full) {
      service = full[1];
      destination = full[4].trim();
      rest = timeIdx + 2;
    } else if (noPhone) {
      service = noPhone[1];
      destination = noPhone[4].trim();
      rest = timeIdx + 2;
    } else {
      // Fallback: service+weight+qty di 1 baris, destination di baris berikutnya
      service = l3.replace(/\d{2}$/, '');
      let i = timeIdx + 2;
      const destParts: string[] = [];
      // Batas: phone (+62...), shipper ID (^11), atau Cash
      while (i < bl.length && !bl[i].startsWith('+') && !/^(11\b|Cash)/.test(bl[i])) {
        destParts.push(bl[i]);
        i++;
      }
      destination = destParts.join(' ');
      if (i < bl.length && bl[i].startsWith('+')) i++;
      rest = i;
    }

    // ── Skip shipper ──────────────────────────────────────────────────────
    // Cari baris yang mengandung "NIKINDO":
    //   - "NIKINDO"           → shipper name baris terakhir (split 2 baris)
    //   - "ALTANIKINDO"       → shipper name satu kata
    //   - "NIKINDO (NIKON)"   → dengan suffix
    let nikindoIdx = -1;
    for (let i = rest; i < bl.length; i++) {
      if (bl[i].includes('NIKINDO')) { nikindoIdx = i; break; }
    }
    if (nikindoIdx >= 0) {
      rest = nikindoIdx + 1;
    } else {
      // Shipper bukan NIKINDO (mis. shipper lain di agen yang sama)
      // Skip baris yang diawali "11 " atau tepat "11" (kode agen)
      while (rest < bl.length && /^11\b/.test(bl[rest])) rest++;
    }

    // ── Amount ────────────────────────────────────────────────────────────
    const cashIdx = bl.findIndex((l, i) => i >= rest && /Cash[\d,]+\.\d/.test(l));
    const cashLine = cashIdx >= 0 ? bl[cashIdx] : '';
    const amtM = cashLine.match(/Cash([\d,]+)\.00/);
    const amount = amtM ? parseInt(amtM[1].replace(/,/g, '')) : 0;

    // cashPrefix = teks non-digit sebelum angka pertama di baris Cash
    // Jika nilainya "Cash" (label metode bayar) → bukan barang, anggap kosong
    const cashPrefixM = cashLine.match(/^([^0-9]*)/);
    const rawPrefix = cashPrefixM ? cashPrefixM[1].trim() : '';
    const cashPrefix = rawPrefix === 'Cash' ? '' : rawPrefix;

    // Buang baris asuransi "0.00" dari middleLines sebelum parsing penerima/barang
    const middleLines = (cashIdx > 0 ? bl.slice(rest, cashIdx) : []).filter(l => l !== '0.00');

    let receiver_name = '', goods = '';
    if (!cashPrefix) {
      // Case A: Cash murni angka (atau "Cash" label) — middleLines berisi penerima lalu barang
      // Item terakhir = barang, sisanya = penerima
      if (middleLines.length >= 2) {
        goods = middleLines[middleLines.length - 1];
        receiver_name = middleLines.slice(0, -1).join(' ');
      } else {
        receiver_name = middleLines.join(' ');
      }
    } else if (middleLines.length === 0) {
      // Case B: penerima+barang menyatu di cashPrefix — split dengan keyword barang di akhir
      const gMatch = cashPrefix.match(
        /(BATERAI|LENSA KAMERA|KAMERA|LENSA|FLASH|CHARGER|TRIPOD|MEMORY CARD|MEMORY|CARD|AKSESORIS|FILTER|HOOD|STRAP|CASE|REMOTE|GRIP|SPEEDLIGHT|SOFTBOX|STAND|CABLE|CLEANING KIT|KIT|SET|BUNDLE|BAG|TAS|MAKANAN)$/,
      );
      if (gMatch) {
        goods = gMatch[1];
        receiver_name = cashPrefix.slice(0, cashPrefix.length - goods.length).trim();
      } else {
        receiver_name = cashPrefix;
        goods = '';
      }
    } else {
      // Case C: cashPrefix = barang, middleLines = penerima
      receiver_name = middleLines.join(' ');
      goods = cashPrefix;
    }

    rows.push({
      no: starts[b].no,
      cnote_no: starts[b].cnote,
      date: isoDate,
      time,
      service,
      destination,
      amount,
      receiver_name,
      goods,
    });
  }
  return rows;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    const rows = parseJneText(parsed.text);
    return NextResponse.json({ rows, total: rows.length });
  } catch (e) {
    return NextResponse.json(
      { error: 'Gagal parse PDF: ' + (e instanceof Error ? e.message : String(e)) },
      { status: 500 },
    );
  }
}
