# NIKON DASHBOARD - User Manual & Feature Guide

**Version 1.0**  
Created: 14 Juni 2026

---

## 📋 Daftar Isi

1. Pendahuluan & Panduan Umum
2. Halaman Publik (Landing Page)
3. Dashboard Admin - Tab Pesan (Messaging)
4. Manajemen Events
5. Template Chatbot WhatsApp
6. Klaim Biaya (Expense Claims)
7. Tracking Resi & Pengiriman
8. Admin Events - Validasi Pembayaran
9. Admin Events - Absensi
10. Admin Events - Kelola Deposit
11. Garansi & Warranty Management
12. Lending System
13. Monitoring Dashboard
14. Pengaturan Admin

---

## 1️⃣ Pendahuluan & Panduan Umum

### Apa itu Nikon Dashboard?

Nikon Dashboard adalah sistem manajemen terpadu yang dirancang untuk PT Altanikindo Indonesia. Platform ini mengintegrasikan:

- Manajemen event dan registrasi peserta
- Sistem chatbot WhatsApp untuk customer service
- Tracking pengiriman dan resi
- Manajemen klaim biaya karyawan
- Sistem garansi produk
- Pemantauan operasional real-time

### Cara Login

1. Buka website dashboard di browser Anda
2. Masuk dengan email dan password admin Anda
3. Jika lupa password, klik 'Lupa Password' dan ikuti instruksi reset
4. Setelah login berhasil, Anda akan melihat halaman Dashboard utama

### Navigasi Dasar

Dashboard memiliki sidebar kiri dengan menu utama:

| Menu | Fungsi |
|------|--------|
| 💬 Pesan | Kirim dan kelola pesan WhatsApp |
| 📅 Events | Buat dan kelola event |
| 🤖 Chatbot | Atur template pesan bot WhatsApp |
| ⚙️ Admin Events | Validasi pembayaran & absensi |
| 💰 Klaim Biaya | Kelola klaim biaya karyawan |
| 📦 Resi | Track pengiriman barang |
| 🎖️ Garansi | Kelola garansi produk |
| 🔄 Lending | Sistem peminjaman barang |
| 📊 Monitoring | Dashboard monitoring STB |

---

## 2️⃣ Halaman Publik (Landing Page)

### Akses Publik

Halaman publik dapat diakses siapa saja tanpa login di:
- URL: https://altanikindo.vercel.app atau domain yang sudah dikonfigurasi

### Fitur Halaman Publik

#### A. Daftar Event

Menampilkan semua event aktif yang tersedia untuk publik:

- **Kartu event** menampilkan: judul, tanggal, harga, lokasi, stok peserta
- **Status event**: 'In stock' (bisa daftar), 'Out of stock' (penuh), 'Close' (tutup)
- **Tombol aksi**: 'Daftar' untuk event aktif, 'Segera Hadir' jika belum dibuka
- **Event tersembunyi** sebelum tanggal 'Display Start Date'

#### B. Form Registrasi Event

Saat klik tombol 'Daftar':

- Isi data lengkap: nama, nomor WhatsApp, email, kabupaten
- Pilih tipe kamera yang dimiliki
- Upload bukti transfer pembayaran
- Sistem akan validasi pembayaran sebelum konfirmasi

#### C. Chat Widget WhatsApp

Widget chat tersedia di halaman publik:

- Tombol chat WhatsApp di pojok kanan bawah
- Terhubung ke bot WhatsApp untuk customer service otomatis
- Bisa langsung chat dengan CS jika diperlukan

---

## 3️⃣ Dashboard Admin - Tab Pesan (Messaging)

### Fungsi Tab Pesan

Tab Pesan adalah pusat komunikasi dengan customer via WhatsApp:

- Melihat riwayat percakapan dengan customer
- Mengirim pesan teks, gambar, video, dokumen
- Mengelola template pesan WhatsApp
- Melihat log semua pesan masuk dan keluar

