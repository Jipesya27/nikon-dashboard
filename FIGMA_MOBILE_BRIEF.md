# Figma Design Brief — Nikon Dashboard Mobile UI/UX
**PT Alta Nikindo · Android Native · Material 3 · Jetpack Compose**

---

## 1. Konteks Proyek

### Latar Belakang
PT Alta Nikindo (distributor resmi Nikon Indonesia) memiliki web dashboard berbasis Next.js untuk manajemen internal: klaim promo, garansi, servis, event, pesan WhatsApp, dan monitoring infrastruktur. Dibutuhkan desain mobile companion app untuk staf yang bekerja di lapangan, dengan semua fitur web tersedia di genggaman.

### Target Pengguna
Staf internal Alta Nikindo: marketing, customer service, finance, admin event, dan supervisor. Login menggunakan akun karyawan. Akses fitur terbatas sesuai role masing-masing (role-based access control).

### Platform & Ukuran Layar
- Platform: Android native
- Frame utama: **360×800dp** (baseline)
- Frame tambahan: **390×844dp** (modern mid-range)
- Safe area bawah: 32dp untuk gesture navigation Android

---

## 2. Brand Identity

### Warna

| Nama | Hex | Penggunaan |
|------|-----|------------|
| Nikon Yellow (Primary) | `#FFE500` | Aksen utama, CTA, highlight aktif, ikon sidebar aktif |
| Nikon Black (Dark surface) | `#1A1A1A` | Header, sidebar, background login |
| Dark Grey (Elevated surface) | `#2C2C2C` | Card di atas background gelap |
| Light Grey (Content bg) | `#F5F5F5` | Background halaman konten |
| Success Green | `#22C55E` | Status valid, approved, online |
| Danger Red | `#EF4444` | Ditolak, error, hapus |
| Warning Amber | `#F59E0B` | Menunggu, pending, perhatian |
| Info Blue (FA/Finance) | `#3B82F6` | Tombol finance, badge FA |
| WhatsApp Green (header) | `#075E54` | Header panel chat |
| WhatsApp Bubble OUT | `#DCF8C6` | Bubble pesan keluar |
| Teal (resi terkirim) | `#14B8A6` | Badge resi/pengiriman |
| Border Grey | `#E5E7EB` | Border card, divider |

### Tipografi
- Font: **Roboto** (default Android / Material 3)
- Heading halaman: 16sp, weight 500 (Medium)
- Judul card: 14sp, weight 500
- Body / konten: 13sp, weight 400
- Label kecil / badge: 10–11sp, weight 500
- Timestamp / hint: 9–10sp, weight 400, warna abu

> Jangan gunakan font dekoratif. Tampilan harus clean, professional, dan mudah dibaca di outdoor.

### Logo
Logo PT Alta Nikindo (bentuk X + gunung, kuning-hitam) digunakan sebagai **app icon**. Di dalam app:
- Header login & sidebar: teks **"ALTA NIKINDO"** atau logo horizontal versi putih di atas background gelap `#1A1A1A`
- Bukan logo Nikon kamera — brand yang ditonjolkan adalah Alta Nikindo

---

## 3. Pola Navigasi Mobile

### Navigasi Utama: Modal Drawer (Sidebar)
App menggunakan **Modal Drawer** yang muncul dari sisi kiri layar — bukan bottom navigation bar, karena total menu 25+ item.

**Struktur grup sidebar:**
- `UTAMA` → Dashboard, Pesan, Sync Portal Web
- `OPERASIONAL` → Promo, Klaim, Garansi, Service, Peminjaman, Barang Aset, Transaksi Dealer, Affiliate, Upload Resi
- `EVENT` → Proposal Event, Daftar Event, Data Peserta, Report Event, Klaim Biaya
- `MANAJEMEN` → Import Data, User Role, Bot Settings, Saran Isian, WA Templates, Infrastruktur
- `HALAMAN ADMIN` → Validasi Pembayaran, Deposit & Refund, Absensi QR

**Cara buka sidebar:**
- Swipe dari kiri layar (gesture swipe-in)
- Tap tombol hamburger ☰ di top-left

**Sidebar item aktif:** background kuning `#FFE500`, teks & ikon hitam `#1A1A1A`
**Sidebar item non-aktif:** teks putih, ikon abu `#AAAAAA`

