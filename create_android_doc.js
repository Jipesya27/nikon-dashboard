const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, Header, Footer, LevelFormat
} = require('docx');
const fs = require('fs');

// ── helpers ──────────────────────────────────────────────────────────────────
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// A4 content width with 2cm margins: 11906 - 2*1134 = 9638 DXA
const CONTENT_W = 9638;

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, ...opts })] });
}
function spacer() {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun(text)],
    spacing: { after: 60 },
  });
}
function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    children: [new TextRun(text)],
    spacing: { after: 60 },
  });
}
function code(text) {
  // Code block: monospace, light gray bg-ish via shade, left indent
  return new Paragraph({
    indent: { left: 360 },
    spacing: { after: 40, before: 40 },
    children: [new TextRun({ text, font: 'Courier New', size: 16, color: '1F2937' })],
  });
}
function codeLines(lines) {
  return lines.map(l => code(l));
}

function makeTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        borders: BORDERS,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: '2563EB', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })],
      })
    ),
  });
  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          borders: BORDERS,
          width: { size: colWidths[ci], type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? 'F8FAFF' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18 })] })],
        })
      ),
    })
  );
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

function sectionDivider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FFE500', space: 4 } },
    children: [],
    spacing: { before: 200, after: 200 },
  });
}

// ── DOCUMENT CONTENT ──────────────────────────────────────────────────────────
const children = [

  // ── TITLE ──
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    shading: { fill: 'FFE500', type: ShadingType.CLEAR },
    spacing: { before: 0, after: 200 },
    children: [
      new TextRun({ text: 'Nikon Dashboard', bold: true, size: 40, color: '000000' }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: 'Ringkasan Proyek untuk Android Developer', size: 26, color: '374151' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: 'Dokumen ini memuat skema database, logika API, user flow, dan panduan UI/UX', size: 20, italics: true, color: '6B7280' })],
  }),

  // ── STACK ──
  h1('Stack & Konteks'),
  makeTable(
    ['Item', 'Detail'],
    [
      ['Web Framework', 'Next.js (App Router) + React 19 + TypeScript'],
      ['Database', 'Supabase (PostgreSQL)'],
      ['Auth', 'Cookie-based JWT (admin_session + karyawan_identity), bcrypt password'],
      ['File Storage', 'Google Drive (OAuth2 refresh token)'],
      ['Notifikasi', 'WhatsApp Business API (Meta Cloud API), SMTP email'],
      ['Chatbot', 'Supabase Edge Functions (Deno)'],
      ['Brand Color', 'Nikon Yellow #FFE500'],
      ['Deploy', 'Vercel (frontend) + Supabase (edge functions via GitHub Actions)'],
    ],
    [2800, 6838]
  ),
  spacer(),

  // ── SECTION 1 ──
  sectionDivider(),
  h1('1. SKEMA DATABASE'),
  spacer(),

  // karyawan
  h2('1.1  karyawan — Staff Internal / Admin'),
  ...codeLines([
    'CREATE TABLE karyawan (',
    '  id_karyawan   UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
    '  username      TEXT UNIQUE NOT NULL,',
    "  password      TEXT NOT NULL,               -- bcrypt hash",
    '  nama_karyawan TEXT NOT NULL,',
    "  role          TEXT NOT NULL,               -- 'Super Admin'|'Admin'|'Customer Service'|",
    "                                             --   'Marketing'|'Finance'|'Karyawan'",
    '  status_aktif  BOOLEAN DEFAULT true,',
    "  akses_halaman TEXT[] DEFAULT '{}',         -- tab yang boleh diakses",
    '  nomor_wa      TEXT,',
    '  created_at    TIMESTAMPTZ DEFAULT now()',
    ');',
  ]),
  spacer(),

  // konsumen
  h2('1.2  konsumen — Pelanggan (WA & Web Chat)'),
  ...codeLines([
    'CREATE TABLE konsumen (',
    "  nomor_wa           TEXT PRIMARY KEY,   -- '62xxx' (WA) atau 'WEB-{sessionId}' (web)",
    '  id_konsumen        UUID DEFAULT gen_random_uuid(),',
    '  nama_lengkap       TEXT,',
    '  status_langkah     TEXT,               -- state chatbot',
    '  alamat_rumah       TEXT,',
    '  nik                TEXT,',
    '  kelurahan          TEXT,',
    '  kecamatan          TEXT,',
    '  kabupaten_kotamadya TEXT,',
    '  provinsi           TEXT,',
    '  kodepos            TEXT,',
    '  created_at         TIMESTAMPTZ DEFAULT now()',
    ');',
  ]),
  spacer(),

  // riwayat_pesan
  h2('1.3  riwayat_pesan — Log Pesan WA & Web'),
  ...codeLines([
    'CREATE TABLE riwayat_pesan (',
    '  id_pesan        UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
    '  nomor_wa        TEXT REFERENCES konsumen(nomor_wa),',
    '  nama_profil_wa  TEXT,',
    "  arah_pesan      TEXT CHECK (arah_pesan IN ('IN','OUT','IN_WEB','OUT_WEB')),",
    '  isi_pesan       TEXT,',
    '  waktu_pesan     TIMESTAMPTZ DEFAULT now(),',
    '  bicara_dengan_cs BOOLEAN DEFAULT false,',
    '  url_media       TEXT,',
    "  jenis_pesan     TEXT CHECK (jenis_pesan IN ('chat','system','bot'))",
    ');',
  ]),
  spacer(),

  // claim_promo
  h2('1.4  claim_promo — Klaim Promo Produk'),
  ...codeLines([
    'CREATE TABLE claim_promo (',
    '  id_claim              UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
    '  nomor_wa              TEXT REFERENCES konsumen(nomor_wa),',
    '  nama_pendaftar        TEXT,',
    '  nomor_seri            TEXT NOT NULL,',
    '  tipe_barang           TEXT,',
    '  tanggal_pembelian     DATE,',
    '  nama_toko             TEXT,',
    '  jenis_promosi         TEXT,',
    '  validasi_by_mkt       TEXT,',
    '  validasi_by_fa        TEXT,',
    '  catatan_mkt           TEXT,',
    '  catatan_fa            TEXT,',
    '  nama_jasa_pengiriman  TEXT,',
    '  nomor_resi            TEXT,',
    '  resi_sent_at          TIMESTAMPTZ,',
    "  link_nota_pembelian   TEXT,   -- Google Drive URL",
    "  link_kartu_garansi    TEXT,   -- Google Drive URL",
    '  alamat_pengiriman     TEXT,',
    '  kelurahan_pengiriman  TEXT,',
    '  kecamatan_pengiriman  TEXT,',
    '  kabupaten_pengiriman  TEXT,',
    '  provinsi_pengiriman   TEXT,',
    '  kodepos_pengiriman    TEXT,',
    "  tanggal_cetak         TEXT[] DEFAULT '{}',",
    '  created_at            TIMESTAMPTZ DEFAULT now()',
    ');',
  ]),
  spacer(),
  p('Status warna claim (computed dari data, bukan kolom DB):', { bold: true }),
  bullet('Putih = Belum Ditinjau'),
  bullet('Orange = Hold'),
  bullet('Biru = Tunggu FA'),
  bullet('Pink = Tunggu Resi (nomor_resi kosong)'),
  bullet('Merah = Tidak Valid'),
  bullet('Teal = Resi Terkirim (nomor_resi terisi)'),
  spacer(),

  // garansi
  h2('1.5  garansi — Registrasi Garansi'),
  ...codeLines([
    'CREATE TABLE garansi (',
    '  id_garansi        UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
    '  id_claim          UUID REFERENCES claim_promo(id_claim),  -- optional',
    '  nomor_wa          TEXT REFERENCES konsumen(nomor_wa),',
    '  nama_pendaftar    TEXT,',
    '  nomor_seri        TEXT NOT NULL,',
    '  tipe_barang       TEXT,',
    '  tanggal_pembelian DATE,',
    '  nama_toko         TEXT,',
    "  status_validasi   TEXT,  -- 'Belum Divalidasi'|'Valid'|'Tidak Valid'",
    "  jenis_garansi     TEXT CHECK (jenis_garansi IN ('Jasa 30%','1 Tahun','Extended 2 Years')),",
    "  lama_garansi      TEXT,  -- '0 Tahun'|'1 Tahun'|'2 Tahun'",
    '  link_kartu_garansi  TEXT,',
    '  link_nota_pembelian TEXT,',
    '  created_at        TIMESTAMPTZ DEFAULT now()',
    ');',
  ]),
  spacer(),

  // events
  h2('1.6  events — Master Event / Workshop'),
  ...codeLines([
    'CREATE TABLE events (',
    '  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
    '  event_title              TEXT NOT NULL,',
    "  event_date               TEXT,   -- format 'DD Mon YYYY', e.g. '05 Jun 2026'",
    '  event_time               TEXT,',
    '  event_location           TEXT,',
    '  event_price              TEXT,',
    "  event_image              TEXT,   -- Google Drive URL",
    '  event_partisipant_stock  INT,',
    "  event_status             TEXT CHECK (event_status IN ('In stock','Out of stock','close')),",
    '  event_description        TEXT,',
    "  event_payment_tipe       TEXT CHECK (event_payment_tipe IN ('regular','deposit','gratis')),",
    '  event_speaker            TEXT,',
    '  event_speaker_genre      TEXT,',
    '  deposit_amount           TEXT,',
    '  bank_info                TEXT,',
    '  wa_group_link            TEXT,',
    "  display_start_date       DATE,   -- kartu event mulai tampil",
    "  registration_open_date   DATE,   -- form pendaftaran aktif",
    "  registration_close_date  DATE,   -- pendaftaran tutup",
    '  created_at               TIMESTAMPTZ DEFAULT now()',
    ');',
  ]),
  spacer(),

  // event_registrations
  h2('1.7  event_registrations — Peserta Event'),
  ...codeLines([
    'CREATE TABLE event_registrations (',
    '  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
    '  event_id                    UUID REFERENCES events(id),',
    '  event_name                  TEXT,',
    '  nama_lengkap                TEXT,',
    '  nomor_wa                    TEXT,',
    '  email                       TEXT,',
    '  kabupaten_kotamadya         TEXT,',
    '  tipe_kamera                 TEXT,',
    "  payment_type                TEXT CHECK (payment_type IN ('regular','deposit','gratis')),",
    "  status_pendaftaran          TEXT CHECK (status_pendaftaran IN",
    "                              ('menunggu_validasi','terdaftar','ditolak')),",
    '  rejection_reason            TEXT,',
    "  bukti_transfer_url          TEXT,  -- Google Drive URL",
    "  ticket_url                  TEXT,  -- Google Drive PDF URL",
    '  is_attended                 BOOLEAN DEFAULT false,',
    '  attended_at                 TIMESTAMPTZ,',
    '  attended_by                 TEXT,',
    '  nama_bank                   TEXT,',
    '  no_rekening                 TEXT,',
    '  nama_pemilik_rekening       TEXT,',
    "  status_pengembalian_deposit TEXT,  -- 'requested'|'Processed'",
    '  bukti_pengembalian_deposit  TEXT,',
    '  catatan_validasi            TEXT,',
    '  created_at                  TIMESTAMPTZ DEFAULT now()',
    ');',
    "-- QR code format: 'NIKON-EVT|{id}|{event_title}'",
  ]),
  spacer(),

  // peminjaman_barang
  h2('1.8  peminjaman_barang — Peminjaman Aset'),
  ...codeLines([
    'CREATE TABLE peminjaman_barang (',
    '  id_peminjaman                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
    '  kode_peminjaman                TEXT,',
    '  nomor_wa_peminjam              TEXT REFERENCES konsumen(nomor_wa),',
    '  nama_peminjam                  TEXT,',
    '  items_dipinjam                 JSONB,',
    '  tanggal_peminjaman             DATE,',
    '  tanggal_estimasi_pengembalian  DATE,',
    '  tanggal_pengembalian           DATE,',
    "  status_peminjaman              TEXT CHECK (status_peminjaman IN ('aktif','partial','selesai')),",
    '  reminder_sent_at               TIMESTAMPTZ,',
    '  created_at                     TIMESTAMPTZ DEFAULT now()',
    ');',
  ]),
  p('Struktur item dalam JSONB items_dipinjam:', { bold: true }),
  code('{ nama_barang, nomor_seri, accs1..accs7, catatan, catatan_pengembalian,'),
  code('  accs_returned: string[], status_pengembalian: "dipinjam"|"dikembalikan" }'),
  spacer(),

  // tabel-tabel lain
  h2('1.9  Tabel Pendukung Lainnya'),
  makeTable(
    ['Tabel', 'Fungsi', 'Kolom Kunci'],
    [
      ['barang_aset', 'Inventori aset/peralatan', 'id, nama_barang_aset, no_seri_aset, accs1..accs7'],
      ['status_service', 'Antrian servis kamera', 'id_service, nomor_tanda_terima, nomor_seri, status_service'],
      ['expense_claim', 'Klaim biaya operasional staf', 'id, status (draft/submitted/approved/rejected), items JSONB, total_nominal'],
      ['resi_pengiriman', 'Data resi JNE dari PDF', 'id, cnote_no, service, tujuan, penerima, barang, ongkir'],
      ['promosi', 'Master promo aktif', 'id_promo, nama_promo, tipe_produk JSONB, tanggal_mulai, tanggal_selesai'],
      ['pengaturan_bot', 'Konfigurasi chatbot WA', 'id, nama_pengaturan, url_file, description'],
      ['autocomplete_items', 'Saran isian form', 'id, field_key, value, hidden'],
      ['budget_approval', 'Proposal anggaran event', 'id_budget, proposal_no, items JSONB, linked_event_id FK→events'],
      ['data_log', 'Audit log aksi admin', 'id, user_name, action, table_name, record_id, new_values JSONB'],
    ],
    [2400, 2600, 4638]
  ),
  spacer(),

  // Relasi
  h2('1.10  Relasi Antar Tabel'),
  ...codeLines([
    'konsumen (nomor_wa)',
    '  |-- riwayat_pesan.nomor_wa           [1:N]',
    '  |-- claim_promo.nomor_wa             [1:N]',
    '  |-- garansi.nomor_wa                 [1:N]',
    '  +-- peminjaman_barang.nomor_wa_peminjam [1:N]',
    '',
    'claim_promo.id_claim  -->  garansi.id_claim          [1:1 optional]',
    'events.id             -->  event_registrations.event_id [1:N]',
    'budget_approval.linked_event_id --> events.id         [1:1 optional]',
    'affiliate.id          -->  affiliate_skema.affiliate_id [1:N]',
    'affiliate.id          -->  affiliate_penjualan.affiliate_id [1:N]',
  ]),
  spacer(),

  // ── SECTION 2 ──
  sectionDivider(),
  h1('2. LOGIKA UTAMA & QUERY'),
  spacer(),

  h2('2.1  Login Admin (Karyawan)'),
  makeTable(
    ['Item', 'Detail'],
    [
      ['Endpoint', 'POST /api/auth/karyawan-login'],
      ['Body', '{ username: String, password: String }'],
      ['Response OK', '{ success: true, karyawan: { id_karyawan, username, nama_karyawan, role, akses_halaman[] } }'],
      ['Cookie set', 'admin_session (JWT) + karyawan_identity (JWT identity)'],
      ['Error 401', 'Username/password salah'],
      ['Error 403', 'Akun dinonaktifkan'],
      ['Error 429', 'Rate limit: max 10 percobaan per 15 menit'],
    ],
    [2400, 7238]
  ),
  spacer(),
  p('Alur Server:', { bold: true }),
  numbered('Cari karyawan by username dari tabel karyawan'),
  numbered('bcrypt.compare(password, karyawan.password)'),
  numbered('Jika password plaintext lama → auto-migrate ke bcrypt saat login berhasil'),
  numbered('Set admin_session cookie (rolling session, renewed setiap 90 detik)'),
  spacer(),

  h2('2.2  Cek Sesi (Auto-renew)'),
  ...codeLines([
    'GET /api/admin/auth',
    'Response: { ok: true } atau HTTP 401',
    '-- Dipanggil setiap 90 detik agar sesi tetap aktif',
  ]),
  spacer(),

  h2('2.3  Baca Data — sbRead Pattern'),
  ...codeLines([
    'POST /api/admin/sb-read',
    '{',
    '  "table": "claim_promo",',
    '  "select": "id_claim,nama_pendaftar,nomor_seri,validasi_by_mkt",',
    '  "filters": [',
    '    { "col": "validasi_by_mkt", "op": "eq", "val": "Belum Ditinjau" }',
    '  ],',
    '  "order": { "col": "created_at", "ascending": false },',
    '  "limit": 50,',
    '  "offset": 0,',
    '  "count": true',
    '}',
    '// Response: { data: [...], count: 120, error: null }',
    '// Operator: eq, neq, gte, lte, gt, lt, like, ilike, in',
  ]),
  spacer(),

  h2('2.4  Tulis Data — sbWrite Pattern'),
  ...codeLines([
    'POST /api/admin/sb-write  (butuh cookie admin_session)',
    '',
    '// Insert',
    '{ "table": "garansi", "action": "insert",',
    '  "payload": { "nomor_seri": "...", "tipe_barang": "..." } }',
    '',
    '// Update',
    '{ "table": "claim_promo", "action": "update",',
    '  "payload": { "validasi_by_mkt": "Valid" },',
    '  "match": { "id_claim": "uuid" } }',
    '',
    '// Delete',
    '{ "table": "barang_aset", "action": "delete",',
    '  "match": { "id": "uuid" } }',
    '',
    '// Response: { data: [...], error: null }',
  ]),
  spacer(),

  h2('2.5  Daftar Event Publik'),
  ...codeLines([
    'GET /api/events/register',
    '//',
    '// Response:',
    '{',
    '  "events": [',
    '    {',
    '      "id": "uuid",',
    '      "event_title": "Workshop Fotografi",',
    '      "event_date": "05 Jun 2026",',
    '      "event_time": "09.00 WIB - Selesai",',
    '      "event_location": "Studio TV, ISBI Bandung",',
    '      "event_price": "Rp 150.000",',
    '      "event_status": "In stock",',
    '      "event_payment_tipe": "regular",',
    '      "event_speaker": "Aditya Key",',
    '      "registration_not_open": false,',
    '      "banner_hidden": false',
    '    }',
    '  ],',
    '  "pastEvents": []',
    '}',
    '// banner_hidden=true          → event belum boleh tampil di publik',
    '// registration_not_open=true  → tampilkan "Segera Hadir", tombol daftar disabled',
  ]),
  spacer(),

  h2('2.6  Submit Registrasi Event'),
  ...codeLines([
    'POST /api/events/register',
    'Content-Type: multipart/form-data',
    '',
    'Fields:',
    '  event_id, event_name, nama_lengkap, nomor_wa, email,',
    '  kabupaten_kotamadya, tipe_kamera, payment_type,',
    '  bukti_transfer (File — di-skip jika payment_type=gratis)',
    '',
    'Response: { success: true, message: "..." } atau { error: "..." }',
    'Side effect: upload bukti ke Google Drive, insert event_registrations, kirim WA',
  ]),
  spacer(),

  h2('2.7  API Penting Lainnya'),
  makeTable(
    ['Endpoint', 'Method', 'Fungsi'],
    [
      ['POST /api/events/validate-payment', 'POST', 'Approve/reject registrasi event (admin)'],
      ['POST /api/events/attendance', 'POST', 'Scan QR absensi: { qr_data: "NIKON-EVT|uuid|title" }'],
      ['GET /api/cek-status?serial=XXX', 'GET', 'Cek status klaim/garansi by nomor seri (publik)'],
      ['POST /api/admin/send-wa', 'POST', 'Kirim WA free-form atau template ke nomor konsumen'],
      ['POST /api/claim', 'POST', 'Submit klaim promo baru (publik, multipart)'],
      ['POST /api/garansi', 'POST', 'Submit registrasi garansi baru (publik, multipart)'],
      ['GET /api/drive-file?id={id}', 'GET', 'Proxy baca file Google Drive (hindari CORS)'],
    ],
    [3800, 1200, 4638]
  ),
  spacer(),

  // ── SECTION 3 ──
  sectionDivider(),
  h1('3. ALUR PENGGUNA (USER FLOW)'),
  spacer(),

  h2('3.1  Pengguna Publik (Konsumen)'),
  makeTable(
    ['Halaman / Fitur', 'URL', 'Fungsi'],
    [
      ['Landing Page', '/nikon', 'Halaman utama brand Nikon + scroll reveal animations'],
      ['Chat Web Widget', '/nikon (floating)', 'Chatbot WA-style: menu 1-10 (Claim, Garansi, Service, Promo, Event, CS, dll)'],
      ['Form Klaim Promo', '/nikon/form-claim', 'Step 1: Data Diri → Step 2: Upload Dok (OCR auto-fill) → Step 3: Data Produk'],
      ['Form Daftar Garansi', '/nikon/form-garansi', 'Alur 3-step sama seperti Klaim Promo'],
      ['Cek Status', '/nikon (modal)', 'Input nomor seri → tampil status klaim + garansi'],
      ['Daftar Event', '/events/register', 'Grid event aktif + event selesai (grayscale), tombol Daftar'],
      ['Form Registrasi Event', '/events/register#form', 'Isi data diri + upload bukti bayar → submit → tunggu approval admin'],
      ['Upload Foto Lomba', '/nikon/upload-lomba', 'Dropdown event, input akun IG, upload max 10 foto ke Google Drive'],
    ],
    [2800, 2400, 4438]
  ),
  spacer(),
  p('Alur Lengkap Event:', { bold: true }),
  numbered('Konsumen buka /events/register → pilih event → klik Daftar'),
  numbered('Isi form registrasi + upload bukti bayar'),
  numbered('Server insert event_registrations (status: menunggu_validasi)'),
  numbered('WA konfirmasi otomatis dikirim ke konsumen'),
  numbered('Admin approve/reject di dashboard'),
  numbered('Approve: generate PDF tiket → upload Drive → kirim WA tiket ke konsumen'),
  spacer(),

  h2('3.2  Admin / Staf Internal'),
  makeTable(
    ['Tab / Halaman', 'Akses', 'Fungsi Utama'],
    [
      ['Login', '/admin/login', 'Password admin atau username+password karyawan'],
      ['Tab Pesan', 'Dashboard', 'Daftar kontak WA, thread pesan, balas free-form atau quick reply "/" shortcut'],
      ['Tab Konsumen', 'Dashboard', 'Daftar pelanggan, edit data diri, lihat riwayat chatbot'],
      ['Tab Klaim', 'Dashboard', 'Tabel klaim, filter per kolom, validasi MKT/FA, input resi, cetak label, export CSV'],
      ['Tab Garansi', 'Dashboard', 'Tabel garansi, validasi status, split-view edit (form + preview dokumen)'],
      ['Tab Service', 'Dashboard', 'Antrian servis kamera, update status'],
      ['Tab Event - Proposal', 'Dashboard', 'Buat/edit proposal anggaran → auto-buat event di Supabase'],
      ['Tab Event - Daftar Event', 'Dashboard', 'Kelola master event (CRUD)'],
      ['Tab Event - Data Peserta', 'Dashboard', 'Filter per event, approve/reject, blast WA ke semua peserta'],
      ['Tab Event - Claim Biaya', 'Dashboard', 'Form klaim biaya operasional staf (draft→submit→approved)'],
      ['Tab Peminjaman', 'Dashboard', 'Buat peminjaman, catat pengembalian full/partial, generate PDF + kirim WA'],
      ['Tab Affiliate', 'Dashboard', 'Kelola mitra affiliate, skema komisi, pencatatan penjualan'],
      ['Tab Bot Settings', 'Dashboard', 'Kelola URL file promo, teks chatbot, quick reply CS'],
      ['Tab WA Templates', 'Dashboard', 'Kelola template Meta WhatsApp Business (CRUD)'],
      ['/admin/events', 'admin_events', 'Validasi pembayaran event + export CSV peserta'],
      ['/admin/events/attendance', 'admin_attendance', 'Scan QR absensi + nomor urut kehadiran'],
      ['/admin/events/deposit', 'admin_deposit', 'Proses refund deposit peserta'],
    ],
    [3200, 1800, 4638]
  ),
  spacer(),

  // ── SECTION 4 ──
  sectionDivider(),
  h1('4. TAMPILAN (UI/UX)'),
  spacer(),

  h2('4.1  Warna & Tema'),
  makeTable(
    ['Token', 'Nilai Hex', 'Penggunaan'],
    [
      ['Nikon Yellow', '#FFE500', 'Primary button, highlight, brand — WAJIB dipakai sebagai warna aksen utama'],
      ['Background', '#FFFFFF / #F9FAFB', 'Light mode only — tidak ada dark mode'],
      ['Chat OUT bubble', '#DCF8C6', 'Pesan terkirim (WA green style)'],
      ['Chat IN bubble', '#FFFFFF + border', 'Pesan masuk dari konsumen'],
      ['Web chat user bubble', '#FFE000', 'Bubble user di web chat widget'],
      ['Text primary', '#111827 / #1F2937', 'gray-900 / zinc-800'],
      ['Accent blue', '#2563EB', 'Selection highlight, link aktif, badge filter'],
      ['Success', '#059669 (emerald)', 'Status valid, terdaftar, hadir'],
      ['Warning', '#D97706 / #F97316', 'Pending, hold, partial'],
      ['Danger', '#DC2626 (red)', 'Ditolak, error'],
    ],
    [2600, 2200, 4838]
  ),
  spacer(),

  h2('4.2  Komponen UI Utama'),
  makeTable(
    ['Komponen', 'Deskripsi'],
    [
      ['Sidebar Admin', 'Navbar kiri fixed, emoji ikon per tab, counter badge merah untuk item actionable (hanya muncul jika > 0)'],
      ['Tabel Data', 'Scroll horizontal (min-width 1200px), border kiri warna status, baris highlight biru saat dipilih, filter row di thead'],
      ['Card View', 'Grid 3 kolom, ringkasan per item, badge status, tombol aksi teks/link'],
      ['Modal Edit', 'Overlay centered; mode split-view: form kanan + preview dokumen Drive di kiri dengan zoom wheel'],
      ['Badge Status', 'rounded-md chip — bukan pill (rounded-full). Warna sesuai status domain'],
      ['Form Publik', 'Step wizard 3 langkah dengan progress indicator dan validasi per step'],
      ['Web Chat Widget', 'Floating button kuning kanan bawah (z-60), panel slide-up, bubble chat WA-style'],
      ['Quick Reply', 'Ketik "/" di input admin → dropdown shortcut dari pengaturan_bot prefix quick_reply:'],
    ],
    [2800, 6838]
  ),
  spacer(),

  h2('4.3  Catatan Penting untuk Android Developer'),
  makeTable(
    ['#', 'Catatan', 'Detail'],
    [
      ['1', 'Auth / Session', 'Semua API admin butuh cookie admin_session (JWT). Di Android: gunakan CookieJar OkHttp atau simpan token di DataStore/EncryptedSharedPreferences.'],
      ['2', 'Google Drive URL', 'URL Drive TIDAK bisa di-render langsung (CORS). Selalu proxy via /api/drive-file?id={driveId} atau /api/events/image?id={driveId}.'],
      ['3', 'QR Code Absensi', 'Format: "NIKON-EVT|{uuid}|{event_title}". Gunakan library ML Kit Barcode Scanning untuk decode.'],
      ['4', 'Timezone', 'Semua TIMESTAMPTZ di DB disimpan UTC. Tampilkan di Android dengan ZoneId.of("Asia/Jakarta") dan append " WIB".'],
      ['5', 'event_date Format', 'Disimpan sebagai TEXT "DD Mon YYYY" (misal "05 Jun 2026") — bukan TIMESTAMPTZ. Parse manual dengan DateTimeFormatter.'],
      ['6', 'Notifikasi WA', 'Tidak perlu diimplementasi di Android — sepenuhnya ditangani server. Cukup polling REST atau Supabase Realtime WebSocket.'],
      ['7', 'File Upload', 'Semua upload (bukti transfer, kartu garansi, foto) melalui API server sebagai multipart/form-data. Android TIDAK akses Google Drive langsung.'],
      ['8', 'Supabase Direct', 'Jangan akses Supabase langsung dari Android untuk data admin — semua harus melalui proxy /api/admin/sb yang memvalidasi session.'],
    ],
    [400, 2400, 6838]
  ),
  spacer(),

  // ── SECTION 5 ──
  sectionDivider(),
  h1('5. TEMPLATE NOTIFIKASI WHATSAPP'),
  spacer(),
  p('Semua notifikasi WA menggunakan Meta Business API template. Template wajib di-approve Meta sebelum bisa dipakai.', { italics: true }),
  spacer(),
  makeTable(
    ['Template Name', 'Trigger', 'Params'],
    [
      ['notif_daftar_event', 'Pendaftaran event berbayar/deposit', '–'],
      ['notif_event_approved', 'Admin approve (tanpa link WA grup)', '{{1}}nama, {{2}}event, {{3}}url_tiket'],
      ['notif_event_approved_v2', 'Admin approve (ada link WA grup)', '{{1}}nama, {{2}}event, {{3}}tiket, {{4}}wa_group'],
      ['notif_event_blast', 'Blast ke semua peserta terdaftar', '{{1-8}}: nama, acara, tgl, jam, lokasi, speaker, tiket, wa_group'],
      ['notif_event_rejected', 'Admin reject', 'status = ditolak'],
      ['notif_event_attendance', 'Scan QR absensi berhasil', '–'],
      ['notif_deposit_refund', 'Admin proses refund deposit', 'bukti_pengembalian_deposit'],
      ['notif_garansi_received', 'Submit garansi baru', '–'],
      ['notif_garansi_approved', 'Validasi garansi = Valid', '–'],
      ['notif_claim_received', 'Submit klaim promo baru', '–'],
      ['notif_claim_approved', 'Validasi klaim = Valid', '–'],
      ['notif_lending_init_v2', 'Peminjaman aset dibuat', '{{1}}nama, {{2}}estimasi, {{3}}daftar barang, {{4}}link Drive'],
      ['notif_lending_return_v2', 'Pengembalian selesai', '{{1}}nama, {{2}}tgl kembali, {{3}}daftar barang, {{4}}link Drive'],
      ['notif_lending_reminder', 'Cron harian jatuh tempo', '{{1}}nama, {{2}}estimasi, {{3}}daftar barang'],
      ['notif_kode_akun', 'Forgot password OTP', 'kode OTP (AUTH template)'],
    ],
    [3200, 2800, 3638]
  ),
  spacer(),

  // footer note
  sectionDivider(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text: 'Dokumen ini di-generate otomatis dari kode sumber proyek Nikon Dashboard.', italics: true, color: '6B7280', size: 18 }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: 'Versi: Juni 2026  |  altanikindo.com', color: '9CA3AF', size: 18 }),
    ],
  }),
];

// ── BUILD DOCUMENT ────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 20 } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 34, bold: true, font: 'Arial', color: '1E3A5F' },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: '2563EB' },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: '374151' },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // ~2cm
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FFE500', space: 4 } },
          children: [
            new TextRun({ text: 'Nikon Dashboard  —  Ringkasan Proyek Android', size: 18, color: '6B7280' }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB', space: 4 } },
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'Hal. ', size: 16, color: '9CA3AF' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9CA3AF' }),
            new TextRun({ text: ' / ', size: 16, color: '9CA3AF' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '9CA3AF' }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = 'C:\\Users\\Jamal\\Desktop\\nikon-dashboard\\Nikon_Android_ProjectSummary.docx';
  fs.writeFileSync(outPath, buffer);
  console.log('SUCCESS: ' + outPath);
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