### Cara Menggunakan Tab Pesan

1. Klik menu 'Pesan' di sidebar kiri
2. Anda akan melihat dua bagian:
   - Daftar kontak WhatsApp (kiri)
   - Area chat (kanan)
3. Klik kontak untuk membuka thread percakapan
4. Untuk mengirim pesan baru:
   - Ketik pesan di field input bawah
   - Klik tombol 'Kirim'
5. Untuk upload file:
   - Klik tombol paperclip/attachment
   - File akan di-upload ke Google Drive
   - Otomatis terkirim via WhatsApp

### Fitur Khusus

Media yang bisa dikirim:
- Teks (pesan langsung)
- Gambar (JPG, PNG)
- Video (MP4, MOV)
- Dokumen (PDF, Word, Excel)

---

## 4️⃣ Manajemen Events

### Akses Menu Events

Klik 'Events' di sidebar → akan membuka halaman daftar event

### Membuat Event Baru

#### Step 1: Informasi Dasar

- **Judul event**: nama event yang akan ditampilkan
- **Tanggal event**: kapan event berlangsung
- **Jam event**: pukul berapa event dimulai
- **Lokasi**: tempat event
- **Harga**: harga tiket per peserta

#### Step 2: Stok & Tipe Pembayaran

- **Stok peserta**: berapa maksimal peserta
- **Tipe pembayaran**: 'regular' (bayar penuh), 'deposit' (bayar deposit), 'gratis'
- **Jika deposit**: tentukan nominal deposit yang diharuskan

#### Step 3: Jadwal Tampil & Pendaftaran

- **Display Start Date**: kapan event mulai tampil di halaman publik
- **Registration Open Date**: kapan pendaftaran dibuka (tombol Daftar aktif)
- **Registration Close Date**: kapan pendaftaran ditutup

**Catatan**: Event akan menjadi 'Past Event' setelah tanggal event lewat.

#### Step 4: Konten Event

- **Deskripsi**: penjelasan detail tentang event
- **Speaker**: siapa pembicara/host event
- **Foto event**: upload gambar thumbnail
- **Link grup WhatsApp**: untuk komunikasi peserta

#### Step 5: Bank & Kontak

- **Info bank**: rekening untuk transfer pembayaran
- **Email**: kontak untuk pertanyaan event

6. Klik 'Simpan' untuk membuat event

### Edit Event

Untuk mengubah event yang sudah dibuat:

1. Klik event di daftar
2. Ubah data yang diperlukan
3. Klik 'Update' untuk menyimpan perubahan

---

## 5️⃣ Template Chatbot WhatsApp

### Fungsi Template Chatbot

Template adalah pesan otomatis yang dikirim bot WhatsApp ke customer. Menu ini mengatur semua teks yang dikirim bot.

### Tipe-Tipe Template

Bot Nikon memiliki beberapa kategori respon:

| Template | Fungsi |
|----------|--------|
| Menu Utama | Daftar menu pilihan (1-10) |
| Kamera & Spesifikasi | Info teknis tentang kamera Nikon |
| Garansi | Info tentang garansi produk |
| Customer Service | Pesan saat CS sedang sibuk/offline |
| Event | Info event dan pendaftaran |
| Pesan Fallback | Pesan default jika input tidak dikenali |

### Cara Edit Template

1. Klik tab 'Chatbot' di dashboard
2. Pilih template yang ingin diedit
3. Ubah teks pesan sesuai kebutuhan
4. Klik 'Simpan'

**Catatan**: Perubahan template akan aktif segera untuk bot baru. Untuk peserta yang sedang chat, bot akan menggunakan pesan terbaru.

### Variabel dalam Template

Beberapa template mendukung variabel dinamis:

- `{nama}` = nama customer
- `{nomor_wa}` = nomor WhatsApp customer
- `{event_name}` = nama event

Variabel akan otomatis diganti saat bot mengirim pesan.

