-- Tambah kolom sinkronisasi event ke tabel budget_approval
ALTER TABLE budget_approval
  ADD COLUMN IF NOT EXISTS event_date   text,
  ADD COLUMN IF NOT EXISTS event_image  text,
  ADD COLUMN IF NOT EXISTS linked_event_id uuid REFERENCES events(id) ON DELETE SET NULL;
