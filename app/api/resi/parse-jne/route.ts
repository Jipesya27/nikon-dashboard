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

    const [dd, mm, yy] = bl[1].split('-');
    const isoDate = `${2000 + parseInt(yy)}-${mm}-${dd}`;
    const time = bl[2];

    let service = '', destination = '';
    let rest = 4;
    const l3 = bl[3];
    // Baris lengkap: <service><weight><qty><DEST>+<phone>
    const full = l3.match(/^(.+?)(\d)(\d)([A-Z].+)\+\d+$/);
    if (full) {
      service = full[1];
      destination = full[4].trim();
      rest = 4;
    } else {
      // Destination multi-baris — service = strip 2 digit terakhir (weight+qty)
      service = l3.replace(/\d{2}$/, '');
      let i = 4;
      const destParts: string[] = [];
      while (i < bl.length && !bl[i].startsWith('+')) { destParts.push(bl[i]); i++; }
      destination = destParts.join(' ');
      rest = i + 1; // skip phone line
    }
    rest += 2; // skip '11 PT ALTA' + 'NIKINDO' (shipper constant)

    // Cari baris Cash untuk extract amount
    const cashIdx = bl.findIndex((l, i) => i >= rest && /Cash[\d,]+\.\d/.test(l));
    const cashLine = cashIdx >= 0 ? bl[cashIdx] : '';
    const amtM = cashLine.match(/Cash([\d,]+)\.00/);
    const amount = amtM ? parseInt(amtM[1].replace(/,/g, '')) : 0;

    // pdf-parse memproses kolom kiri dulu lalu kolom kanan, sehingga
    // middleLines = [receiver baris...] + [goods baris...] dengan jumlah sama.
    // Split di tengah untuk memisahkan penerima dan barang.
    const middleLines = cashIdx > 0 ? bl.slice(rest, cashIdx) : [];
    const half = Math.floor(middleLines.length / 2);
    const receiver_name = middleLines.slice(0, half).join(' ');
    const goods = middleLines.slice(half).join(' ');

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