### Top App Bar
- Background: `#1A1A1A`
- Kiri: tombol hamburger (kuning) + nama halaman aktif (putih, animasi slide saat ganti tab) + nama user (kuning, 9sp di bawahnya)
- Kanan: badge `● ONLINE` hijau berdenyut (pulse animation)
- Tinggi: 56dp

### Opsi Bottom Navigation (Quick Access — opsional)
Sebagai shortcut 5 menu terpenting:

| Ikon | Label |
|------|-------|
| Home | DASHBOARD |
| Chat bubble | PESAN |
| File check | KLAIM |
| Calendar event | EVENT |
| QR code | ABSENSI |

### Tombol Back Android
- Back = kembali ke tab sebelumnya (bukan keluar app)
- Tekan 2× dalam 2 detik = keluar app dengan Toast "Tekan sekali lagi untuk keluar"
- Animasi transisi antar tab: fade 220ms + slide Y 1/12 layar (EaseOutCubic)

---

## 4. Daftar Layar yang Harus Didesain

> Total: **21 layar utama** + varian state (empty, loading, error) per layar.
> Tipe: 🔒 Admin (login required) · 🌐 Publik (tanpa login)

---

### 🔒 1. Login Screen ⭐ Prioritas
**Background:** gelap gradient `#111111` → `#1A1A1A`
**Card putih di tengah, berisi:**
- Logo Alta Nikindo
- Label "Staff Admin Terminal"
- Field Username (outline, border kuning saat fokus)
- Field Password (dengan toggle show/hide)
- Pesan error (merah) jika gagal
- Tombol kuning "Masuk Sistem" (full width, 48dp tinggi)
- Field URL Server kecil di bawah (untuk konfigurasi staging/production)

**Animasi entrance:** card muncul dari bawah dengan spring bounce

---

### 🔒 2. Dashboard Utama ⭐ Prioritas
**Konten:**
- 4 KPI card (grid 2×2, bisa di-tap untuk navigasi ke tab terkait):
  - Total Konsumen (ikon orang)
  - Total Garansi (ikon shield)
  - Total Chat (ikon chat)
  - Total Klaim (ikon confirmation)
- Daftar Pengingat Dinamis (tugas pending):
  - Card pesan baru belum dibalas
  - Card klaim belum divalidasi
  - Card service belum ditangani
  - Card hijau "Semua tugas selesai ✓" jika tidak ada pending
- Info sinkronisasi terakhir + tombol "Mulai Sinkron"

---

### 🔒 3. Pesan WhatsApp ⭐ Prioritas
**Layout dua panel horizontal:**

**Panel Kiri (120dp lebar):**
- Header hijau tua `#075E54` dengan label "Pesan"
- List kontak: avatar lingkaran hijau (inisial), nama konsumen (bold 11sp), preview pesan terakhir (abu 9sp)
- Highlight kuning/hijau pada kontak aktif

**Panel Kanan (flex):**
- Header `#075E54`: nama kontak aktif, tombol "Template /"
- Area chat `#F0F0F0`: bubble IN (putih, shadow 1dp, pojok kiri-atas lancip) dan OUT (hijau `#DCF8C6`, pojok kanan-atas lancip)
- Timestamp abu 9sp di bawah tiap bubble
- Auto-scroll ke pesan terbaru
- Panel template balasan (collapsible)
- Footer: text field multi-line + tombol kirim kuning

---

### 🔒 4. Validasi Klaim Promo ⭐ Prioritas
**Header:**
- Filter chip horizontal (LazyRow): Semua, Belum Ditinjau, Tunggu FA, Tunggu Resi, Resi Terkirim, Tidak Valid
- Counter: `n/total` di kanan

**List item card:**
- Nama pendaftar (bold) + nomor seri (abu)
- Badge status (warna sesuai status)
- Barang + jenis promosi
- Badge MKT (amber) dan FA (biru)
- Resi ekspedisi (jika sudah ada)

**Detail (tap card):**
- Semua info klaim lengkap
- Tombol "Validasi MKT" (approve/reject) dengan field catatan
- Tombol "Input Resi Pengiriman" dengan field nomor resi + dropdown ekspedisi

---

