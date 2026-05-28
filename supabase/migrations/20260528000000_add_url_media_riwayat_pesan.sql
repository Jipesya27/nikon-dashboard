-- Tambah kolom url_media di riwayat_pesan untuk menyimpan URL gambar/dokumen dari WhatsApp
ALTER TABLE public.riwayat_pesan
  ADD COLUMN IF NOT EXISTS url_media TEXT;
