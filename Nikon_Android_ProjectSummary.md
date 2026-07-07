# Nikon Dashboard — Ringkasan Proyek untuk Android Developer AI

> Dokumen ini memuat skema database, logika API, user flow, dan panduan UI/UX  
> untuk migrasi proyek web ke aplikasi Android native (Kotlin + Jetpack Compose).

---

## Stack & Konteks

| Item | Detail |
|---|---|
| Web Framework | Next.js (App Router) + React 19 + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Cookie-based JWT (`admin_session` + `karyawan_identity`), bcrypt password |
| File Storage | Google Drive (OAuth2 refresh token) |
| Notifikasi | WhatsApp Business API (Meta Cloud API), SMTP email |
| Chatbot | Supabase Edge Functions (Deno) |
| Brand Color | Nikon Yellow `#FFE500` |
| Deploy | Vercel (frontend) + Supabase (edge functions via GitHub Actions) |

---

## 1. SKEMA DATABASE

### 1.1 `karyawan` — Staff Internal / Admin

```sql
CREATE TABLE karyawan (
  id_karyawan   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password      TEXT NOT NULL,               -- bcrypt hash
  nama_karyawan TEXT NOT NULL,
  role          TEXT NOT NULL,               -- 'Super Admin'|'Admin'|'Customer Service'|'Marketing'|'Finance'|'Karyawan'
  status_aktif  BOOLEAN DEFAULT true,
  akses_halaman TEXT[] DEFAULT '{}',         -- tab yang boleh diakses
  nomor_wa      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 `konsumen` — Pelanggan (WA & Web Chat)

```sql
CREATE TABLE konsumen (
  nomor_wa            TEXT PRIMARY KEY,      -- '62xxx' (WA) atau 'WEB-{sessionId}' (web)
  id_konsumen         UUID DEFAULT gen_random_uuid(),
  nama_lengkap        TEXT,
  status_langkah      TEXT,                  -- state chatbot
  alamat_rumah        TEXT,
  nik                 TEXT,
  kelurahan           TEXT,
  kecamatan           TEXT,
  kabupaten_kotamadya TEXT,
  provinsi            TEXT,
  kodepos             TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 `riwayat_pesan` — Log Pesan WA & Web

```sql
CREATE TABLE riwayat_pesan (
  id_pesan         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_wa         TEXT REFERENCES konsumen(nomor_wa),
  nama_profil_wa   TEXT,
  arah_pesan       TEXT CHECK (arah_pesan IN ('IN','OUT','IN_WEB','OUT_WEB')),
  isi_pesan        TEXT,
  waktu_pesan      TIMESTAMPTZ DEFAULT now(),
  bicara_dengan_cs BOOLEAN DEFAULT false,
  url_media        TEXT,
  jenis_pesan      TEXT CHECK (jenis_pesan IN ('chat','system','bot'))
);

CREATE INDEX idx_riwayat_pesan_wa_waktu ON riwayat_pesan(nomor_wa, waktu_pesan DESC);
```

### 1.4 `claim_promo` — Klaim Promo Produk

```sql
CREATE TABLE claim_promo (
  id_claim             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_wa             TEXT REFERENCES konsumen(nomor_wa),
  nama_pendaftar       TEXT,
  nomor_seri           TEXT NOT NULL,
  tipe_barang          TEXT,
  tanggal_pembelian    DATE,
  nama_toko            TEXT,
  jenis_promosi        TEXT,
  validasi_by_mkt      TEXT,                 -- 'Belum Ditinjau'|'Valid'|'Tidak Valid'|'Hold'
  validasi_by_fa       TEXT,
  catatan_mkt          TEXT,
  catatan_fa           TEXT,
  nama_jasa_pengiriman TEXT,
  nomor_resi           TEXT,
  resi_sent_at         TIMESTAMPTZ,
  link_nota_pembelian  TEXT,                 -- Google Drive URL
  link_kartu_garansi   TEXT,                 -- Google Drive URL
  alamat_pengiriman    TEXT,
  kelurahan_pengiriman TEXT,
  kecamatan_pengiriman TEXT,
  kabupaten_pengiriman TEXT,
  provinsi_pengiriman  TEXT,
  kodepos_pengiriman   TEXT,
  tanggal_cetak        TEXT[] DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT now()
);
```

**Status warna claim** (computed dari data, bukan kolom DB):

| Warna | Kondisi |
|---|---|
| Putih | Belum Ditinjau |
| Orange | Hold |
| Biru | Tunggu FA |
| Pink | Tunggu Resi (`nomor_resi` kosong) |
| Merah | Tidak Valid |
| Teal | Resi Terkirim (`nomor_resi` terisi) |

### 1.5 `garansi` — Registrasi Garansi

```sql
CREATE TABLE garansi (
  id_garansi        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_claim          UUID REFERENCES claim_promo(id_claim),  -- optional
  nomor_wa          TEXT REFERENCES konsumen(nomor_wa),
  nama_pendaftar    TEXT,
  nomor_seri        TEXT NOT NULL,
  tipe_barang       TEXT,
  tanggal_pembelian DATE,
  nama_toko         TEXT,
  status_validasi   TEXT,   -- 'Belum Divalidasi'|'Valid'|'Tidak Valid'
  jenis_garansi     TEXT CHECK (jenis_garansi IN ('Jasa 30%','1 Tahun','Extended 2 Years')),
  lama_garansi      TEXT,   -- '0 Tahun'|'1 Tahun'|'2 Tahun'
  link_kartu_garansi  TEXT,
  link_nota_pembelian TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### 1.6 `events` — Master Event / Workshop

```sql
CREATE TABLE events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_title             TEXT NOT NULL,
  event_date              TEXT,             -- format "DD Mon YYYY", e.g. "05 Jun 2026"
  event_time              TEXT,             -- e.g. "09.00 WIB - Selesai"
  event_location          TEXT,
  event_price             TEXT,
  event_image             TEXT,             -- Google Drive URL
  event_partisipant_stock INT,
  event_status            TEXT CHECK (event_status IN ('In stock','Out of stock','close')),
  event_description       TEXT,
  event_payment_tipe      TEXT CHECK (event_payment_tipe IN ('regular','deposit','gratis')),
  event_speaker           TEXT,
  event_speaker_genre     TEXT,
  deposit_amount          TEXT,
  bank_info               TEXT,
  wa_group_link           TEXT,
  display_start_date      DATE,             -- kartu event mulai tampil di publik
  registration_open_date  DATE,             -- form pendaftaran aktif
  registration_close_date DATE,             -- pendaftaran tutup → masuk pastEvents
  created_at              TIMESTAMPTZ DEFAULT now()
);
```

### 1.7 `event_registrations` — Peserta Event

```sql
CREATE TABLE event_registrations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                    UUID REFERENCES events(id),
  event_name                  TEXT,         -- denormalized
  nama_lengkap                TEXT,
  nomor_wa                    TEXT,
  email                       TEXT,
  kabupaten_kotamadya         TEXT,
  tipe_kamera                 TEXT,
  payment_type                TEXT CHECK (payment_type IN ('regular','deposit','gratis')),
  status_pendaftaran          TEXT CHECK (status_pendaftaran IN
                              ('menunggu_validasi','terdaftar','ditolak')),
  rejection_reason            TEXT,
  bukti_transfer_url          TEXT,         -- Google Drive URL
  ticket_url                  TEXT,         -- Google Drive PDF URL
  is_attended                 BOOLEAN DEFAULT false,
  attended_at                 TIMESTAMPTZ,
  attended_by                 TEXT,
  nama_bank                   TEXT,
  no_rekening                 TEXT,
  nama_pemilik_rekening       TEXT,
  status_pengembalian_deposit TEXT,         -- 'requested'|'Processed'
  bukti_pengembalian_deposit  TEXT,
  catatan_validasi            TEXT,         -- internal admin only
  created_at                  TIMESTAMPTZ DEFAULT now()
);
-- QR code format: "NIKON-EVT|{id}|{event_title}"
```

### 1.8 `peminjaman_barang` — Peminjaman Aset

```sql
CREATE TABLE peminjaman_barang (
  id_peminjaman                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_peminjaman               TEXT,
  nomor_wa_peminjam             TEXT REFERENCES konsumen(nomor_wa),
  nama_peminjam                 TEXT,
  items_dipinjam                JSONB,      -- array PeminjamanItem (lihat di bawah)
  tanggal_peminjaman            DATE,
  tanggal_estimasi_pengembalian DATE,
  tanggal_pengembalian          DATE,
  status_peminjaman             TEXT CHECK (status_peminjaman IN ('aktif','partial','selesai')),
  reminder_sent_at              TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ DEFAULT now()
);
```

**Struktur item dalam JSONB `items_dipinjam`:**

```json
{
  "nama_barang": "Nikon Z6 III",
  "nomor_seri": "123456",
  "accs1": "Battery EN-EL15c",
  "accs2": "Charger MH-25a",
  "catatan": "body only",
  "catatan_pengembalian": "",
  "accs_returned": ["Battery EN-EL15c"],
  "status_pengembalian": "dipinjam"
}
```

### 1.9 Tabel Pendukung Lainnya

| Tabel | Fungsi | Kolom Kunci |
|---|---|---|
| `barang_aset` | Inventori aset/peralatan | `id`, `nama_barang_aset`, `no_seri_aset`, `accs1..accs7` |
| `status_service` | Antrian servis kamera | `id_service`, `nomor_tanda_terima`, `nomor_seri`, `status_service` |
| `expense_claim` | Klaim biaya operasional staf | `id`, `status` (draft/submitted/approved/rejected), `items` JSONB, `total_nominal` |
| `resi_pengiriman` | Data resi JNE dari PDF | `id`, `cnote_no`, `service`, `tujuan`, `penerima`, `barang`, `ongkir` |
| `promosi` | Master promo aktif | `id_promo`, `nama_promo`, `tipe_produk` JSONB, `tanggal_mulai`, `tanggal_selesai` |
| `pengaturan_bot` | Konfigurasi chatbot WA | `id`, `nama_pengaturan`, `url_file`, `description` |
| `autocomplete_items` | Saran isian form | `id`, `field_key`, `value`, `hidden` |
| `budget_approval` | Proposal anggaran event | `id_budget`, `proposal_no`, `items` JSONB, `linked_event_id` FK→events |
| `data_log` | Audit log aksi admin | `id`, `user_name`, `action`, `table_name`, `record_id`, `new_values` JSONB |

### 1.10 Relasi Antar Tabel

```
konsumen (nomor_wa)
  ├── riwayat_pesan.nomor_wa               [1:N]
  ├── claim_promo.nomor_wa                 [1:N]
  ├── garansi.nomor_wa                     [1:N]
  └── peminjaman_barang.nomor_wa_peminjam  [1:N]