---

## 6️⃣ Klaim Biaya (Expense Claims)

### Apa itu Klaim Biaya?

Fitur untuk karyawan melaporkan pengeluaran bisnis yang perlu diganti perusahaan.

### Cara Membuat Klaim Biaya Baru

1. Klik tab 'Klaim Biaya' di dashboard
2. Klik 'Buat Klaim Baru'
3. Isi informasi dasar:
   - Dari mana ke mana (From/To)
   - Tanggal klaim
   - Catatan umum

### Menambah Item Pengeluaran

1. Di modal klaim, klik 'Tambah Item'
2. Untuk setiap item isi:
   - Tanggal pengeluaran
   - Deskripsi (apa yang dibeli)
   - Nominal (jumlah pengeluaran)
   - Bukti (foto/scan receipt)
3. Klik 📎 untuk upload bukti pengeluaran

### Upload Bukti Pengeluaran

Saat upload bukti, ada fitur editing:

- Zoom gambar (scroll/pinch) untuk verifikasi detail
- Crop/adjust jika ada gambar yang tidak relevan
- Isi tanggal dan keterangan bukti
- Otomatis terupload ke Google Drive

### Export ke PDF

Setelah semua item siap:

1. Klik tab 'Layout A4' untuk preview PDF
2. Drag & arrange gambar dalam halaman A4
3. Klik tombol ↻ untuk rotate gambar
4. Klik 'Download PDF' untuk export

**Catatan**: PDF sudah siap untuk dicetak atau diemail ke manager.

### Status Klaim

- **Draft**: masih editing, belum submit
- **Submitted**: sudah kirim ke manager
- **Approved**: manager setuju, siap untuk reimburs
- **Rejected**: manager tolak (ada penjelasan alasan)

---

## 7️⃣ Tracking Resi & Pengiriman

### Fungsi Tab Resi

Tab ini untuk mengelola dan track pengiriman barang via kurir JNE.

### Import Resi dari PDF JNE

1. Dapatkan file 'Laporan Penjualan Agen' dari JNE (format PDF)
2. Klik 'Import PDF'
3. Sistem akan otomatis parse data dari PDF:
   - Nomor tracking (CNOTE)
   - Tanggal pengiriman
   - Service type (REG, OKE, etc)
   - Tujuan pengiriman
   - Nama penerima
   - Barang yang dikirim
4. Review dan korreksi jika ada data yang salah
5. Klik 'Simpan' untuk menyimpan ke database

### Daftar Resi

Menampilkan semua resi yang sudah tersimpan:

| Kolom | Keterangan |
|-------|-----------|
| Tanggal | Tanggal pengiriman |
| CNOTE | Nomor tracking JNE |
| Tujuan | Kota/kecamatan tujuan |
| Penerima | Nama penerima barang |
| Barang | Uraian barang |

### Fitur Tambahan

- **Search**: cari resi by nomor CNOTE atau penerima
- **Filter by tanggal**: lihat resi periode tertentu
- **Edit resi**: ubah data jika ada kesalahan
- **Delete resi**: hapus resi yang tidak perlu

---

## 8️⃣ Admin Events - Validasi Pembayaran

### Fungsi Halaman Validasi

Halaman untuk verifikasi bukti transfer peserta event dan confirm registrasi.

### Cara Validasi Pembayaran

1. Klik 'Admin Events' → pilih event dari dropdown
2. Lihat daftar registrasi yang belum divalidasi (status: 'Menunggu Validasi')
3. Untuk setiap registrasi:
   - Verifikasi data peserta (nama, nomor WA, email)
   - Lihat bukti transfer yang di-upload
   - Cek jumlah transfer sesuai harga event
4. Klik tombol 'Setujui' untuk approve
5. Sistem akan otomatis:
   - Update status ke 'Terdaftar'
   - Generate tiket PDF
   - Kirim tiket ke WhatsApp peserta

### Jika Ada Kesalahan

