/**
 * Test manual untuk endpoint /api/ocr-nota
 * Jalankan: node scripts/test-ocr.mjs
 * (pastikan dev server sudah aktif: npm run dev)
 */

const BASE_URL = 'http://localhost:3000';

// Minimal valid PNG 1x1 pixel (cukup untuk cek apakah Vision API aktif)
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ─── Unit test: parseNota (tanpa server) ────────────────────────────────────

function parseNota(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const full  = lines.join(' ');

  const snMatch = full.match(/(?:S\/N|SN|No[.\s]+Seri|Serial|Nomor\s+Seri)[:\s#]+([A-Z0-9]{6,15})/i)
    || full.match(/\b([A-Z]{1,3}[0-9]{5,12})\b/);
  const nomor_seri = snMatch?.[1] || '';

  const nikonMatch = full.match(/(?:Nikon\s+)?(?:Z\s*\d+|D\d+|COOLPIX|Zfc|Zf|Z5|Z6|Z7|Z8|Z9|Z50|Z30|J\d)(?:\s+[\w\d]+)*/i);
  const tipe_barang = nikonMatch?.[0]?.trim() || '';

  const tglMatch = full.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
    || full.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[a-z]*[.\s,]+(\d{4})/i);
  let tanggal_pembelian = '';
  if (tglMatch && (tglMatch[0].includes('/') || tglMatch[0].includes('-'))) {
    const [, d, m, y] = tglMatch;
    const year = y.length === 2 ? '20' + y : y;
    tanggal_pembelian = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const tokoLine = lines.find(l =>
    /toko|store|shop|camera|foto|photo|optik|distributor|dealer/i.test(l) && l.length < 60
  ) || lines[0] || '';
  const nama_toko = tokoLine.length > 5 ? tokoLine : '';

  return { nomor_seri, tipe_barang, tanggal_pembelian, nama_toko };
}

function runUnitTests() {
  console.log('─── Unit Test: parseNota ───────────────────────────────────');

  const sampleText = `
TOKO KAMERA JAYA
Jl. Sudirman No. 12, Jakarta
Tanggal: 10/03/2024
S/N     : AB1234567
Produk  : Nikon Z6 II Body Only
Harga   : Rp 22.500.000
`;

  const result = parseNota(sampleText);
  let passed = 0;

  function check(label, actual, expected) {
    const ok = actual === expected;
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}`);
    if (!ok) console.log(`         expected: "${expected}"  got: "${actual}"`);
    if (ok) passed++;
  }

  check('nomor_seri',        result.nomor_seri,                             'AB1234567');
  check('tipe_barang',       result.tipe_barang.startsWith('Nikon Z6') ? 'OK' : result.tipe_barang, 'OK');
  check('tanggal_pembelian', result.tanggal_pembelian,                    '2024-03-10');
  check('nama_toko',         result.nama_toko,                            'TOKO KAMERA JAYA');

  console.log(`\n  Hasil: ${passed}/4 test lolos\n`);
  return passed;
}

// ─── Integration test: panggil API ──────────────────────────────────────────

async function runApiTest() {
  console.log('─── Integration Test: POST /api/ocr-nota ───────────────────');
  console.log(`  Server : ${BASE_URL}`);

  try {
    const pngBuffer = Buffer.from(PNG_1X1_BASE64, 'base64');
    const blob      = new Blob([pngBuffer], { type: 'image/png' });
    const formData  = new FormData();
    formData.append('foto', blob, 'test-nota.png');

    console.log('  Mengirim gambar test ke /api/ocr-nota...');
    const res  = await fetch(`${BASE_URL}/api/ocr-nota`, {
      method: 'POST',
      body:   formData,
    });

    const body = await res.json();
    console.log(`  HTTP   : ${res.status}`);

    if (body.success) {
      console.log('  [PASS] OCR AKTIF — Google Vision API berhasil dipanggil');
      if (body.raw_text) console.log(`  Teks   : ${body.raw_text.slice(0, 100)}...`);
      console.log('  Extracted:', body.extracted);
    } else if (body.success === false && body.reason?.includes('belum diaktifkan')) {
      console.log('  [INFO] Vision API BELUM DIAKTIFKAN');
      console.log('  Alasan :', body.reason);
      console.log('  → Aktifkan di: Google Cloud Console → APIs & Services → Cloud Vision API');
    } else if (body.success === false) {
      console.log('  [INFO] API endpoint aktif tapi foto tidak terbaca (normal untuk gambar kosong)');
      console.log('  Alasan :', body.reason);
      console.log('  → Coba kirim foto nota asli untuk hasil nyata');
    } else if (body.error) {
      console.log('  [FAIL] Error dari server:', body.error);
    }
  } catch (err) {
    if (err?.cause?.code === 'ECONNREFUSED') {
      console.log('  [FAIL] Dev server tidak berjalan — jalankan dulu: npm run dev');
    } else {
      console.log('  [FAIL] Error:', err.message);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('\n=== TEST OCR NOTA ===\n');
const unitPassed = runUnitTests();
await runApiTest();
console.log('\n=====================\n');

if (unitPassed < 4) process.exit(1);
