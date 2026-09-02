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

## 8. Infrastruktur Backup - Synology DS223J

STB HG680P sudah tidak dipakai lagi - backup/failover lokal sudah pindah ke Proxmox VE (lihat CLAUDE.md untuk detail lengkap: hardware, LXC containers, network, dan service Proxmox).

### Synology - Google Drive Backup

- **Tool**: Synology Cloud Sync
- **Akun**: WebMarketingAlta (Google Drive)
- **Remote path**: Root folder (semua file upload app)
- **Local path**: `/dashboard/backups`
- **Status**: Up to date (sync otomatis)

### Synology - Docker Containers

| Container | Image | Port |
|---|---|---|
| postgres | postgres:15 | **5433** (bukan 5432, konflik dengan Synology internal) |
| minio | minio/minio | 9010 (API), 9011 (Console) |
| cloudflared | cloudflare/cloudflared | - |

**docker-compose path**: `/volume1/docker/nikon/docker-compose.yml`

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

---

## 10. Android App - Status & Catatan

- **Status**: aplikasi Android (`android-app/`) belum jalan / belum dipakai production. Jangan buru-buru "perbaiki" fitur yang datanya putus - cukup dicatat, prioritas rendah sampai app ini benar-benar dipakai.
- **InfraScreen** (`android-app/src/screens/InfraScreen.tsx`): layar "Infrastruktur & Monitoring" di drawer menu, khusus Admin/Super Admin. Menampilkan gauge CPU/RAM/Disk + uptime + list status layanan (list layanan masih hardcode `ok: true`, bukan hasil cek asli).
  - Data diambil via `fetchInfraMetrics()`, tapi endpoint sumber datanya **tidak ketemu** di source app maupun di compiled bundle (`android/app/src/main/assets/index.android.bundle`) saat ditelusuri.
  - Dokumentasi lama (`FIGMA_MOBILE_BRIEF.md`, dan bagian STB yang sudah dihapus dari section 8 di atas) menyebut sumbernya `https://backup.altanikindo.web.id/api/infrastruktur/stb` - endpoint ini sudah dihapus (STB HG680P retired, infra pindah ke Proxmox VE, lihat CLAUDE.md).
  - Efek: layar ini sekarang akan selalu jatuh ke fallback "Tidak dapat terhubung ke server" - tidak crash, cuma fitur mati.
  - **Kalau nanti mau diperbaiki**: perlu endpoint monitoring baru berbasis Proxmox (butuh API token/agent Proxmox yang bisa diakses dari server Next.js) untuk menggantikan data STB yang lama.
