# Memory â€” Nikon Dashboard

Dokumen ini merangkum semua skema, alur, dan keputusan desain yang sudah diimplementasikan. Update setiap kali ada perubahan signifikan.

---

## 1. Claim Promo â€” Skema & Alur

### Alur Halaman `/claim`

1. **Layar konfirmasi nomor WA** â€” User input nomor WA. Nomor ini **hanya untuk notifikasi**. Tidak ada API call di sini; langsung lanjut ke form.
2. **Form pengisian** terdiri dari 3 bagian:
   - **Bagian 1 â€” Data Diri Pendaftar**: Nomor WA (readOnly, bisa ganti), Email (wajib), Nama Lengkap (wajib), NIK (opsional)
   - **Bagian 2 â€” Upload Dokumen**: Foto Kartu Garansi (+ OCR otomatis) + Foto Nota Pembelian (JPG/PNG/WEBP/GIF/PDF, maks 10 MB)
   - **Bagian 3 â€” Data Produk**: Tipe Barang, Nomor Seri, Jenis Promosi, Tanggal Pembelian, Nama Toko, **Alamat Pengiriman Hadiah** (standalone, diisi bebas)

### Aturan Penting Claim

- **Nomor WA = hanya untuk notifikasi**, tidak terikat dengan data alamat.
- **Tidak ada skema "sendiri / orang lain"** â€” penerima claim selalu = pendaftar itu sendiri (`nama_penerima_claim = nama_lengkap`).
- **Tidak ada section alamat rumah** di form publik â€” field `alamat_rumah`, `kelurahan`, `kecamatan`, `kabupaten_kotamadya`, `provinsi`, `kodepos` **dihapus dari form dan tidak disimpan ke konsumen** saat submit claim.
- **Tidak ada checkbox "sama dengan alamat rumah"** â€” `alamat_pengiriman` diisi langsung/bebas.
- Jika nomor WA belum ada di tabel `konsumen`, record baru dibuat dengan placeholder `BELUM_DIISI` untuk field alamat.
- Jika sudah ada, hanya `nama_lengkap`, `email`, `nik` yang diupdate (bukan alamat).

### API `/api/claim` â€” Field yang dikirim

| Field | Asal |
|---|---|
| `phone` | nomor WA dari layar konfirmasi |
| `nama_lengkap`, `email`, `nik` | form data diri |
| `nomor_seri`, `tipe_barang`, `jenis_promosi`, `tanggal_pembelian`, `nama_toko`, `alamat_pengiriman` | form data produk |
| `foto_kartu_garansi`, `foto_nota_pembelian` | file upload |

**Field yang TIDAK ada lagi**: `alamat_rumah`, `kelurahan`, `kecamatan`, `kabupaten_kotamadya`, `provinsi`, `kodepos`, `recipient_type`, `nama_penerima_claim` (server set sendiri = nama_lengkap), `nomor_wa_update` (server pakai `matchedPhone`).

### API `/api/claim` â€” Yang dilakukan server

1. Cari konsumen via `normalizePhone` (cek varian format 62xxx / 0xxx / +62xxx)
2. Jika tidak ada â†’ INSERT konsumen baru dengan `status_langkah: 'START'` dan placeholder `BELUM_DIISI` untuk field alamat
3. UPDATE tabel `konsumen` â€” hanya: `nama_lengkap`, `email` (jika diisi), `nik` (jika diisi), `updated_at`
4. Upload 2 file ke Google Drive (via OAuth2 refresh token)
5. INSERT ke `claim_promo` (`nama_penerima_claim = nama_lengkap`, `nomor_wa_update = matchedPhone`)
6. Reset `status_langkah` konsumen ke `'START'`
7. Kirim notifikasi ke konsumen + admin (`sendNotif`)

### Admin Dashboard â€” Tab Claim

- **Tambah Claim** dan **Edit Claim** tidak lagi memiliki section "Data Konsumen (auto-sync)" (ungu) dengan field alamat.
- Tidak ada field "Nama Penerima Hadiah" di form admin â€” sudah dihapus (selalu sama dengan pendaftar).
- WA `onBlur` di admin form hanya prefill `nama_pendaftar` dari konsumen, tidak pull seluruh data konsumen.
- `handleSaveClaim`: konsumenPayload hanya berisi `nomor_wa`, `nama_lengkap`, `status_langkah` â€” tidak include address fields.
- `nama_penerima_claim` di-default ke `nama_pendaftar` otomatis saat save.
- `nomor_wa_update` di-default ke `nomor_wa` otomatis saat save.

---

## 2. Chat / Pesan â€” Skema CS Aktif & Unread

### CS Aktif Tag

