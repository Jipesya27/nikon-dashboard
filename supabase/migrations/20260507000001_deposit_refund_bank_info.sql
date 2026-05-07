-- Tambah kolom bank info untuk pengembalian deposit
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS nama_bank TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS no_rekening TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;