claim_promo.id_claim    ──► garansi.id_claim              [1:1 optional]
events.id               ──► event_registrations.event_id  [1:N]
budget_approval.linked_event_id ──► events.id             [1:1 optional]
affiliate.id            ──► affiliate_skema.affiliate_id  [1:N]
affiliate.id            ──► affiliate_penjualan.affiliate_id [1:N]
```

---

## 2. LOGIKA UTAMA & QUERY

### 2.1 Login Admin (Karyawan)

**Endpoint:** `POST /api/auth/karyawan-login`

```json
// Request Body
{ "username": "admin", "password": "rahasia123" }

// Response OK
{
  "success": true,
  "karyawan": {
    "id_karyawan": "uuid",
    "username": "admin",
    "nama_karyawan": "Budi Santoso",
    "role": "Admin",
    "akses_halaman": ["messages", "claims", "warranties"]
  }
}
```

Cookie yang di-set: `admin_session` (JWT) + `karyawan_identity` (JWT identity)

| Error | Kode | Kondisi |
|---|---|---|
| Username/password salah | 401 | |
| Akun dinonaktifkan | 403 | `status_aktif = false` |
| Rate limit | 429 | Max 10 percobaan per 15 menit |

**Alur server:**
1. Cari `karyawan` by `username`
2. `bcrypt.compare(password, karyawan.password)`
3. Jika password plaintext lama → auto-migrate ke bcrypt saat login berhasil
4. Set `admin_session` cookie (rolling session, renewed setiap 90 detik)

### 2.2 Cek Sesi (Auto-renew)

```
GET /api/admin/auth
Response: { "ok": true }  atau  HTTP 401
```

> Dipanggil setiap 90 detik dari dashboard agar sesi tidak expired selama user aktif.

### 2.3 Baca Data — `sbRead` Pattern

**Endpoint:** `POST /api/admin/sb-read`

```json
{
  "table": "claim_promo",
  "select": "id_claim,nama_pendaftar,nomor_seri,validasi_by_mkt",
  "filters": [
    { "col": "validasi_by_mkt", "op": "eq", "val": "Belum Ditinjau" }
  ],
  "order": { "col": "created_at", "ascending": false },
  "limit": 50,
  "offset": 0,
  "count": true
}
```

```json
// Response
{ "data": [...], "count": 120, "error": null }
```

**Operator filter:** `eq`, `neq`, `gte`, `lte`, `gt`, `lt`, `like`, `ilike`, `in`

### 2.4 Tulis Data — `sbWrite` Pattern

**Endpoint:** `POST /api/admin/sb-write` _(butuh cookie `admin_session`)_

```json
// Insert
{ "table": "garansi", "action": "insert",
  "payload": { "nomor_seri": "...", "tipe_barang": "..." } }

