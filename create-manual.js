const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, HeadingLevel, PageBreak,
  ShadingType, VerticalAlign, PageNumber, PageOrientation
} = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerShade = { fill: "1F4E78", type: ShadingType.CLEAR };
const lightShade = { fill: "E7E6E6", type: ShadingType.CLEAR };

// Utility functions
const heading1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, bold: true, size: 32 })],
  spacing: { before: 240, after: 120 }
});

const heading2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, bold: true, size: 28 })],
  spacing: { before: 200, after: 100 }
});

const heading3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, bold: true, size: 26 })],
  spacing: { before: 140, after: 80 }
});

const normalText = (text, options = {}) => new Paragraph({
  children: [new TextRun({ text, ...options })],
  spacing: { line: 360, after: 120 }
});

const bulletPoint = (text) => new Paragraph({
  children: [new TextRun({ text })],
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80 }
});

const table2Col = (data) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4680, 4680],
  rows: data.map((row, idx) => new TableRow({
    children: row.map((cell, colIdx) => new TableCell({
      borders,
      width: { size: 4680, type: WidthType.DXA },
      shading: idx === 0 ? headerShade : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({
          text: cell,
          bold: idx === 0,
          color: idx === 0 ? "FFFFFF" : "000000"
        })]
      })]
    }))
  }))
});

const table3Col = (data) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3120, 3120, 3120],
  rows: data.map((row, idx) => new TableRow({
    children: row.map((cell, colIdx) => new TableCell({
      borders,
      width: { size: 3120, type: WidthType.DXA },
      shading: idx === 0 ? headerShade : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({
          text: cell,
          bold: idx === 0,
          color: idx === 0 ? "FFFFFF" : "000000"
        })]
      })]
    }))
  }))
});

