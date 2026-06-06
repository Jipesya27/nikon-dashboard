-- Tambah jam acara dan link WA grup ke tabel events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_time text,
  ADD COLUMN IF NOT EXISTS wa_group_link text;