// Update
{ "table": "claim_promo", "action": "update",
  "payload": { "validasi_by_mkt": "Valid" },
  "match": { "id_claim": "uuid" } }

// Delete
{ "table": "barang_aset", "action": "delete",
  "match": { "id": "uuid" } }
```

```json
// Response
{ "data": [...], "error": null }
```

### 2.5 Daftar Event Publik

**Endpoint:** `GET /api/events/register`

```json
{
  "events": [
    {
      "id": "uuid",
      "event_title": "Workshop Fotografi",
      "event_date": "05 Jun 2026",
      "event_time": "09.00 WIB - Selesai",
      "event_location": "Studio TV, ISBI Bandung",
      "event_price": "Rp 150.000",
      "event_status": "In stock",
      "event_payment_tipe": "regular",
      "event_speaker": "Aditya Key",
      "registration_not_open": false,
      "banner_hidden": false
    }
  ],
  "pastEvents": []
}
```

- `banner_hidden = true` → event belum boleh tampil (sebelum `display_start_date`)
- `registration_not_open = true` → tampilkan "Segera Hadir", tombol Daftar disabled

### 2.6 Submit Registrasi Event

**Endpoint:** `POST /api/events/register`  
**Content-Type:** `multipart/form-data`

| Field | Type | Keterangan |
|---|---|---|
| `event_id` | String | UUID event |
| `event_name` | String | Nama event |
| `nama_lengkap` | String | |
| `nomor_wa` | String | Format `62xxx` |
| `email` | String | |
| `kabupaten_kotamadya` | String | |
| `tipe_kamera` | String | |
| `payment_type` | String | `regular`\|`deposit`\|`gratis` |
| `bukti_transfer` | File | Di-skip jika `gratis` |

**Side effect:** upload bukti ke Google Drive → insert `event_registrations` → kirim WA notifikasi.

### 2.7 API Penting Lainnya

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/events/validate-payment` | POST | Approve/reject registrasi event (admin) |
| `/api/events/attendance` | POST | Scan QR absensi: `{ qr_data: "NIKON-EVT\|uuid\|title" }` |
| `/api/cek-status?serial=XXX` | GET | Cek status klaim/garansi by nomor seri (publik) |
| `/api/admin/send-wa` | POST | Kirim WA free-form atau template ke konsumen |
| `/api/claim` | POST | Submit klaim promo baru (publik, multipart) |
| `/api/garansi` | POST | Submit registrasi garansi baru (publik, multipart) |
| `/api/drive-file?id={id}` | GET | Proxy baca file Google Drive (bypass CORS) |
| `/api/events/image?id={id}` | GET | Proxy gambar poster event dari Google Drive |