- Tag "CS Aktif" (merah) muncul di sidebar jika `bicara_dengan_cs = true` di tabel `riwayat_pesan`.
- **Hanya hilang** jika admin klik tombol **"âœ“ Selesai CS"** â†’ `handleSelesaiCS()` â†’ set `bicara_dengan_cs = false`.
- Tombol reply admin **tidak** mengubah `bicara_dengan_cs` (sebelumnya ada bug yang set ke `false` setiap reply).

### Unread Badge

- Badge unread **hanya muncul untuk kontak yang `bicara_dengan_cs = true`**.
- Kontak lain (non-CS) tidak menampilkan badge walau ada pesan belum dibaca.
- `countUnread(nomor_wa)` â†’ return 0 jika kontak bukan CS aktif.

### Sinkronisasi Read Status (Cross-Device)

- Source of truth: tabel Supabase `chat_read_status` (field: `id_karyawan`, `nomor_wa`, `last_read_at`).
- localStorage (`nikon_chat_read_status_<id_karyawan>`) sebagai cache lokal.
- Saat login: load dari Supabase, merge dengan localStorage (ambil yang lebih baru).
- Saat buka chat: useEffect upsert `last_read_at` ke Supabase setiap kali pesan terbaru berubah.
- Polling sync setiap 5 detik saat chat aktif.
- Tombol **"âœ“âœ“ Mark All Read"** di sidebar header: batch upsert semua kontak ke Supabase.

### Tabel `chat_read_status` (migration `20260604000000_chat_read_status.sql`)

```sql
CREATE TABLE IF NOT EXISTS chat_read_status (
  id_karyawan  text        NOT NULL,
  nomor_wa     text        NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_karyawan, nomor_wa)
);
ALTER TABLE chat_read_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON chat_read_status
  USING (true) WITH CHECK (true);
```

---

## 3. QR Scanner

- Menggunakan library `Html5Qrcode` (bukan `Html5QrcodeScanner`).
- Alur:
  1. Buka modal scanner â†’ `Html5Qrcode.getCameras()` deteksi kamera yang tersedia.
  2. Tampilkan tombol per kamera (misal: "Kamera Belakang", "Kamera Depan").
  3. User pilih kamera â†’ `qr.start(camId, config, onSuccess)`.
  4. Reader div harus punya `minHeight: 300` agar video terlihat.
  5. Setelah scan sukses atau modal ditutup â†’ `qr.stop()`.
- State: `scannerCameras`, `scannerStatus` (`idle`/`loading`/`scanning`/`error`), `scannerError`, `scannerRef`.

---

## 4. Dashboard Home â€” Stat Cards

- Grid: `grid-cols-2 lg:grid-cols-4 gap-3` (2 kolom di mobile, 4 kolom di desktop).
- CSS class `.stat-card`: `p-3` (bukan p-6).
- CSS class `.stat-value`: `text-2xl` (bukan text-3xl).
- CSS class `.stat-label`: `text-xs` (bukan text-sm).
- Emoji di dalam card: `text-2xl` (bukan text-4xl).
- Spacing dalam card: `mb-1` (bukan mb-3).
- Tujuan: Quick Actions section terlihat tanpa scroll di mobile.

---

## 5. Claim Status Filter Buttons

- Tombol filter status di tab Claims ditampilkan dalam **satu baris horizontal** dengan scroll.
- Class container: `flex gap-2 overflow-x-auto pb-1`
- Setiap tombol: tambah `flex-shrink-0` agar tidak mengecil.

---

## 6. Peminjaman â€” Notifikasi Telegram Admin

Saat barang **dipinjam** atau **dikembalikan**, dikirim notif Telegram ke admin melalui:
- **Endpoint:** `POST /api/admin/notify-lending`
- **Auth:** `verifyAdminSession` (cookie session wajib)
- **Telegram chat ID:** diambil dari `pengaturan_bot.telegram_admin_chat_id`, fallback ke env `TELEGRAM_ADMIN_CHAT_ID`

### Format pesan

**Pinjam:**
```
ðŸ“¦ Peminjaman Baru!

ðŸ‘¤ Nama: {nama_peminjam}
ðŸ“± WhatsApp: {nomor_wa}
ðŸ“… Tgl Pinjam: {tanggal}
ðŸ“… Est. Kembali: {tanggal_estimasi}

Barang Dipinjam:
1. {nama_barang} â€” SN: {nomor_seri}
   Aksesori: ...
```

**Kembali:**
```
âœ… Pengembalian Barang!

ðŸ‘¤ Nama: {nama_peminjam}
ðŸ“± WhatsApp: {nomor_wa}
ðŸ“… Tgl Kembali: {tanggal}
ðŸ“Š Status: Semua barang telah dikembalikan / Pengembalian sebagian

Barang Dikembalikan:
1. {nama_barang} â€” SN: {nomor_seri}
   Catatan: ...
```

