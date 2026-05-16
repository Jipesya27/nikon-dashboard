NIKON INDONESIA - HYBRID CRM & HOMEPAGE PROJECT

1. Visi Proyek

Membangun ulang Homepage publik Nikon Indonesia yang terintegrasi langsung dengan sistem CRM purnajual (Klaim Garansi, Promo, & Nikon School Event) dengan UI Premium bernuansa Dark Mode.

2. Arsitektur Infrastruktur (Hybrid Cloud / Active-Passive)

Frontend (Public): Di-host di Vercel (Next.js/React) untuk kecepatan muat global.

Backend & Compute Node (Local): Menggunakan Cluster STB HG680P (Armbian Linux Ubuntu 22.04 Jammy, Kernel 5.15/6.1 CLI). Berisi Docker container untuk API dan Node.js.

Storage Node (Local): Synology DS223j terhubung via NFS ke STB. Menjalankan MinIO (S3 Local) untuk menyimpan foto struk/label pengiriman dan Database PostgreSQL.

Failover (Cloud): Cloudflare Tunnels (db.domain.com) untuk routing aman, dengan replikasi database ke Supabase dan backup file ke Google Drive (Cloud Sync) untuk jaga-jaga saat mati lampu.

3. Fitur Utama & Alur Otomatisasi

Smart OCR Claim: Konsumen memfoto struk/nota, AI (Vision API) otomatis mengekstrak Nomor Seri dan tanggal untuk mengisi form Admin CRM secara otomatis.

Automated Label Printing: Pembuatan label pengiriman berformat PNG menggunakan HTML5 Canvas.

WhatsApp Notification Gateway: Memanfaatkan HP Android lokal untuk mengirim notifikasi WhatsApp ke konsumen saat status klaim berubah (via Tasker/Webhook API dari STB).

Event QR Ticketing: Registrasi "Nikon School" di homepage menghasilkan tiket QR Code otomatis.