---

## 3. ALUR PENGGUNA (USER FLOW)

### 3.1 Pengguna Publik (Konsumen)

| Halaman | URL | Fungsi |
|---|---|---|
| Landing Page | `/nikon` | Halaman utama brand Nikon + scroll reveal animations |
| Chat Web Widget | `/nikon` (floating) | Chatbot WA-style, menu 1–10 |
| Form Klaim Promo | `/nikon/form-claim` | 3-step wizard |
| Form Daftar Garansi | `/nikon/form-garansi` | 3-step wizard |
| Cek Status | `/nikon` (modal) | Input nomor seri → status klaim + garansi |
| Daftar Event | `/events/register` | Grid event aktif + event selesai |
| Upload Foto Lomba | `/nikon/upload-lomba` | Pilih event, input IG, max 10 foto |

**Menu chatbot (ketik angka di WA atau web chat):**

```
1 → Klaim Promo       6  → Promo Aktif
2 → Cek Status Klaim  7  → Alamat Toko
3 → Daftar Garansi    8  → Info Dealer
4 → Cek Garansi       9  → Hubungi CS
5 → Cek Status Servis 10 → Jadwal Event
```

**Alur lengkap event berbayar:**

```
Buka /events/register
  → Pilih event → klik Daftar
  → Isi form + upload bukti bayar
  → Server insert (status: menunggu_validasi) + kirim WA konfirmasi
  → Admin approve di dashboard
  → Generate PDF tiket → upload Drive → kirim WA tiket ke konsumen
```