### 🔒 5. E-Garansi
- List garansi dengan badge status (Pending / Valid / Ditolak)
- Info: nama, nomor seri, tipe kamera, toko, tanggal beli
- Tap → detail dengan tombol Approve (hijau) / Reject (merah outline)

---

### 🔒 6. Service Center
- List unit servis dengan status: Diterima → Dalam Perbaikan → Selesai → Diambil
- Dropdown ganti status per item
- Badge warna berbeda per tahap

---

### 🔒 7. Validasi Pembayaran Event ⭐ Prioritas
**List pendaftar dengan `status_pendaftaran = "menunggu_validasi"`:**
- Nama + nomor WA (hijau)
- Nama event + kota + tipe kamera
- Badge tipe bayar (regular / deposit)
- Ikon attachment jika ada bukti transfer

**Aksi:**
- Tombol **Terima** (full hijau)
- Tombol **Tolak** (outline merah)
- Tolak membuka AlertDialog dengan field alasan penolakan

---

### 🔒 8. Deposit & Refund Event
- List permintaan refund (status `requested`)
- Info rekening bank tujuan transfer
- Tombol "Tandai Refund Diproses" (biru)
- Bagian bawah: daftar yang sudah diproses dengan badge hijau "Processed ✓"

---

### 🔒 9. Absensi QR Code ⭐ Prioritas
- Layar penuh kamera untuk scan QR
- Overlay garis pemindai animasi (kotak dengan sudut kuning)
- Card hasil scan:
  - Berhasil: background hijau, nama peserta, nama event, waktu hadir
  - Gagal: background merah, pesan error
- Tombol reset / scan ulang

---

### 🔒 10. Daftar Event (Nikon School)
- List event: gambar thumbnail, judul, tanggal, lokasi, harga, badge status stok
- FAB kuning (+) untuk buat event baru
- Form buat event: judul, speaker, tanggal, harga, lokasi, stok peserta

---

### 🔒 11. Data Konsumen
- Search bar di atas
- List: avatar lingkaran inisial kuning, nama (bold), nomor WA hijau, alamat, NIK
- Tap → halaman detail konsumen lengkap

---

### 🔒 12. Peminjaman Aset
- List pinjaman aktif: nama peminjam, item dipinjam, tanggal estimasi kembali, status badge
- Form tambah pinjaman baru
- Tombol "Tandai Sudah Dikembalikan"

---

### 🔒 13. Manajemen Karyawan (User Role)
- List karyawan: avatar, nama, username, role badge warna, status aktif (toggle)
- Tombol tambah karyawan (FAB)
- Form: nama lengkap, username, role, nomor WA
- Modal reset password → menampilkan pesan copy-paste WA terformat

---

### 🔒 14. Infrastruktur & Monitoring
- Card status server: dot ● ONLINE (hijau berdenyut) / OFFLINE (merah)
- Progress bar untuk CPU, RAM, Disk dengan label dan nilai aktual
- Warna bar: hijau normal → kuning >65% → merah >85%
- Badge suhu CPU (merah jika >70°C)
- Uptime server
- Tombol Refresh (atas kanan)
- Data dari real API `https://backup.altanikindo.web.id/api/infrastruktur/stb`

---

### 🔒 15. Sinkronisasi Portal Web
- Card info koneksi: URL server, status sesi aktif
- Log sinkronisasi real-time (list auto-scroll ke bawah): ✅/❌/⏳ per tabel
- Tombol "Mulai Sinkron" dengan CircularProgressIndicator saat loading
- Informasi waktu terakhir sinkronisasi

---

### 🔒 16. Bot Settings
- Toggle on/off auto-reply
- Slider delay respons bot (1–30 detik)
- Text field prompt rule bot (multi-line)
- Field pesan konfirmasi WA template

---

### 🌐 17. Halaman Publik — Home Nikon ⭐ Prioritas
- Hero section: logo Alta + tagline Nikon
- 4 tombol layanan besar (grid 2×2):
  - Klaim Promo
  - E-Garansi
  - Cek Status Service
  - Workshop / Event
- Grid event aktif (card: gambar, judul, tanggal, harga, tombol Daftar)
- Chat widget floating (lingkaran WhatsApp hijau, berdenyut)
- Footer: info kontak, nomor WA

---

