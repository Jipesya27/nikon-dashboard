import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || '';

// Parse teks OCR dari kartu garansi Nikon (2 template)
function parseKartu(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const full  = lines.join(' ');

  // Nomor seri: "Serial No. 7224916" (template 2) atau "No. 7238545" (template 1)
  const snMatch = full.match(/Serial\s+No\.?\s*([0-9]{5,10})/i)
    || full.match(/(?<![A-Za-z])No\.?\s*([0-9]{5,10})/i);
  const nomor_seri = snMatch?.[1] || '';

  // Tipe barang: setelah label "Model" — format "DIGITAL CAMERA Z6II BK SG"
  const modelMatch = full.match(/\bModel\b\s*(DIGITAL\s+CAMERA\s+\w+(?:\s+\w+){0,4})/i);
  const tipe_barang = modelMatch?.[1]?.trim() || '';

  // Tanggal: cari dekat label "Tanggal Pembelian" — bisa spasi atau slash
  // Template 1: tulis tangan "28 03 2026", template 2: biasanya kosong
  const tglWithLabel = full.match(
    /(?:Tanggal\s+Pembelian|Date\s+of\s+Purchase)[^0-9]{0,40}(\d{1,2})\D+(\d{1,2})\D+(\d{4})/i
  );
  const tglGeneric = full.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  let tanggal_pembelian = '';
  const tglMatch = tglWithLabel || tglGeneric;
  if (tglMatch) {
    const [, d, m, y] = tglMatch;
    tanggal_pembelian = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Nama dealer:
  // Template 2: setelah label "Nama Dealer / Dealer's Name" → "PT. ALTA NIKINDO"
  // Template 1: stempel toko seperti "DOSS MEG ASTORE"
  const dealerLabel = full.match(
    /(?:Nama\s+Dealer|Dealer'?s\s+Name)[^A-Z]{0,15}([A-Z][A-Za-z0-9.\s&]{2,40}?)(?:\s{2,}|Tanggal|Date|Importir|$)/i
  );
  const dealerStamp = lines.find(l =>
    l.length > 3 && l.length < 50 &&
    /DOSS|ALTA\s+NIKINDO|camera|optik|foto|store|megastore/i.test(l) &&
    !/Nama|Dealer|Importir|Komplek|Pemilik|Alamat|Reg\s+Dep|Nikon/i.test(l)
  );
  const nama_toko = dealerLabel?.[1]?.trim() || dealerStamp || '';

  return { nomor_seri, tipe_barang, tanggal_pembelian, nama_toko };
}

export async function POST(req: Request) {
  try {
    if (!OCR_SPACE_API_KEY) {
      return NextResponse.json(
        { error: 'OCR_SPACE_API_KEY belum di-set di .env.local' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('foto') as File | null;
    if (!file) return NextResponse.json({ error: 'File foto wajib disertakan' }, { status: 400 });

    const ocrForm = new FormData();
    ocrForm.append('apikey', OCR_SPACE_API_KEY);
    ocrForm.append('file', file, file.name || 'kartu-garansi.jpg');
    ocrForm.append('language', 'eng');
    ocrForm.append('isOverlayRequired', 'false');
    ocrForm.append('OCREngine', '2');

    const ocrRes = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: ocrForm,
      signal: AbortSignal.timeout(30000),
    });

    if (!ocrRes.ok) {
      throw new Error(`OCR.space HTTP error: ${ocrRes.status}`);
    }

    const ocrData = await ocrRes.json();

    if (ocrData.IsErroredOnProcessing) {
      const reason = ocrData.ErrorMessage?.[0] || ocrData.ErrorDetails || 'OCR gagal memproses foto';
      return NextResponse.json({
        success: false,
        reason,
        extracted: { nomor_seri: '', tipe_barang: '', tanggal_pembelian: '', nama_toko: '' },
      });
    }

    const rawText: string = ocrData.ParsedResults?.[0]?.ParsedText || '';

    if (!rawText.trim()) {
      return NextResponse.json({
        success: false,
        reason: 'Tidak ada teks terdeteksi. Pastikan foto kartu garansi jelas dan tidak buram.',
        extracted: { nomor_seri: '', tipe_barang: '', tanggal_pembelian: '', nama_toko: '' },
      });
    }

    const extracted = parseKartu(rawText);

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