**Alur klaim promo:**

```
/nikon/form-claim
  Step 1: Data Diri (nama, NIK, alamat)
  Step 2: Upload kartu garansi + nota → OCR auto-fill nomor seri & tanggal
  Step 3: Verifikasi data produk → Submit
  → WA notif ke konsumen + admin
  → Admin validasi di dashboard → WA hasil validasi
```

### 3.2 Admin / Staf Internal

```
Login → /admin/login
  └── Dashboard (/dashboard)
```

| Tab | Akses | Fungsi Utama |
|---|---|---|
| Tab Pesan | Semua | Daftar kontak WA, thread pesan, balas dengan quick reply `/` shortcut |
| Tab Konsumen | Semua | Daftar pelanggan, edit data, riwayat chatbot |
| Tab Klaim | Semua | Filter per kolom, validasi MKT/FA, input resi, cetak label, export CSV |
| Tab Garansi | Semua | Validasi status, split-view edit (form + preview dokumen) |
| Tab Service | Semua | Antrian servis, update status |
| Tab Event › Proposal | Semua | Buat/edit proposal anggaran → auto-buat event |
| Tab Event › Daftar Event | Semua | CRUD master event |
| Tab Event › Data Peserta | Semua | Filter per event, approve/reject, blast WA ke semua peserta |
| Tab Event › Claim Biaya | Semua | Klaim biaya operasional staf (draft→submitted→approved) |
| Tab Peminjaman | Semua | Buat peminjaman, catat pengembalian full/partial, generate PDF |
| Tab Affiliate | Semua | Kelola mitra, skema komisi, pencatatan penjualan |
| Tab Bot Settings | Semua | URL file promo, teks chatbot, quick reply CS |
| Tab WA Templates | Semua | CRUD template Meta WhatsApp Business |
| `/admin/events` | `admin_events` | Validasi pembayaran event + export CSV |
| `/admin/events/attendance` | `admin_attendance` | Scan QR absensi + nomor urut hadir |
| `/admin/events/deposit` | `admin_deposit` | Proses refund deposit peserta |

---

## 4. TAMPILAN (UI/UX)

### 4.1 Warna & Tema

| Token | Hex | Penggunaan |
|---|---|---|
| Nikon Yellow | `#FFE500` | Primary button, highlight, brand — aksen utama WAJIB |
| Background | `#FFFFFF` / `#F9FAFB` | Light mode only — tidak ada dark mode |
| Chat OUT bubble | `#DCF8C6` | Pesan terkirim (WA green style) |
| Chat IN bubble | `#FFFFFF` + border | Pesan masuk dari konsumen |
| Web chat user | `#FFE000` | Bubble user di web chat widget |
| Text primary | `#111827` / `#1F2937` | gray-900 / zinc-800 |
| Accent blue | `#2563EB` | Selection highlight, link aktif, badge filter |
| Success | `#059669` (emerald) | Status valid, terdaftar, hadir |
| Warning | `#D97706` / `#F97316` | Pending, hold, partial |
| Danger | `#DC2626` (red) | Ditolak, error |

### 4.2 Komponen UI Utama

| Komponen | Deskripsi |
|---|---|
| **Sidebar Admin** | Navbar kiri fixed, emoji ikon per tab, counter badge merah (hanya muncul jika > 0) |
| **Tabel Data** | Scroll horizontal (min-width 1200px), border kiri warna status, baris highlight biru saat dipilih, filter row di `<thead>` |
| **Card View** | Grid 3 kolom, badge status, tombol aksi teks/link |
| **Modal Edit** | Overlay centered; mode split-view: form kanan + preview dokumen Drive di kiri dengan zoom scroll |
| **Badge Status** | `rounded-md` chip — bukan pill (`rounded-full`). Warna sesuai domain |
| **Form Publik** | Step wizard 3 langkah, progress indicator, validasi per step |
| **Web Chat Widget** | Floating button kuning kanan bawah (`z-60`), panel slide-up, bubble WA-style |
| **Quick Reply** | Ketik `/` di input admin → dropdown shortcut dari `pengaturan_bot` prefix `quick_reply:` |

### 4.3 Catatan Penting untuk Android Developer

> **Wajib dibaca sebelum implementasi.**

1. **Auth / Session**  
   Semua API admin memerlukan cookie `admin_session` (JWT).  
   Di Android: gunakan `CookieJar` dengan OkHttp, atau simpan token di `DataStore` / `EncryptedSharedPreferences`.

