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

function parseJneText(text: string): JneRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rows: JneRow[] = [];

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

    // Tanggal bisa 1 baris "DD-MM-YY" atau terpecah 2 baris "DD-MM-" + "YY"
    let dateStr = bl[1];
    let timeIdx = 2;
    if (bl[1].endsWith('-')) { dateStr = bl[1] + bl[2]; timeIdx = 3; }
    const [dd, mm, yy] = dateStr.split('-');
    const isoDate = `${2000 + parseInt(yy)}-${mm}-${dd}`;
    const time = bl[timeIdx];

    let service = '', destination = '';
    let rest = timeIdx + 2; // default: timeIdx+1 = service line, +2 = baris setelahnya
    const l3 = bl[timeIdx + 1];
    // Baris lengkap: <service><weight><qty><DEST>+<phone>
    const full = l3.match(/^(.+?)(\d)(\d)([A-Z].+)\+\d+$/);
    if (full) {
      service = full[1];
      destination = full[4].trim();
      rest = timeIdx + 2;
    } else {
      // Destination multi-baris — service = strip 2 digit terakhir (weight+qty)
      service = l3.replace(/\d{2}$/, '');
      let i = timeIdx + 2;
      const destParts: string[] = [];
      while (i < bl.length && !bl[i].startsWith('+')) { destParts.push(bl[i]); i++; }
      destination = destParts.join(' ');
      rest = i + 1; // skip phone line
    }
    // Skip shipper: cari NIKINDO (bisa 2 atau 3 baris tergantung PDF)
    while (rest < bl.length && bl[rest] !== 'NIKINDO') rest++;
    rest++; // skip NIKINDO itu sendiri

    // Cari baris Cash untuk extract amount
    const cashIdx = bl.findIndex((l, i) => i >= rest && /Cash[\d,]+\.\d/.test(l));
    const cashLine = cashIdx >= 0 ? bl[cashIdx] : '';
    const amtM = cashLine.match(/Cash([\d,]+)\.00/);
    const amount = amtM ? parseInt(amtM[1].replace(/,/g, '')) : 0;

    // Teks sebelum angka pertama di baris Cash (bisa berisi barang/penerima yang menyatu)
    const cashPrefixM = cashLine.match(/^([^0-9]*)/);
    const cashPrefix = cashPrefixM ? cashPrefixM[1].trim() : '';
    const middleLines = cashIdx > 0 ? bl.slice(rest, cashIdx) : [];

    let receiver_name = '', goods = '';
    if (!cashPrefix) {
      // Case A: baris Cash murni angka — middleLines = penerima + barang, split tengah (ceil)
      const half = Math.ceil(middleLines.length / 2);
      receiver_name = middleLines.slice(0, half).join(' ');
      goods = middleLines.slice(half).join(' ');
    } else if (middleLines.length === 0) {
      // Case B: penerima+barang menyatu di baris Cash — split dengan kata barang di akhir
      const gMatch = cashPrefix.match(
        /(BATERAI|LENSA KAMERA|KAMERA|LENSA|FLASH|CHARGER|TRIPOD|MEMORY CARD|MEMORY|CARD|AKSESORIS|FILTER|HOOD|STRAP|CASE|REMOTE|GRIP|SPEEDLIGHT|SOFTBOX|STAND|CABLE|CLEANING KIT|KIT|SET|BUNDLE|BAG|TAS)$/,
      );
      if (gMatch) {
        goods = gMatch[1];
        receiver_name = cashPrefix.slice(0, cashPrefix.length - goods.length).trim();
      } else {
        receiver_name = cashPrefix;
        goods = '';
      }
    } else {
      // Case C: cashPrefix = barang saja, middleLines = semua baris penerima
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