Jika bukti transfer tidak sesuai:

1. Klik 'Tolak'
2. Masukkan alasan penolakan
3. Peserta akan dapat notifikasi via WhatsApp untuk re-submit

### Export Daftar Peserta

Untuk event yang sudah selesai validasi:

1. Klik tombol 'Download Excel'
2. File akan berisi daftar semua peserta yang terdaftar
3. Bisa digunakan untuk reporting atau analisis

---

## 9️⃣ Admin Events - Absensi (QR Code)

### Fungsi Absensi

Mencatat kehadiran peserta event menggunakan QR code.

### Cara Absen Peserta

1. Klik 'Admin Events' → 'Absensi'
2. Pilih event yang sedang berlangsung
3. Sistem akan akses camera device Anda:
   - Arahkan ke QR code di tiket peserta
   - Sistem otomatis scan dan recognise
   - Status peserta berubah ke 'Hadir'
4. Bisa juga input manual jika QR code tidak terbaca:
   - Ketik nomor WhatsApp peserta
   - Klik 'Cek' untuk cari peserta
   - Klik 'Tandai Hadir'

### Laporan Absensi

Setelah event berakhir:

1. Buka halaman absensi event tersebut
2. Lihat daftar peserta dengan status:
   - Hadir: peserta sudah absen
   - Belum Hadir: peserta terdaftar tapi tidak hadir
3. Export laporan ke Excel jika diperlukan

---

## 🔟 Admin Events - Kelola Deposit

### Fungsi Kelola Deposit

Untuk event dengan sistem deposit, halaman ini mengelola pengembalian deposit.

### Alur Deposit Event

1. Peserta membayar deposit saat daftar
2. Peserta hadir dan ambil barang/merchandise
3. Peserta bisa minta kembali deposit setelah event
4. Admin validasi dan proses refund

### Cara Proses Refund Deposit

1. Klik 'Admin Events' → 'Kelola Deposit'
2. Pilih event dari dropdown
3. Lihat daftar peserta yang minta refund (status: 'Requested')
4. Untuk setiap permintaan:
   - Cek nama dan nomor rekening peserta
   - Verifikasi nominal deposit
5. Klik 'Proses Refund' untuk approve
6. Sistem akan:
   - Catat bahwa refund sudah diproses
   - Kirim notifikasi ke peserta

### Bukti Pengembalian

1. Saat klik 'Proses Refund', Anda bisa upload:
   - Screenshot bukti transfer bank
   - Nomor referensi bank
2. Bukti ini tersimpan untuk audit trail

---

## 1️⃣1️⃣ Garansi & Warranty Management

### Fungsi Garansi

Mengelola data garansi produk Nikon yang dijual.

### Daftar Garansi

1. Klik menu 'Garansi' di sidebar
2. Lihat daftar semua garansi yang telah registrasi
3. Filter by:
   - Tipe kamera
   - Status garansi (aktif/expired)
   - Periode registrasi

### Registrasi Garansi Baru

1. Klik 'Registrasi Garansi'
2. Isi data:
   - Nama pemilik
   - Nomor WhatsApp
   - Email
   - Tipe kamera
   - Serial number kamera
   - Tanggal pembelian
3. Klik 'Simpan'

**Catatan**: Garansi Nikon biasanya 1 tahun dari tanggal pembelian.

### Klaim Garansi

Jika ada kerusakan:

1. Customer chat ke bot WhatsApp dengan pilihan 'Klaim Garansi'
2. Bot akan minta:
   - Serial number kamera
   - Foto/video kerusakan
   - Deskripsi masalah
3. Admin akan review dan proses klaim

---

## 1️⃣2️⃣ Lending System

### Fungsi Lending

Sistem untuk tracking peminjaman alat/barang.

### Membuat Peminjaman