### 🌐 18. Form Klaim Promo (Multi-step) ⭐ Prioritas
**Progress bar 3 langkah di atas:**

- **Step 1 — Data Diri:** nama lengkap, nomor WA, nomor seri, tipe barang
- **Step 2 — Detail Pembelian:** nama toko, tanggal beli, jenis promosi, alamat pengiriman hadiah
- **Step 3 — Upload Bukti:** foto nota pembelian + foto kartu garansi (tap untuk ambil/pilih foto)

Tombol Selanjutnya (kuning) / Kembali (outline) / Kirim Klaim.
Layar sukses: ilustrasi centang hijau + ringkasan klaim.

---

### 🌐 19. Form E-Garansi (Multi-step)
Sama seperti klaim, wizard 3 langkah:
- Step 1: nama, WA, nomor seri, tipe barang
- Step 2: nama toko, tanggal beli, jenis garansi, lama garansi
- Step 3: upload nota + foto kartu garansi

---

### 🌐 20. Cek Status Serial Number
- Field input nomor seri (besar, prominent)
- Tombol "Cek Sekarang"
- Hasil pencarian: card klaim (jika ada), card garansi (jika ada), card service (jika ada)
- Empty state: "Nomor seri tidak ditemukan dalam database"

---

### 🌐 21. Pendaftaran Workshop / Event
- Header: gambar event (fullwidth), judul, tanggal, lokasi, speaker
- Info harga & sisa slot peserta
- Form pendaftaran: nama, WA, email, kota/kabupaten, tipe kamera
- Upload bukti transfer (jika berbayar, via tombol pick file)
- Tombol Daftar (kuning, full width)
- State "Segera Hadir" jika belum buka pendaftaran

---

## 5. Komponen UI yang Harus Dibuat di Figma

| Komponen | Deskripsi |
|----------|-----------|
| **PressableCard** | Card yang mengecil (scale 97%) saat ditekan, spring animation. Dipakai di semua list item. Variant: default, pressed, disabled. |
| **Status Badge** | Pill kecil berwarna. Variant: Belum Ditinjau (abu), Tunggu FA (biru), Resi Terkirim (teal), Valid (hijau), Tidak Valid (merah), Deposit (amber). |
| **Filter Chip Row** | Scrollable horizontal row. Aktif: background kuning, teks hitam. Non-aktif: abu muda `#F3F4F6`. |
| **Chat Bubble** | IN: putih, shadow 1dp, radius pojok kiri-atas 3dp. OUT: `#DCF8C6`, radius pojok kanan-atas 3dp. Radius lainnya 14dp. |
| **Avatar Circle** | Lingkaran dengan 1–2 inisial. Warna: kuning (admin), hijau (konsumen), abu (lain). Size: 34dp, 36dp, 44dp. |
| **Progress Bar Metric** | Label + nilai aktual di atas, progress bar di bawah (8dp tinggi, radius 4dp). Warna dinamis berdasarkan persentase. |
| **Sync Log Item** | Teks log dengan ikon status di kiri. Warna ikon: ✅ hijau, ❌ merah, ⏳ abu. Font monospace/small. |
| **Empty State** | Ikon besar di tengah (48dp), teks abu "Belum ada data", sub-teks hint kecil. |
| **Online Badge** | Pill `● ONLINE` dengan dot berdenyut (pulse animation). Background hijau transparan. |
| **Section Header** | Label kategori sidebar: uppercase, 9sp, abu terang, letter-spacing 1.5px. |
| **KPI Card** | Card metric: ikon (36dp, rounded bg), angka besar (24sp bold), label (11sp abu). Tap-able. |
| **Step Indicator** | Progress 3 langkah: lingkaran numbered, garis connector, label step di bawah. |
| **Alert Dialog** | Dialog konfirmasi dengan judul, konten, 2 tombol (Batal + Aksi). Sesuai Material 3. |
| **FAB (Floating Action Button)** | Kuning `#FFE500`, ikon hitam, shadow 4dp, posisi bottom-right 16dp dari edge. |

---

## 6. State yang Harus Didesain per Layar

Setiap layar utama harus memiliki minimal 3 state:

