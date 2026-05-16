import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(7000),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Google auth gagal');
  return data.access_token;
}

// Parse hasil OCR text → cari field produk Nikon dari nota
function parseNota(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const full  = lines.join(' ');

  // Nomor seri: biasanya 8–15 karakter alfanumerik, sering didahului kata
  const snMatch = full.match(/(?:S\/N|SN|No[.\s]+Seri|Serial|Nomor\s+Seri)[:\s#]+([A-Z0-9]{6,15})/i)
    || full.match(/\b([A-Z]{1,3}[0-9]{5,12})\b/);
  const nomor_seri = snMatch?.[1] || '';

  // Tipe barang: cari kata kunci Nikon
  const nikonMatch = full.match(/(?:Nikon\s+)?(?:Z\s*\d+|D\d+|COOLPIX|Zfc|Zf|Z5|Z6|Z7|Z8|Z9|Z50|Z30|J\d)(?:\s+[\w\d]+)*/i);
  const tipe_barang = nikonMatch?.[0]?.trim() || '';

  // Tanggal: cari format dd/mm/yyyy, dd-mm-yyyy, atau dd Mmm yyyy
  const tglMatch = full.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
  ) || full.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[a-z]*[.\s,]+(\d{4})/i);
  let tanggal_pembelian = '';
  if (tglMatch) {
    if (tglMatch[0].includes('/') || tglMatch[0].includes('-')) {
      const [, d, m, y] = tglMatch;
      const year = y.length === 2 ? '20' + y : y;
      tanggal_pembelian = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Nama toko: cari di awal text (biasanya baris pertama atau kedua)
  const tokoLine = lines.find(l =>
    /toko|store|shop|camera|foto|photo|optik|distributor|dealer/i.test(l) && l.length < 60
  ) || lines[0] || '';
  const nama_toko = tokoLine.length > 5 ? tokoLine : '';

  return { nomor_seri, tipe_barang, tanggal_pembelian, nama_toko };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('foto') as File | null;
    if (!file) return NextResponse.json({ error: 'File foto wajib disertakan' }, { status: 400 });

    // Convert file ke base64
    const arrayBuffer = await file.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString('base64');
    const mimeType    = file.type || 'image/jpeg';

    // Panggil Google Vision API
    const accessToken = await getAccessToken();
    const visionRes   = await fetch(
      'https://vision.googleapis.com/v1/images:annotate',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
            imageContext: { languageHints: ['id', 'en'] },
          }],
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!visionRes.ok) {
      const errBody = await visionRes.text();
      // Jika Vision API tidak diaktifkan, kembalikan hasil kosong (bukan error fatal)
      if (errBody.includes('API has not been used') || errBody.includes('disabled')) {
        return NextResponse.json({
          success: false,
          reason: 'Google Vision API belum diaktifkan di project ini. Aktifkan di Google Cloud Console → APIs & Services → Vision API.',
          extracted: { nomor_seri: '', tipe_barang: '', tanggal_pembelian: '', nama_toko: '' },
        });
      }
      throw new Error(`Vision API error: ${errBody.slice(0, 200)}`);
    }

    const visionData = await visionRes.json();
    const rawText: string = visionData.responses?.[0]?.fullTextAnnotation?.text || '';

    if (!rawText) {
      return NextResponse.json({
        success: false,
        reason: 'Tidak ada teks terdeteksi di foto. Pastikan foto jelas dan tidak buram.',
        extracted: { nomor_seri: '', tipe_barang: '', tanggal_pembelian: '', nama_toko: '' },
      });
    }

    const extracted = parseNota(rawText);

    return NextResponse.json({
      success: true,
      raw_text: rawText.slice(0, 2000),
      extracted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
