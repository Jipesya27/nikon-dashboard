-- Tambah kolom nama pemilik rekening (bisa beda dari nama peserta)
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS nama_pemilik_rekening TEXT;