| State | Deskripsi |
|-------|-----------|
| **Default / Populated** | Data tersedia dan tampil normal |
| **Loading** | CircularProgressIndicator kuning di tengah atau skeleton placeholder |
| **Empty** | Empty state dengan ilustrasi/ikon dan teks hint |
| **Error** | Card merah dengan pesan error dan tombol Coba Lagi |

---

## 7. Spesifikasi Teknis untuk Developer Handoff

| Properti | Nilai |
|----------|-------|
| Framework | Jetpack Compose (Android) |
| Design system | Material 3 (Material You) |
| Base screen | 360×800dp — juga desain 390×844dp |
| Satuan di Figma | dp (sama dengan px di Figma 1:1 untuk 1x) |
| Icon library | Material Icons (tersedia di Compose) |
| Corner radius card kecil | 8dp |
| Corner radius card standar | 12dp |
| Corner radius bottom sheet | 16dp (top corners only) |
| Elevation card default | 1dp |
| Elevation card saat ditekan | 0dp |
| Padding horizontal halaman | 12dp |
| Padding vertikal halaman | 12dp |
| Jarak antar card (vertical) | 8dp |
| Top App Bar tinggi | 56dp |
| Bottom safe area | 32dp (Android gesture nav) |
| Animasi transisi tab | fadeIn 220ms + slideInVertically EaseOutCubic |
| Animasi press card | spring scale 97%, StiffnessMediumLow |
| Minimum kontras teks | ≥ 4.5:1 (WCAG AA) |
| Minimum touch target | 48×48dp |

---

## 8. Alur Navigasi Antar Layar

```
[Splash Logo]
      ↓
[Login Screen]
      ↓ (berhasil login)
[Dashboard Utama] ←──── semua tab kembali ke sini dengan Back
      ↓ (via sidebar)
  ┌─────────────────────────────────────────┐
  │ Pesan → [List Kontak] → [Thread Chat]   │
  │ Klaim → [List] → [Detail Validasi]      │
  │ Garansi → [List] → [Detail]             │
  │ Service → [List] (inline update)         │
  │ Event → [List] → [Form Buat]            │
  │ Validasi Pembayaran → [List] → [Aksi]   │
  │ Deposit Refund → [List] → [Proses]      │
  │ Absensi → [Kamera QR] → [Hasil Scan]   │
  │ Konsumen → [List] → [Detail]            │
  │ Karyawan → [List] → [Form] → [Reset PW]│
  │ Infrastruktur → [Metrics Live]          │
  │ Sync → [Log Real-time]                  │
  └─────────────────────────────────────────┘
      ↓ (via tombol Logout)
[Login Screen]
```

**Halaman Publik (tanpa login):**
```
[Home Nikon]
  ├─→ [Form Klaim Promo] → Step 1 → Step 2 → Step 3 → [Sukses]
  ├─→ [Form E-Garansi]   → Step 1 → Step 2 → Step 3 → [Sukses]
  ├─→ [Cek Serial Number] → [Hasil]
  └─→ [Detail Event] → [Form Daftar] → [Sukses]
```

---

## 9. Deliverable yang Diharapkan dari Figma

1. **Component Library** — semua komponen reusable dengan variant lengkap (default, hover, pressed, disabled, loading)
2. **Screen Designs** — 21 layar utama × minimal 3 state = ±63 frame total
3. **Prototype Flow** — koneksi antar layar untuk simulasi navigasi drawer dan tab transitions
4. **Handoff Annotations** — spacing, color tokens, font size, radius, elevation per komponen
5. **Dark surface + Light content** — sidebar/header gelap `#1A1A1A`, konten terang `#F5F5F5` (bukan full dark mode)
6. **Assets Export** — icon dan ilustrasi dalam format SVG + PNG @1x @2x @3x

---

## 10. Referensi Visual

| Referensi | Untuk |
|-----------|-------|
| WhatsApp Android | Panel chat: bubble, header hijau, layout 2 panel |
| Material 3 Guidelines | Card, dialog, FAB, navigation drawer |
| Web dashboard Alta Nikindo | Semua konten, data, dan fitur (lihat screenshot terlampir) |
| Google Finance Android | Layout KPI card dashboard |

---

*Brief ini dibuat berdasarkan kode sumber web dashboard Next.js PT Alta Nikindo dan implementasi Android Jetpack Compose yang sedang berjalan.*
*Versi: 1.0 · Juni 2026*
