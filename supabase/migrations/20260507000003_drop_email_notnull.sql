-- Email tidak lagi diisi di form (sudah diganti dengan relasi konsumen)
-- Drop NOT NULL constraint supaya insert tidak gagal
ALTER TABLE event_registrations ALTER COLUMN email DROP NOT NULL;
