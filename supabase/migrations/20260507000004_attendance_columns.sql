-- Tambah kolom untuk tracking attendance dengan timestamp & admin yg scan
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attended_by TEXT;

-- Index untuk query attendance per event lebih cepat
CREATE INDEX IF NOT EXISTS idx_event_registrations_attendance
  ON event_registrations(event_id, is_attended);