- Dipanggil dari `handleSaveLending` (mode `create`) dan `handleReturnItems` di `dashboard/page.tsx`
- **Fire-and-forget** â€” gagal tidak memblokir alur utama

---

## 7. Notifikasi Admin via Telegram

Semua notifikasi ke admin (claim promo, garansi, event, CS request) dikirim via **Telegram**, bukan WhatsApp.

### Konfigurasi

- **Env vars**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`
- **DB**: `telegram_admin_chat_id` di tabel `pengaturan_bot` (override env var)
- **Bot**: `@JipesyaMonitoring_bot`
- **Chat ID admin**: `8491326460`

### `app/lib/notify.ts`

- `sendTelegram(chatId, message)` â€” kirim via Telegram Bot API, MarkdownV2 dengan fallback plain-text
- `sendNotif()` â€” admin notifications dikirim ke Telegram (bukan WA)
- `getSettings()` â€” fetch `telegram_admin_chat_id` dari `pengaturan_bot`

### Dashboard â€” Pengaturan Telegram

- Tab: **Pengaturan** â†’ section "Notifikasi Admin via Telegram"
- State: `telegramChatId`, `telegramChatIdInput`, `telegramSaving`, `telegramMsg`
- `saveTelegramChatId()` â†’ upsert ke `pengaturan_bot` (field `url_file: ''` bukan null, karena NOT NULL constraint)
- Test link: `/api/test-notif?telegram=1`

### `supabase/functions/meta-bot/index.ts` â€” CS Handoff

- `sendTelegramAdminNotif(nama, nomor, isOffHours)` â€” notif ke admin saat konsumen request CS (menu "9")
- Dalam jam operasional: "ðŸ”” *Permintaan CS Baru!*"
- Di luar jam operasional: "â° *Permintaan CS (Di Luar Jam Operasional)*" â€” tetap dikirim agar bisa follow-up urgent
- Dipanggil di `case "9"` untuk kedua kondisi jam operasional

---

## 8. Infrastruktur Backup â€” STB HG680P + Synology DS223J

### Arsitektur

**Active-Passive Failover**: jika GitHub/Supabase/Vercel bermasalah, traffic dialihkan ke sistem lokal.

```
Internet â†’ backup.altanikindo.web.id
         â†’ Cloudflare Tunnel (nikon-synology)
         â†’ cloudflared di Synology (192.168.18.169)
         â†’ STB di LAN (192.168.18.63:3000)
```

### Hardware

| Perangkat | IP | Spesifikasi |
|---|---|---|
| STB HG680P | 192.168.18.63 | AML S905X, Cortex-A53 (ARM64), Armbian |
| Synology DS223J | 192.168.18.169 | Realtek RTD1619B (ARM64) |

### Synology â€” Google Drive Backup

- **Tool**: Synology Cloud Sync
- **Akun**: WebMarketingAlta (Google Drive)
- **Remote path**: Root folder (semua file upload app)
- **Local path**: `/dashboard/backups`
- **Status**: Up to date (sync otomatis)

### Synology â€” Docker Containers

| Container | Image | Port |
|---|---|---|
| postgres | postgres:15 | **5433** (bukan 5432, konflik dengan Synology internal) |
| minio | minio/minio | 9010 (API), 9011 (Console) |
| wetty | wettyoss/wetty | 7681 |
| cloudflared | cloudflare/cloudflared | â€” |

**docker-compose path**: `/volume1/docker/nikon/docker-compose.yml`

### STB â€” Next.js via PM2

- **Node.js**: v20 (install via NodeSource)
- **Repo path**: `/opt/nikon-dashboard`
- **Build**: `npm run build` (standalone output)
- **Static files**: setelah build wajib copy manual:
  ```bash
  cp -r .next/static .next/standalone/.next/static
  cp -r public .next/standalone/public
  ```
- **Env vars**: disimpan di `/opt/nikon-dashboard/.env.local` â€” wajib ada: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, dan semua env lainnya sama dengan Vercel
- **Start command** (env vars harus di-load saat start):
  ```bash
  set -a && source /opt/nikon-dashboard/.env.local && set +a
  pm2 start /opt/nikon-dashboard/.next/standalone/server.js --name nikon-dashboard
  pm2 save
  ```
- **PENTING**: `export $(grep -v '^#' .env.local | xargs)` tidak berfungsi untuk JWT token (ada karakter spesial). Gunakan `set -a; source` sebagai gantinya.
- **Auto-start**: `pm2 startup` sudah dikonfigurasi (systemd)
- **Status**: Online di port 3000

### Monitoring Infrastruktur

- **Tab**: ðŸ–¥ï¸ Infrastruktur di dashboard (kategori Manajemen) â€” hanya Admin & Super Admin
- **API**: `/api/infrastruktur/stb` â€” return CPU load avg, RAM, disk, uptime (Node.js `os` module + `df`)
- **Polling**: otomatis setiap 30 detik, dipanggil dari `backup.altanikindo.web.id/api/infrastruktur/stb`
- **CSP**: `backup.altanikindo.web.id` sudah ditambahkan ke `connect-src` di `next.config.ts`

### Akses Super Admin di Sidebar

- ðŸ–¥ï¸ **Backup Dashboard** â†’ `https://backup.altanikindo.web.id/dashboard` (buka tab baru)
- ðŸ’» **Terminal SSH** â†’ `https://terminal.altanikindo.web.id` (buka tab baru)
- Hanya muncul untuk role **Super Admin** di bagian "Halaman Lain" sidebar