// Build document content
const content = [
  // Cover page
  new Paragraph({
    children: [new TextRun("")],
    spacing: { after: 600 }
  }),
  new Paragraph({
    children: [new TextRun({
      text: "NIKON DASHBOARD",
      bold: true,
      size: 48
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }),
  new Paragraph({
    children: [new TextRun({
      text: "User Manual & Feature Guide",
      size: 32,
      color: "666666"
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 }
  }),
  new Paragraph({
    children: [new TextRun({
      text: "Comprehensive Documentation",
      size: 24,
      color: "999999"
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  }),
  new Paragraph({
    children: [new TextRun("")],
    spacing: { after: 800 }
  }),
  new Paragraph({
    children: [new TextRun({
      text: `Version 1.0\nCreated: ${new Date().toLocaleDateString('id-ID')}`,
      size: 20,
      color: "999999"
    })],
    alignment: AlignmentType.CENTER
  }),
  new Paragraph({ children: [new PageBreak()] }),

  // Table of Contents
  heading1("📋 Daftar Isi"),
  normalText("Dokumentasi ini mencakup semua fitur utama Nikon Dashboard:"),
  normalText(""),
  bulletPoint("1. Pendahuluan & Panduan Umum"),
  bulletPoint("2. Halaman Publik (Landing Page)"),
  bulletPoint("3. Dashboard Admin - Tab Pesan (Messaging)"),
  bulletPoint("4. Manajemen Events"),
  bulletPoint("5. Template Chatbot WhatsApp"),
  bulletPoint("6. Klaim Biaya (Expense Claims)"),
  bulletPoint("7. Tracking Resi & Pengiriman"),
  bulletPoint("8. Admin Events - Validasi Pembayaran"),
  bulletPoint("9. Admin Events - Absensi"),
  bulletPoint("10. Admin Events - Kelola Deposit"),
  bulletPoint("11. Garansi & Warranty Management"),
  bulletPoint("12. Lending System"),
  bulletPoint("13. Monitoring Dashboard"),
  bulletPoint("14. Pengaturan Admin"),
  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 1. Introduction
  heading1("1️⃣ Pendahuluan & Panduan Umum"),
  heading2("Apa itu Nikon Dashboard?"),
  normalText("Nikon Dashboard adalah sistem manajemen terpadu yang dirancang untuk PT Altanikindo Indonesia. Platform ini mengintegrasikan:"),
  bulletPoint("• Manajemen event dan registrasi peserta"),
  bulletPoint("• Sistem chatbot WhatsApp untuk customer service"),
  bulletPoint("• Tracking pengiriman dan resi"),
  bulletPoint("• Manajemen klaim biaya karyawan"),
  bulletPoint("• Sistem garansi produk"),
  bulletPoint("• Pemantauan operasional real-time"),

  heading2("Cara Login"),
  normalText("1. Buka website dashboard di browser Anda"),
  normalText("2. Masuk dengan email dan password admin Anda"),
  normalText("3. Jika lupa password, klik 'Lupa Password' dan ikuti instruksi reset"),
  normalText("4. Setelah login berhasil, Anda akan melihat halaman Dashboard utama"),

  heading2("Navigasi Dasar"),
  normalText("Dashboard memiliki sidebar kiri dengan menu utama:"),
  table2Col([
    ["Menu", "Fungsi"],
    ["💬 Pesan", "Kirim dan kelola pesan WhatsApp"],
    ["📅 Events", "Buat dan kelola event"],
    ["🤖 Chatbot", "Atur template pesan bot WhatsApp"],
    ["⚙️ Admin Events", "Validasi pembayaran & absensi"],
    ["💰 Klaim Biaya", "Kelola klaim biaya karyawan"],
    ["📦 Resi", "Track pengiriman barang"],
    ["🎖️ Garansi", "Kelola garansi produk"],
    ["🔄 Lending", "Sistem peminjaman barang"],
    ["📊 Monitoring", "Dashboard monitoring STB"],
  ]),
  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 2. Landing Page
  heading1("2️⃣ Halaman Publik (Landing Page)"),
  heading2("Akses Publik"),
  normalText("Halaman publik dapat diakses siapa saja tanpa login di:"),
  normalText("URL: https://altanikindo.vercel.app atau domain yang sudah dikonfigurasi"),

  heading2("Fitur Halaman Publik"),
  heading3("A. Daftar Event"),
  normalText("Menampilkan semua event aktif yang tersedia untuk publik:"),
  bulletPoint("• Kartu event menampilkan: judul, tanggal, harga, lokasi, stok peserta"),
  bulletPoint("• Status event: 'In stock' (bisa daftar), 'Out of stock' (penuh), 'Close' (tutup)"),
  bulletPoint("• Tombol 'Daftar' untuk event yang terbuka, 'Segera Hadir' jika belum dibuka"),
  bulletPoint("• Event tersembunyi sebelum tanggal 'Display Start Date'"),

  heading3("B. Form Registrasi Event"),
  normalText("Saat klik tombol 'Daftar':"),
  bulletPoint("• Isi data lengkap: nama, nomor WhatsApp, email, kabupaten"),
  bulletPoint("• Pilih tipe kamera yang dimiliki"),
  bulletPoint("• Upload bukti transfer pembayaran"),
  bulletPoint("• Sistem akan validasi pembayaran sebelum konfirmasi"),

  heading3("C. Chat Widget WhatsApp"),
  normalText("Widget chat tersedia di halaman publik:"),
  bulletPoint("• Tombol chat WhatsApp di pojok kanan bawah"),
  bulletPoint("• Terhubung ke bot WhatsApp untuk customer service otomatis"),
  bulletPoint("• Bisa langsung chat dengan CS jika diperlukan"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 3. Dashboard - Tab Pesan
  heading1("3️⃣ Dashboard Admin - Tab Pesan (Messaging)"),
  heading2("Fungsi Tab Pesan"),
  normalText("Tab Pesan adalah pusat komunikasi dengan customer via WhatsApp:"),
  bulletPoint("• Melihat riwayat percakapan dengan customer"),
  bulletPoint("• Mengirim pesan teks, gambar, video, dokumen"),
  bulletPoint("• Mengelola template pesan WhatsApp"),
  bulletPoint("• Melihat log semua pesan masuk dan keluar"),

  heading2("Cara Menggunakan Tab Pesan"),
  normalText("1. Klik menu 'Pesan' di sidebar kiri"),
  normalText("2. Anda akan melihat dua bagian:"),
  bulletPoint("   • Daftar kontak WhatsApp (kiri)"),
  bulletPoint("   • Area chat (kanan)"),
  normalText("3. Klik kontak untuk membuka thread percakapan"),
  normalText("4. Untuk mengirim pesan baru:"),
  bulletPoint("   • Ketik pesan di field input bawah"),
  bulletPoint("   • Klik tombol 'Kirim'"),
  normalText("5. Untuk upload file:"),
  bulletPoint("   • Klik tombol paperclip/attachment"),
  bulletPoint("   • File akan di-upload ke Google Drive"),
  bulletPoint("   • Otomatis terkirim via WhatsApp"),

  heading2("Fitur Khusus"),
  normalText("Media yang bisa dikirim:"),
  bulletPoint("• Teks (pesan langsung)"),
  bulletPoint("• Gambar (JPG, PNG)"),
  bulletPoint("• Video (MP4, MOV)"),
  bulletPoint("• Dokumen (PDF, Word, Excel)"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 4. Events Management
  heading1("4️⃣ Manajemen Events"),
  heading2("Akses Menu Events"),
  normalText("Klik 'Events' di sidebar → akan membuka halaman daftar event"),

  heading2("Membuat Event Baru"),
  heading3("Step 1: Informasi Dasar"),
  bulletPoint("• Judul event: nama event yang akan ditampilkan"),
  bulletPoint("• Tanggal event: kapan event berlangsung"),
  bulletPoint("• Jam event: pukul berapa event dimulai"),
  bulletPoint("• Lokasi: tempat event"),
  bulletPoint("• Harga: harga tiket per peserta"),

  heading3("Step 2: Stok & Tipe Pembayaran"),
  bulletPoint("• Stok peserta: berapa maksimal peserta"),
  bulletPoint("• Tipe pembayaran: 'regular' (bayar penuh), 'deposit' (bayar deposit), 'gratis'"),
  bulletPoint("• Jika deposit: tentukan nominal deposit yang diharuskan"),

  heading3("Step 3: Jadwal Tampil & Pendaftaran"),
  bulletPoint("• Display Start Date: kapan event mulai tampil di halaman publik"),
  bulletPoint("• Registration Open Date: kapan pendaftaran dibuka (tombol Daftar aktif)"),
  bulletPoint("• Registration Close Date: kapan pendaftaran ditutup"),
  normalText("Catatan: Event akan menjadi 'Past Event' setelah tanggal event lewat."),

  heading3("Step 4: Konten Event"),
  bulletPoint("• Deskripsi: penjelasan detail tentang event"),
  bulletPoint("• Speaker: siapa pembicara/host event"),
  bulletPoint("• Foto event: upload gambar thumbnail"),
  bulletPoint("• Link grup WhatsApp: untuk komunikasi peserta"),

  heading3("Step 5: Bank & Kontak"),
  bulletPoint("• Info bank: rekening untuk transfer pembayaran"),
  bulletPoint("• Email: kontak untuk pertanyaan event"),

  normalText("6. Klik 'Simpan' untuk membuat event"),

  heading2("Edit Event"),
  normalText("Untuk mengubah event yang sudah dibuat:"),
  normalText("1. Klik event di daftar"),
  normalText("2. Ubah data yang diperlukan"),
  normalText("3. Klik 'Update' untuk menyimpan perubahan"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 5. Chatbot Templates
  heading1("5️⃣ Template Chatbot WhatsApp"),
  heading2("Fungsi Template Chatbot"),
  normalText("Template adalah pesan otomatis yang dikirim bot WhatsApp ke customer. Menu ini mengatur semua teks yang dikirim bot."),

  heading2("Tipe-Tipe Template"),
  normalText("Bot Nikon memiliki beberapa kategori respon:"),
  table2Col([
    ["Template", "Fungsi"],
    ["Menu Utama", "Daftar menu pilihan (1-10)"],
    ["Kamera & Spesifikasi", "Info teknis tentang kamera Nikon"],
    ["Garansi", "Info tentang garansi produk"],
    ["Customer Service", "Pesan saat CS sedang sibuk/offline"],
    ["Event", "Info event dan pendaftaran"],
    ["Pesan Fallback", "Pesan default jika input tidak dikenali"],
  ]),

  heading2("Cara Edit Template"),
  normalText("1. Klik tab 'Chatbot' di dashboard"),
  normalText("2. Pilih template yang ingin diedit"),
  normalText("3. Ubah teks pesan sesuai kebutuhan"),
  normalText("4. Klik 'Simpan'"),
  normalText("Catatan: Perubahan template akan aktif segera untuk bot baru. Untuk peserta yang sedang chat, bot akan menggunakan pesan terbaru."),

  heading2("Variabel dalam Template"),
  normalText("Beberapa template mendukung variabel dinamis:"),
  bulletPoint("• {nama} = nama customer"),
  bulletPoint("• {nomor_wa} = nomor WhatsApp customer"),
  bulletPoint("• {event_name} = nama event"),
  normalText("Variabel akan otomatis diganti saat bot mengirim pesan."),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 6. Klaim Biaya
  heading1("6️⃣ Klaim Biaya (Expense Claims)"),
  heading2("Apa itu Klaim Biaya?"),
  normalText("Fitur untuk karyawan melaporkan pengeluaran bisnis yang perlu diganti perusahaan."),

  heading2("Cara Membuat Klaim Biaya Baru"),
  normalText("1. Klik tab 'Klaim Biaya' di dashboard"),
  normalText("2. Klik 'Buat Klaim Baru'"),
  normalText("3. Isi informasi dasar:"),
  bulletPoint("   • Dari mana ke mana (From/To)"),
  bulletPoint("   • Tanggal klaim"),
  bulletPoint("   • Catatan umum"),

  heading2("Menambah Item Pengeluaran"),
  normalText("1. Di modal klaim, klik 'Tambah Item'"),
  normalText("2. Untuk setiap item isi:"),
  bulletPoint("   • Tanggal pengeluaran"),
  bulletPoint("   • Deskripsi (apa yang dibeli)"),
  bulletPoint("   • Nominal (jumlah pengeluaran)"),
  bulletPoint("   • Bukti (foto/scan receipt)"),
  normalText("3. Klik 📎 untuk upload bukti pengeluaran"),

  heading2("Upload Bukti Pengeluaran"),
  normalText("Saat upload bukti, ada fitur editing:"),
  bulletPoint("• Zoom gambar (scroll/pinch) untuk verifikasi detail"),
  bulletPoint("• Crop/adjust jika ada gambar yang tidak relevan"),
  bulletPoint("• Isi tanggal dan keterangan bukti"),
  bulletPoint("• Otomatis terupload ke Google Drive"),

  heading2("Export ke PDF"),
  normalText("Setelah semua item siap:"),
  normalText("1. Klik tab 'Layout A4' untuk preview PDF"),
  normalText("2. Drag & arrange gambar dalam halaman A4"),
  normalText("3. Klik tombol ↻ untuk rotate gambar"),
  normalText("4. Klik 'Download PDF' untuk export"),
  normalText("Catatan: PDF sudah siap untuk dicetak atau diemail ke manager."),

  heading2("Status Klaim"),
  bulletPoint("• Draft: masih editing, belum submit"),
  bulletPoint("• Submitted: sudah kirim ke manager"),
  bulletPoint("• Approved: manager setuju, siap untuk reimburs"),
  bulletPoint("• Rejected: manager tolak (ada penjelasan alasan)"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 7. Resi & Pengiriman
  heading1("7️⃣ Tracking Resi & Pengiriman"),
  heading2("Fungsi Tab Resi"),
  normalText("Tab ini untuk mengelola dan track pengiriman barang via kurir JNE."),

  heading2("Import Resi dari PDF JNE"),
  normalText("1. Dapatkan file 'Laporan Penjualan Agen' dari JNE (format PDF)"),
  normalText("2. Klik 'Import PDF'"),
  normalText("3. Sistem akan otomatis parse data dari PDF:"),
  bulletPoint("   • Nomor tracking (CNOTE)"),
  bulletPoint("   • Tanggal pengiriman"),
  bulletPoint("   • Service type (REG, OKE, etc)"),
  bulletPoint("   • Tujuan pengiriman"),
  bulletPoint("   • Nama penerima"),
  bulletPoint("   • Barang yang dikirim"),
  normalText("4. Review dan korreksi jika ada data yang salah"),
  normalText("5. Klik 'Simpan' untuk menyimpan ke database"),

  heading2("Daftar Resi"),
  normalText("Menampilkan semua resi yang sudah tersimpan:"),
  table2Col([
    ["Kolom", "Keterangan"],
    ["Tanggal", "Tanggal pengiriman"],
    ["CNOTE", "Nomor tracking JNE"],
    ["Tujuan", "Kota/kecamatan tujuan"],
    ["Penerima", "Nama penerima barang"],
    ["Barang", "Uraian barang"],
  ]),

  heading2("Fitur Tambahan"),
  bulletPoint("• Search: cari resi by nomor CNOTE atau penerima"),
  bulletPoint("• Filter by tanggal: lihat resi periode tertentu"),
  bulletPoint("• Edit resi: ubah data jika ada kesalahan"),
  bulletPoint("• Delete resi: hapus resi yang tidak perlu"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 8. Admin Events - Validasi
  heading1("8️⃣ Admin Events - Validasi Pembayaran"),
  heading2("Fungsi Halaman Validasi"),
  normalText("Halaman untuk verifikasi bukti transfer peserta event dan confirm registrasi."),

  heading2("Cara Validasi Pembayaran"),
  normalText("1. Klik 'Admin Events' → pilih event dari dropdown"),
  normalText("2. Lihat daftar registrasi yang belum divalidasi (status: 'Menunggu Validasi')"),
  normalText("3. Untuk setiap registrasi:"),
  bulletPoint("   • Verifikasi data peserta (nama, nomor WA, email)"),
  bulletPoint("   • Lihat bukti transfer yang di-upload"),
  bulletPoint("   • Cek jumlah transfer sesuai harga event"),
  normalText("4. Klik tombol 'Setujui' untuk approve"),
  normalText("5. Sistem akan otomatis:"),
  bulletPoint("   • Update status ke 'Terdaftar'"),
  bulletPoint("   • Generate tiket PDF"),
  bulletPoint("   • Kirim tiket ke WhatsApp peserta"),

  heading2("Jika Ada Kesalahan"),
  normalText("Jika bukti transfer tidak sesuai:"),
  normalText("1. Klik 'Tolak'"),
  normalText("2. Masukkan alasan penolakan"),
  normalText("3. Peserta akan dapat notifikasi via WhatsApp untuk re-submit"),

  heading2("Export Daftar Peserta"),
  normalText("Untuk event yang sudah selesai validasi:"),
  normalText("1. Klik tombol 'Download Excel'"),
  normalText("2. File akan berisi daftar semua peserta yang terdaftar"),
  normalText("3. Bisa digunakan untuk reporting atau analisis"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 9. Admin Events - Absensi
  heading1("9️⃣ Admin Events - Absensi (QR Code)"),
  heading2("Fungsi Absensi"),
  normalText("Mencatat kehadiran peserta event menggunakan QR code."),

  heading2("Cara Absen Peserta"),
  normalText("1. Klik 'Admin Events' → 'Absensi'"),
  normalText("2. Pilih event yang sedang berlangsung"),
  normalText("3. Sistem akan akses camera device Anda:"),
  bulletPoint("   • Arahkan ke QR code di tiket peserta"),
  bulletPoint("   • Sistem otomatis scan dan recognise"),
  bulletPoint("   • Status peserta berubah ke 'Hadir'"),
  normalText("4. Bisa juga input manual jika QR code tidak terbaca:"),
  bulletPoint("   • Ketik nomor WhatsApp peserta"),
  bulletPoint("   • Klik 'Cek' untuk cari peserta"),
  bulletPoint("   • Klik 'Tandai Hadir'"),

  heading2("Laporan Absensi"),
  normalText("Setelah event berakhir:"),
  normalText("1. Buka halaman absensi event tersebut"),
  normalText("2. Lihat daftar peserta dengan status:"),
  bulletPoint("   • Hadir: peserta sudah absen"),
  bulletPoint("   • Belum Hadir: peserta terdaftar tapi tidak hadir"),
  normalText("3. Export laporan ke Excel jika diperlukan"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 10. Admin Events - Deposit
  heading1("🔟 Admin Events - Kelola Deposit"),
  heading2("Fungsi Kelola Deposit"),
  normalText("Untuk event dengan sistem deposit, halaman ini mengelola pengembalian deposit."),

  heading2("Alur Deposit Event"),
  normalText("1. Peserta membayar deposit saat daftar"),
  normalText("2. Peserta hadir dan ambil barang/merchandise"),
  normalText("3. Peserta bisa minta kembali deposit setelah event"),
  normalText("4. Admin validasi dan proses refund"),

  heading2("Cara Proses Refund Deposit"),
  normalText("1. Klik 'Admin Events' → 'Kelola Deposit'"),
  normalText("2. Pilih event dari dropdown"),
  normalText("3. Lihat daftar peserta yang minta refund (status: 'Requested')"),
  normalText("4. Untuk setiap permintaan:"),
  bulletPoint("   • Cek nama dan nomor rekening peserta"),
  bulletPoint("   • Verifikasi nominal deposit"),
  normalText("5. Klik 'Proses Refund' untuk approve"),
  normalText("6. Sistem akan:"),
  bulletPoint("   • Catat bahwa refund sudah diproses"),
  bulletPoint("   • Kirim notifikasi ke peserta"),

  heading2("Bukti Pengembalian"),
  normalText("1. Saat klik 'Proses Refund', Anda bisa upload:"),
  bulletPoint("   • Screenshot bukti transfer bank"),
  bulletPoint("   • Nomor referensi bank"),
  normalText("2. Bukti ini tersimpan untuk audit trail"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 11. Garansi
  heading1("1️⃣1️⃣ Garansi & Warranty Management"),
  heading2("Fungsi Garansi"),
  normalText("Mengelola data garansi produk Nikon yang dijual."),

  heading2("Daftar Garansi"),
  normalText("1. Klik menu 'Garansi' di sidebar"),
  normalText("2. Lihat daftar semua garansi yang telah registrasi"),
  normalText("3. Filter by:"),
  bulletPoint("   • Tipe kamera"),
  bulletPoint("   • Status garansi (aktif/expired)"),
  bulletPoint("   • Periode registrasi"),

  heading2("Registrasi Garansi Baru"),
  normalText("1. Klik 'Registrasi Garansi'"),
  normalText("2. Isi data:"),
  bulletPoint("   • Nama pemilik"),
  bulletPoint("   • Nomor WhatsApp"),
  bulletPoint("   • Email"),
  bulletPoint("   • Tipe kamera"),
  bulletPoint("   • Serial number kamera"),
  bulletPoint("   • Tanggal pembelian"),
  normalText("3. Klik 'Simpan'"),
  normalText("Catatan: Garansi Nikon biasanya 1 tahun dari tanggal pembelian."),

  heading2("Klaim Garansi"),
  normalText("Jika ada kerusakan:"),
  normalText("1. Customer chat ke bot WhatsApp dengan pilihan 'Klaim Garansi'"),
  normalText("2. Bot akan minta:"),
  bulletPoint("   • Serial number kamera"),
  bulletPoint("   • Foto/video kerusakan"),
  bulletPoint("   • Deskripsi masalah"),
  normalText("3. Admin akan review dan proses klaim"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 12. Lending System
  heading1("1️⃣2️⃣ Lending System"),
  heading2("Fungsi Lending"),
  normalText("Sistem untuk tracking peminjaman alat/barang."),

  heading2("Membuat Peminjaman"),
  normalText("1. Klik menu 'Lending'"),
  normalText("2. Klik 'Buat Peminjaman Baru'"),
  normalText("3. Isi data:"),
  bulletPoint("   • Nama peminjam"),
  bulletPoint("   • Barang yang dipinjam"),
  bulletPoint("   • Tanggal pinjam"),
  bulletPoint("   • Estimasi tanggal kembali"),
  bulletPoint("   • Tujuan peminjaman"),
  bulletPoint("   • Catatan khusus"),
  normalText("4. Klik 'Simpan'"),

  heading2("Track Peminjaman"),
  normalText("Lihat status semua peminjaman:"),
  bulletPoint("• Sedang dipinjam: barang belum dikembalikan"),
  bulletPoint("• Sudah dikembalikan: barang sudah kembali"),
  bulletPoint("• Overdue: peminjaman melewati tanggal estimasi"),
  normalText("Sistem akan otomatis mengingatkan peminjam via WhatsApp jika mau kadaluarsa."),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 13. Monitoring
  heading1("1️⃣3️⃣ Monitoring Dashboard"),
  heading2("Fungsi Monitoring"),
  normalText("Dashboard untuk monitoring kesehatan sistem infrastruktur."),

  heading2("Metrik yang Dimonitor"),
  normalText("1. Server Status"),
  bulletPoint("   • Status STB (Set Top Box) Nikon"),
  bulletPoint("   • Uptime & downtime"),
  bulletPoint("   • Kualitas koneksi"),

  normalText("2. Database Status"),
  bulletPoint("   • Connection status Supabase"),
  bulletPoint("   • Query performance"),
  bulletPoint("   • Storage usage"),

  normalText("3. Application Metrics"),
  bulletPoint("   • API response time"),
  bulletPoint("   • Active users"),
  bulletPoint("   • Error rate"),

  normalText("4. WhatsApp Service"),
  bulletPoint("   • Koneksi WhatsApp Business API"),
  bulletPoint("   • Pesan sent/received per jam"),
  bulletPoint("   • Queue messages"),

  heading2("Alert & Notifikasi"),
  normalText("Jika ada anomali (server down, error rate tinggi, dll):"),
  normalText("1. Alert akan muncul di dashboard"),
  normalText("2. Notification ke admin via WhatsApp"),
  normalText("3. Log lengkap tersimpan untuk debugging"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // 14. Settings
  heading1("1️⃣4️⃣ Pengaturan Admin"),
  heading2("Akses Pengaturan"),
  normalText("Klik nama user di top-right corner → 'Pengaturan'"),

  heading2("Pengaturan Akun"),
  bulletPoint("• Ubah password"),
  bulletPoint("• Verifikasi email"),
  bulletPoint("• Preferensi notifikasi"),

  heading2("Pengaturan Sistem"),
  bulletPoint("• Logo & brand settings"),
  bulletPoint("• Timezone (Asia/Jakarta)"),
  bulletPoint("• Currency (IDR)"),
  bulletPoint("• Template email"),

  heading2("API Keys & Integrations"),
  normalText("Untuk integrasi dengan sistem eksternal:"),
  bulletPoint("• Google Drive API key (untuk upload file)"),
  bulletPoint("• WhatsApp Business API token (untuk kirim WA)"),
  bulletPoint("• Supabase connection string"),

  heading2("Backup & Export"),
  normalText("1. Regular backup otomatis ke Synology NAS"),
  normalText("2. Manual backup: klik 'Backup Sekarang'"),
  normalText("3. Export data: download CSV/Excel dari berbagai tab"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // Tips & Troubleshooting
  heading1("💡 Tips & Troubleshooting"),

  heading2("Masalah Umum"),
  heading3("1. Login Gagal"),
  bulletPoint("• Pastikan email & password benar"),
  bulletPoint("• Cek koneksi internet"),
  bulletPoint("• Clear browser cache atau gunakan incognito mode"),

  heading3("2. Upload File Gagal"),
  bulletPoint("• Ukuran file harus < 25 MB"),
  bulletPoint("• Format file harus jpg/png/pdf"),
  bulletPoint("• Cek koneksi internet stabil"),

  heading3("3. WhatsApp Tidak Terkirim"),
  bulletPoint("• Pastikan nomor WA valid (dengan kode negara +62)"),
  bulletPoint("• Cek API WhatsApp connection di Monitoring"),
  bulletPoint("• Tunggu beberapa saat, bisa ada antrian pesan"),

  heading3("4. Event Tidak Muncul di Halaman Publik"),
  bulletPoint("• Pastikan tanggal 'Display Start Date' sudah lewat"),
  bulletPoint("• Cek juga 'Registration Open Date'"),
  bulletPoint("• Refresh halaman publik (clear cache)"),

  heading2("Best Practices"),
  bulletPoint("• Selalu update template pesan sebelum campaign besar"),
  bulletPoint("• Backup data penting sebelum update sistem"),
  bulletPoint("• Monitor dashboard secara regular"),
  bulletPoint("• Ganti password minimal 3 bulan sekali"),
  bulletPoint("• Gunakan strong password (kombinasi huruf, angka, simbol)"),

  normalText(""),
  new Paragraph({ children: [new PageBreak()] }),

  // Support
  heading1("📞 Support & Hubungi Kami"),

  heading2("Butuh Bantuan?"),
  normalText("Jika ada pertanyaan atau menemukan bug:"),
  normalText(""),
  normalText("📧 Email: jump.all27@gmail.com"),
  normalText("💬 WhatsApp: Kirim ke CS team"),
  normalText("🔧 GitHub Issues: Report bug di repository project"),

  heading2("Dokumentasi Tambahan"),
  bulletPoint("• CLAUDE.md - Technical documentation"),
  bulletPoint("• API Reference - Untuk developer"),
  bulletPoint("• Database Schema - Struktur tabel & relasi"),

  heading2("Changelog"),
  normalText("• v1.0 - Initial release dengan semua fitur utama"),
  normalText("• Ongoing - Regular updates & improvements"),

  normalText(""),
  normalText(""),
  new Paragraph({
    children: [new TextRun({
      text: "—",
      size: 20
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200 }
  }),
  new Paragraph({
    children: [new TextRun({
      text: `Dokumentasi ini dibuat pada ${new Date().toLocaleDateString('id-ID')}\nversi 1.0 | Nikon Dashboard`,
      size: 20,
      color: "999999"
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }),
];

// Create document
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 24 }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 32, bold: true, font: "Calibri", color: "1F4E78" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 28, bold: true, font: "Calibri", color: "2E75B6" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 }
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 26, bold: true, font: "Calibri", color: "4472C4" },
        paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: "bullet",
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 }
              }
            }
          }
        ]
      }
    ]
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: content
    }
  ]
});

// Save document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("NIKON_DASHBOARD_USER_MANUAL.docx", buffer);
  console.log("✅ Dokumentasi berhasil dibuat: NIKON_DASHBOARD_USER_MANUAL.docx");
  process.exit(0);
});