2. **Google Drive URL**  
   URL Drive **tidak bisa di-render langsung** (CORS + domain whitelist).  
   Selalu proxy via `/api/drive-file?id={driveId}` atau `/api/events/image?id={driveId}`.

3. **QR Code Absensi**  
   Format string: `"NIKON-EVT|{uuid}|{event_title}"`.  
   Gunakan **ML Kit Barcode Scanning** untuk decode di Android.

4. **Timezone**  
   Semua `TIMESTAMPTZ` di DB disimpan **UTC**.  
   Tampilkan dengan `ZoneId.of("Asia/Jakarta")` + append `" WIB"`.

5. **`event_date` Format**  
   Disimpan sebagai `TEXT` format `"DD Mon YYYY"` (misal `"05 Jun 2026"`) — bukan `TIMESTAMPTZ`.  
   Parse dengan `DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)`.

6. **Notifikasi WA**  
   Tidak perlu diimplementasi di Android — sepenuhnya ditangani server.  
   Cukup polling REST atau gunakan **Supabase Realtime WebSocket** untuk live update.

7. **File Upload**  
   Semua upload (bukti transfer, kartu garansi, foto) dikirim ke server sebagai `multipart/form-data`.  
   Android **tidak** perlu akses Google Drive langsung.

8. **Akses Supabase**  
   Jangan akses Supabase langsung dari Android untuk data admin.  
   Semua harus melalui proxy `/api/admin/sb` yang memvalidasi session cookie.

---

## 5. TEMPLATE NOTIFIKASI WHATSAPP

Semua notifikasi menggunakan **Meta Business API** template yang sudah di-approve.

| Template | Trigger | Parameter |
|---|---|---|
| `notif_daftar_event` | Pendaftaran event berbayar/deposit | — |
| `notif_event_approved` | Admin approve (tanpa link WA grup) | `{{1}}`nama, `{{2}}`event, `{{3}}`url_tiket |
| `notif_event_approved_v2` | Admin approve (ada link WA grup) | + `{{4}}`wa_group_link |
| `notif_event_blast` | Blast ke semua peserta terdaftar | `{{1-8}}`: nama, acara, tgl, jam, lokasi, speaker, tiket, wa_group |
| `notif_event_blast_no_group` | Blast tanpa link WA grup | `{{1-7}}`: tanpa wa_group |
| `notif_event_rejected` | Admin reject pendaftaran | — |
| `notif_event_attendance` | Scan QR absensi berhasil | — |
| `notif_deposit_refund` | Admin proses refund deposit | bukti_pengembalian |
| `notif_garansi_received` | Submit garansi baru (publik) | — |
| `notif_garansi_approved` | Validasi garansi = Valid | — |
| `notif_garansi_rejected` | Validasi garansi = Tidak Valid | — |
| `notif_claim_received` | Submit klaim promo baru (publik) | — |
| `notif_claim_approved` | Validasi klaim = Valid | — |
| `notif_claim_rejected` | Validasi klaim = Tidak Valid | — |
| `notif_lending_init_v2` | Peminjaman aset dibuat | `{{1}}`nama, `{{2}}`estimasi, `{{3}}`daftar barang, `{{4}}`link Drive |
| `notif_lending_return_v2` | Pengembalian selesai (status: selesai) | `{{1}}`nama, `{{2}}`tgl kembali, `{{3}}`daftar barang, `{{4}}`link Drive |
| `notif_lending_return_partial` | Pengembalian sebagian (status: partial) | Sama seperti `_v2`, teks penutup berbeda |
| `notif_lending_reminder` | Cron harian jatuh tempo | `{{1}}`nama, `{{2}}`estimasi, `{{3}}`daftar barang |
| `notif_kode_akun` | Forgot password OTP | kode OTP (AUTH template) |

---

## 6. ENVIRONMENT VARIABLES (Referensi)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
WHATSAPP_ACCESS_TOKEN            # Meta Graph API token
WHATSAPP_PHONE_NUMBER_ID         # 1116796251527220
WHATSAPP_BUSINESS_ACCOUNT_ID     # 27367113462975131
WHATSAPP_VERIFY_TOKEN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_DRIVE_FOLDER_ID
ADMIN_SESSION_SECRET
OCR_SPACE_API_KEY
ADMIN_WA_NUMBER                  # Nomor WA admin untuk notifikasi internal
```

---

*Dokumen ini di-generate dari kode sumber proyek Nikon Dashboard — Juni 2026*  
*altanikindo.com*