### Database Replication

- **Script**: `/opt/nikon-backup/backup.sh` (di STB)
- **Alur**: `pg_dump` dari Supabase â†’ `pg_restore` ke PostgreSQL lokal (Synology port 5433)
- **Jadwal**: setiap 6 jam â€” `0 */6 * * *`
- **Retention**: 3 dump terakhir di `/opt/nikon-backup/dumps/`
- **Log**: `/opt/nikon-backup/backup.log`

### Cloudflare Tunnel

- **Nama**: `nikon-synology`
- **Status**: HEALTHY
- **Connector**: Latief-Family (linux_arm64) â€” berjalan di Synology

| Hostname | Target | Keterangan |
|---|---|---|
| `terminal.altanikindo.web.id` | `http://localhost:7681` | Wetty â†’ SSH ke STB |
| `backup.altanikindo.web.id` | `http://192.168.18.63:3000` | Next.js di STB (backup site) |

- Hostname diatur di tab **Published application routes** di Cloudflare Zero Trust â†’ Networks â†’ Tunnels â†’ nikon-synology
- DNS record dibuat otomatis oleh Cloudflare

### `next.config.ts`

- `output: 'standalone'` â€” wajib untuk deploy di Docker/PM2 tanpa node_modules penuh

### `Dockerfile`

- Multi-stage: `deps` â†’ `builder` â†’ `runner`
- Base image: `node:20-alpine`
- User: `nextjs` (non-root)
- Port: 3000
- CMD: `node server.js`

### Status Phase

| Phase | Keterangan | Status |
|---|---|---|
| Phase 1 | Synology setup (Docker containers) | âœ… Selesai |
| Phase 2 | DB replication (pg_dump cron) | âœ… Selesai |
| Phase 3 | Deploy Next.js di STB via PM2 | âœ… Selesai |
| Phase 4 | Cloudflare Tunnel + failover routing | âœ… Selesai |

---

## 9. Infrastruktur & Konvensi

- **DB access**: gunakan proxy `/api/admin/sb-read` (GET) dan `/api/admin/sb-write` (POST) via helper `sbRead` / `sbWrite`. Jangan akses Supabase langsung dari client.
- **Branch utama**: `main`. Semua perubahan di-push ke `main`.
- **Notifikasi konsumen**: `sendNotif()` dari `@/app/lib/notify` â€” kirim ke WA konsumen. Admin menerima via Telegram.
- **Google Drive upload**: OAuth2 dengan refresh token, file disimpan di folder `GOOGLE_DRIVE_FOLDER_ID`.
- **File upload limit**: 10 MB, tipe: JPG, PNG, WEBP, GIF, PDF.
- **`pengaturan_bot.url_file`**: NOT NULL constraint â€” selalu isi dengan `''` (string kosong) bukan `null`.
- **WhatsApp API**: Meta/Facebook Graph API (Meta Cloud API).

### Google Drive â€” Struktur Folder File Event

Semua file disimpan di root `GOOGLE_DRIVE_FOLDER_ID`. Subfolder dibuat otomatis oleh sistem:

| Jenis File | Folder | Format Nama File |
|---|---|---|
| Bukti transfer pendaftaran event | Root (`GOOGLE_DRIVE_FOLDER_ID`) | `EventReg_{EventTitle}_{FullName}_{Timestamp}.{ext}` |
| Bukti pengembalian deposit | `Pengembalian Deposit` | â€” |
| Tiket event (generated PDF) | `Tiket Event` | â€” |
| Dokumen peminjaman (generated PDF) | `Dokumen Peminjaman` | â€” |
| Upload foto lomba | `Upload File Lomba` | â€” |
| Dokumen penerima barang | `Penerima_Barang` | â€” |
| Attachment WhatsApp | `message_attachment` | â€” |