1. Klik menu 'Lending'
2. Klik 'Buat Peminjaman Baru'
3. Isi data:
   - Nama peminjam
   - Barang yang dipinjam
   - Tanggal pinjam
   - Estimasi tanggal kembali
   - Tujuan peminjaman
   - Catatan khusus
4. Klik 'Simpan'

### Track Peminjaman

Lihat status semua peminjaman:

- **Sedang dipinjam**: barang belum dikembalikan
- **Sudah dikembalikan**: barang sudah kembali
- **Overdue**: peminjaman melewati tanggal estimasi

Sistem akan otomatis mengingatkan peminjam via WhatsApp jika mau kadaluarsa.

---

## 1️⃣3️⃣ Monitoring Dashboard

### Fungsi Monitoring

Dashboard untuk monitoring kesehatan sistem infrastruktur.

### Metrik yang Dimonitor

#### 1. Server Status
- Status STB (Set Top Box) Nikon
- Uptime & downtime
- Kualitas koneksi

#### 2. Database Status
- Connection status Supabase
- Query performance
- Storage usage

#### 3. Application Metrics
- API response time
- Active users
- Error rate

#### 4. WhatsApp Service
- Koneksi WhatsApp Business API
- Pesan sent/received per jam
- Queue messages

### Alert & Notifikasi

Jika ada anomali (server down, error rate tinggi, dll):

1. Alert akan muncul di dashboard
2. Notification ke admin via WhatsApp
3. Log lengkap tersimpan untuk debugging

---

## 1️⃣4️⃣ Pengaturan Admin

### Akses Pengaturan

Klik nama user di top-right corner → 'Pengaturan'

### Pengaturan Akun

- Ubah password
- Verifikasi email
- Preferensi notifikasi

### Pengaturan Sistem

- Logo & brand settings
- Timezone (Asia/Jakarta)
- Currency (IDR)
- Template email

### API Keys & Integrations

Untuk integrasi dengan sistem eksternal:

- Google Drive API key (untuk upload file)
- WhatsApp Business API token (untuk kirim WA)
- Supabase connection string

### Backup & Export

1. Regular backup otomatis ke Synology NAS
2. Manual backup: klik 'Backup Sekarang'
3. Export data: download CSV/Excel dari berbagai tab

---

## 💡 Tips & Troubleshooting

### Masalah Umum

#### 1. Login Gagal
- Pastikan email & password benar
- Cek koneksi internet
- Clear browser cache atau gunakan incognito mode

#### 2. Upload File Gagal
- Ukuran file harus < 25 MB
- Format file harus jpg/png/pdf
- Cek koneksi internet stabil

#### 3. WhatsApp Tidak Terkirim
- Pastikan nomor WA valid (dengan kode negara +62)
- Cek API WhatsApp connection di Monitoring
- Tunggu beberapa saat, bisa ada antrian pesan

#### 4. Event Tidak Muncul di Halaman Publik
- Pastikan tanggal 'Display Start Date' sudah lewat
- Cek juga 'Registration Open Date'
- Refresh halaman publik (clear cache)

### Best Practices

- Selalu update template pesan sebelum campaign besar
- Backup data penting sebelum update sistem
- Monitor dashboard secara regular
- Ganti password minimal 3 bulan sekali
- Gunakan strong password (kombinasi huruf, angka, simbol)

---

## 📞 Support & Hubungi Kami

### Butuh Bantuan?

Jika ada pertanyaan atau menemukan bug:

📧 **Email**: jump.all27@gmail.com  
💬 **WhatsApp**: Kirim ke CS team  
🔧 **GitHub Issues**: Report bug di repository project

### Dokumentasi Tambahan

- CLAUDE.md - Technical documentation
- API Reference - Untuk developer
- Database Schema - Struktur tabel & relasi

### Changelog

- **v1.0** - Initial release dengan semua fitur utama
- **Ongoing** - Regular updates & improvements

---

**Dokumentasi ini dibuat pada 14 Juni 2026**  
**Version 1.0 | Nikon Dashboard**
