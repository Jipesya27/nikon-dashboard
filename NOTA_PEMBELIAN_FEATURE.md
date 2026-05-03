# 📄 Fitur Nota Pembelian - Dokumentasi

## 📋 Deskripsi
Fitur ini memungkinkan Anda untuk membuka link nota pembelian dan kartu garansi dari Google Drive atau file lokal dengan cara yang optimal untuk setiap tipe media.

## 🎯 Fitur Utama

### 1. **Deteksi Otomatis Google Drive**
- Sistem secara otomatis mendeteksi apakah link adalah dari Google Drive atau tidak
- Mendukung: `drive.google.com`, `docs.google.com`, `sheets.google.com`, `slides.google.com`

### 2. **Dua Mode Pembukaan**

#### ✅ Google Drive Links → Buka di Tab Baru
- Link Google Drive akan dibuka **langsung di tab browser baru**
- Pengguna dapat melihat dokumen/file di Google Drive secara native
- Keuntungan: Tidak terbatas pada viewer modal, akses penuh ke fitur Google

#### ✅ File Lokal/URL Lain → Modal Image Viewer
- File yang diupload ke Supabase atau URL lain akan ditampilkan dalam modal
- Fitur: Zoom in/out, Pan/drag, Support PDF
- Optimal untuk preview cepat tanpa membuka tab baru

### 3. **Visual Indicators**
Sistem memberikan indikator visual yang jelas untuk membedakan tipe link:

| Tipe | Icon | Label | Keterangan |
|------|------|-------|-----------|
| **Google Drive** | 🔗📂 | (Google Drive) | Link eksternal ke Google Drive |
| **File Lokal** | 🔗 | - | File tersimpan di Supabase |

### 4. **Lokasi Fitur**
Fitur ini tersedia di semua tampilan:
- ✅ **Claims > Table View** - Kolom "Nota/Garansi"
- ✅ **Claims > Card View** - Bagian "Lihat Nota/Garansi"
- ✅ **Warranties > Table View** - Kolom "Nota/Garansi"
- ✅ **Warranties > Card View** - Bagian "Lihat Nota/Garansi"

## 🚀 Cara Menggunakan

### 1. **Menambah Link Google Drive**
```
1. Klik "Edit" pada claim/warranty yang ingin ditambah link
2. Di field "Link Nota Pembelian" atau "Link Kartu Garansi"
3. Paste URL dari Google Drive Anda
   Contoh: https://drive.google.com/file/d/1ABC...
4. Simpan perubahan
```

### 2. **Menambah File Lokal**
```
1. Klik "Edit" pada claim/warranty
2. Klik area upload file untuk "Link Nota Pembelian" atau "Link Kartu Garansi"
3. Pilih file dari komputer Anda
4. Sistem akan upload ke Supabase storage secara otomatis
5. Simpan perubahan
```

### 3. **Membuka Nota/Garansi**
```
Cukup klik button:
- "🔗 Lihat Nota" atau "🔗📂 Lihat Nota (Google Drive)"
- "🔗 Lihat Garansi" atau "🔗📂 Lihat Garansi (Google Drive)"

Sistem akan:
- Google Drive → Buka di tab baru
- File lokal → Tampilkan di modal viewer dengan fitur zoom/pan
```

## 📱 Responsive Design
- **Desktop** (lg): Visual indicator dan badge tampil lengkap
- **Tablet** (md): Layout menyesuaikan dengan baik
- **Mobile** (sm): Icon dan teks yang relevan disembunyikan untuk menghemat space

## 🔒 Keamanan
- Google Drive links dibuka dengan `noopener,noreferrer` untuk security
- File lokal tersimpan di Supabase Storage dengan enkripsi
- Akses file dibatasi berdasarkan permission Supabase

## ⚙️ Konfigurasi Teknis

### Helper Function
```typescript
const isGoogleDriveLink = (url: string): boolean => {
  if (typeof url !== 'string') return false;
  return /(?:drive\.google\.com|docs\.google\.com|sheets\.google\.com|slides\.google\.com)/.test(url);
};
```

### Supported Google Services
- ✅ Google Drive (`drive.google.com`)
- ✅ Google Docs (`docs.google.com`)
- ✅ Google Sheets (`sheets.google.com`)
- ✅ Google Slides (`slides.google.com`)

### File Types Supported (Local)
- ✅ Images: JPG, PNG, GIF, WebP
- ✅ PDF: PDF files dengan viewer khusus
- ✅ Other: Tergantung browser support

## 💡 Tips & Best Practices

### 1. **Untuk Google Drive Links**
- Pastikan file sudah dipublikasikan atau shared dengan link
- Gunakan "Anyone with the link" untuk akses yang mudah
- Copy link sharing langsung dari Google Drive

### 2. **Untuk File Lokal**
- Upload file kecil (< 5MB) untuk loading cepat
- Gunakan format standar (JPG, PNG, PDF) untuk compatibility
- File akan tersimpan permanen di Supabase

### 3. **Naming Convention**
- Beri nama file yang deskriptif: `Nota-[NoSeri]-[Tanggal].pdf`
- Contoh: `Nota-SN123456-2024-04-30.pdf`

## 🔧 Troubleshooting

### Link Google Drive tidak terbuka
**Solusi:**
- Pastikan link sudah di-share dengan "Anyone with the link"
- Cek apakah URL berbentuk: `https://drive.google.com/file/d/...`
- Coba copy link sharing ulang dari Google Drive

### File lokal tidak muncul
**Solusi:**
- Pastikan file sudah tersimpan (loading spinner hilang)
- Cek browser console untuk error
- Coba refresh halaman
- Pastikan file format didukung

### Modal viewer tidak responsif
**Solusi:**
- Zoom otomatis disesuaikan dengan ukuran window
- Gunakan button +/- untuk zoom manual
- Drag file untuk pan view
- Close dengan tombol X atau ESC

## 📞 Support
Jika ada masalah atau pertanyaan, hubungi tim development melalui WhatsApp Bot.

---
**Last Updated:** April 2026
**Version:** 1.0
