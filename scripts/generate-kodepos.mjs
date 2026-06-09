/**
 * Generate kodepos-map.json dari SQL wilayah_kodepos cahyadsn
 * Jalankan: node scripts/generate-kodepos.mjs
 * Output:   public/kodepos/kodepos-map.json  (format: {"1101012001":"23773", ...})
 *
 * Key = kode BPS tanpa titik (sama dengan kel.id dari ibnux API)
 * Value = kodepos 5 digit
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = join(__dirname, '..', 'public', 'kodepos');

const SOURCE =
  'https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/master/db/wilayah_kodepos.sql';

async function main() {
  console.log('⬇  Mengunduh SQL wilayah_kodepos...');

  let sql;
  try {
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    sql = await res.text();
  } catch (e) {
    console.error('❌ Gagal download:', e.message);
    process.exit(1);
  }

  console.log(`✓  ${(sql.length / 1024).toFixed(0)} KB downloaded`);

  // Parse baris: ('11.01.01.2001', '23773'),
  const map = {};
  const re = /\('([\d.]+)',\s*'(\d{5})'\)/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const bpsCode = m[1].replace(/\./g, '');   // "11.01.01.2001" → "1101012001"
    const kodepos = m[2];
    map[bpsCode]  = kodepos;
  }

  const count = Object.keys(map).length;
  console.log(`✓  ${count.toLocaleString()} entri kodepos diparsing`);

  mkdirSync(OUT_DIR, { recursive: true });

  const json    = JSON.stringify(map);
  const outPath = join(OUT_DIR, 'kodepos-map.json');
  writeFileSync(outPath, json);

  const kb = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`\n✅ Selesai!  →  public/kodepos/kodepos-map.json  (${kb} KB)`);
}

main();
