# Memory — Nikon Dashboard

Dokumen ini merangkum semua skema, alur, dan keputusan desain yang sudah diimplementasikan. Update setiap kali ada perubahan signifikan.

---

## 1. Claim Promo — Skema & Alur

### Alur Halaman `/claim`

1. **Layar konfirmasi nomor WA** — User input nomor WA. Nomor ini **hanya untuk notifikasi** (bukan untuk ambil data alamat). Tidak ada API call di sini; langsung lanjut ke form.
2. **Form pengisian** terdiri dari 3 bagian:
   - **Bagian 1 — Data Diri Pendaftar**: Nama, Email (opsional), NIK (opsional), Alamat Rumah, lalu AddressFields (kodepos → kelurahan, kecamatan, kabupaten/kota, provinsi)
   - **Bagian 2 — Upload Dokumen**: Foto Kartu Garansi + Foto Nota Pembelian (JPG/PNG/WEBP/GIF/PDF, maks 10 MB)
   - **Bagian 3 — Data Produk**: Nomor Seri, Tipe Barang, Jenis Promosi, Tanggal Pembelian, Nama Toko, Alamat Pengiriman

### Aturan Penting Claim

- **Nomor WA = hanya untuk notifikasi**, tidak terikat dengan data alamat.
- **Tidak ada skema "sendiri / orang lain"** — penerima claim selalu = pendaftar itu sendiri (`nama_penerima_claim = nama_lengkap`).
- **Kodepos** diisi manual oleh user; `AddressFields` component menangani lookup cascading dari KODEPOS_DB lokal (kodepos → kelurahan → kecamatan → kabupaten → provinsi). Tidak ada fetch dari DB via WA.
- Jika nomor WA belum ada di tabel `konsumen`, record baru dibuat saat POST dengan data yang diisi di form.
- Jika sudah ada, data diri di `konsumen` diupdate (NIK hanya diupdate kalau diisi, supaya tidak timpa NIK lama).

### API `/api/claim` — Field yang dikirim

| Field | Asal |
|---|---|
| `phone` | nomor WA dari layar konfirmasi |
| `nama_lengkap`, `email`, `nik` | form data diri |
| `alamat_rumah`, `kelurahan`, `kecamatan`, `kabupaten_kotamadya`, `provinsi`, `kodepos` | form (manual + AddressFields) |
| `nomor_seri`, `tipe_barang`, `jenis_promosi`, `tanggal_pembelian`, `nama_toko`, `alamat_pengiriman` | form data produk |
| `foto_kartu_garansi`, `foto_nota_pembelian` | file upload |

**Field yang TIDAK ada lagi**: `recipient_type`, `nama_penerima_claim` (server set sendiri), `nomor_wa_update` (server pakai `matchedPhone`).

### API `/api/claim` — Yang dilakukan server

1. Cari konsumen via `normalizePhone` (cek varian format 62xxx / 0xxx / +62xxx)
2. Jika tidak ada → INSERT konsumen baru dengan `status_langkah: 'START'`
3. UPDATE tabel `konsumen` dengan data diri terbaru
4. Upload 2 file ke Google Drive (via OAuth2 refresh token)
5. INSERT ke `claim_promo` (`nama_penerima_claim = nama_lengkap`, `nomor_wa_update = matchedPhone`)
6. Reset `status_langkah` konsumen ke `'START'`
7. Kirim notifikasi ke konsumen + admin (`sendNotif`)

---

## 2. Chat / Pesan — Skema CS Aktif & Unread

### CS Aktif Tag

- Tag "CS Aktif" (merah) muncul di sidebar jika `bicara_dengan_cs = true` di tabel `riwayat_pesan`.
- **Hanya hilang** jika admin klik tombol **"✓ Selesai CS"** → `handleSelesaiCS()` → set `bicara_dengan_cs = false`.
- Tombol reply admin **tidak** mengubah `bicara_dengan_cs` (sebelumnya ada bug yang set ke `false` setiap reply).

### Unread Badge

- Badge unread **hanya muncul untuk kontak yang `bicara_dengan_cs = true`**.
- Kontak lain (non-CS) tidak menampilkan badge walau ada pesan belum dibaca.
- `countUnread(nomor_wa)` → return 0 jika kontak bukan CS aktif.

### Sinkronisasi Read Status (Cross-Device)

- Source of truth: tabel Supabase `chat_read_status` (field: `id_karyawan`, `nomor_wa`, `last_read_at`).
- localStorage (`nikon_chat_read_status_<id_karyawan>`) sebagai cache lokal.
- Saat login: load dari Supabase, merge dengan localStorage (ambil yang lebih baru).
- Saat buka chat: useEffect upsert `last_read_at` ke Supabase setiap kali pesan terbaru berubah.
- Polling sync setiap 5 detik saat chat aktif.
- Tombol **"✓✓ Mark All Read"** di sidebar header: batch upsert semua kontak ke Supabase.

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
  1. Buka modal scanner → `Html5Qrcode.getCameras()` deteksi kamera yang tersedia.
  2. Tampilkan tombol per kamera (misal: "Kamera Belakang", "Kamera Depan").
  3. User pilih kamera → `qr.start(camId, config, onSuccess)`.
  4. Reader div harus punya `minHeight: 300` agar video terlihat.
  5. Setelah scan sukses atau modal ditutup → `qr.stop()`.
- State: `scannerCameras`, `scannerStatus` (`idle`/`loading`/`scanning`/`error`), `scannerError`, `scannerRef`.

---

## 4. Dashboard Home — Stat Cards

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

## 6. Peminjaman — Notifikasi Telegram Admin

Saat barang **dipinjam** atau **dikembalikan**, dikirim notif Telegram ke admin melalui:
- **Endpoint:** `POST /api/admin/notify-lending`
- **Auth:** `verifyAdminSession` (cookie session wajib)
- **Telegram chat ID:** diambil dari `pengaturan_bot.telegram_admin_chat_id`, fallback ke env `TELEGRAM_ADMIN_CHAT_ID`

### Format pesan

**Pinjam:**
```
📦 Peminjaman Baru!

👤 Nama: {nama_peminjam}
📱 WhatsApp: {nomor_wa}
📅 Tgl Pinjam: {tanggal}
📅 Est. Kembali: {tanggal_estimasi}

Barang Dipinjam:
1. {nama_barang} — SN: {nomor_seri}
   Aksesori: ...
```

**Kembali:**
```
✅ Pengembalian Barang!

👤 Nama: {nama_peminjam}
📱 WhatsApp: {nomor_wa}
📅 Tgl Kembali: {tanggal}
📊 Status: Semua barang telah dikembalikan / Pengembalian sebagian

Barang Dikembalikan:
1. {nama_barang} — SN: {nomor_seri}
   Catatan: ...
```

- Dipanggil dari `handleSaveLending` (mode `create`) dan `handleReturnItems` di `dashboard/page.tsx`
- **Fire-and-forget** — gagal tidak memblokir alur utama

---

## 7. Infrastruktur & Konvensi

- **DB access**: gunakan proxy `/api/admin/sb-read` (GET) dan `/api/admin/sb-write` (POST) via helper `sbRead` / `sbWrite`. Jangan akses Supabase langsung dari client.
- **Branch utama**: `main`. Semua perubahan di-push ke `main`.
- **Notifikasi**: `sendNotif()` dari `@/app/lib/notify` — kirim ke WA konsumen + email admin.
- **Google Drive upload**: OAuth2 dengan refresh token, file disimpan di folder `GOOGLE_DRIVE_FOLDER_ID`.
- **File upload limit**: 10 MB, tipe: JPG, PNG, WEBP, GIF, PDF.
