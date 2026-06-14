-- Tambah kolom jadwal tampil dan pendaftaran event
-- display_start_date  : kapan kartu event mulai tampil di halaman publik
-- registration_open_date  : kapan form pendaftaran aktif (bisa berbeda dari display_start_date)
-- registration_close_date : kapan pendaftaran ditutup
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS display_start_date DATE,
  ADD COLUMN IF NOT EXISTS registration_open_date DATE,
  ADD COLUMN IF NOT EXISTS registration_close_date DATE;
