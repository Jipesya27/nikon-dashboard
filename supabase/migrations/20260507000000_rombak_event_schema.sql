-- ============================================================
-- EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rename existing columns (safe -- skips if already renamed)
DO $$ BEGIN ALTER TABLE events RENAME COLUMN title TO event_title; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN date TO event_date; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN price TO event_price; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN image TO event_image; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN stock TO event_partisipant_stock; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN status TO event_status; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN detail_acara TO event_description; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE events RENAME COLUMN payment_type TO event_payment_tipe; EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Add new columns if not exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_title                     TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date                      TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_price                     TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_image                     TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_partisipant_stock         INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_status                    TEXT DEFAULT 'available';
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_description               TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_payment_tipe              TEXT DEFAULT 'regular';
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_speaker                   TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_speaker_genre             TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_upload_payment_screenshot TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS bank_info                       TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deposit_amount                  TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS proposal_event_id               TEXT;

-- Normalize event_status values
UPDATE events SET event_status = 'available' WHERE event_status IN ('aktif', 'active', 'open');
UPDATE events SET event_status = 'sold_out'  WHERE event_status IN ('sold out', 'soldout', 'full');
UPDATE events SET event_payment_tipe = 'regular' WHERE event_payment_tipe IS NULL;
UPDATE events SET event_payment_tipe = 'gratis'  WHERE event_payment_tipe IN ('free', 'Gratis');

-- ============================================================
-- EVENT REGISTRATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rename existing columns (safe)
DO $$ BEGIN ALTER TABLE event_registrations RENAME COLUMN full_name TO nama_lengkap; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE event_registrations RENAME COLUMN wa_number TO nomor_wa; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE event_registrations RENAME COLUMN camera_model TO tipe_kamera; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE event_registrations RENAME COLUMN status TO status_pendaftaran; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE event_registrations RENAME COLUMN deposit_refund_url TO bukti_pengembalian_deposit; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE event_registrations RENAME COLUMN deposit_refund_status TO status_pengembalian_deposit; EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Add columns if not exist
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS nama_lengkap                TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS nomor_wa                    TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS kabupaten_kotamadya         TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS tipe_kamera                 TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS event_name                  TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS event_id                    TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS bukti_transfer_url          TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS status_pendaftaran          TEXT DEFAULT 'menunggu_validasi';
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS payment_type                TEXT DEFAULT 'regular';
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS ticket_url                  TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS status_pengembalian_deposit TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS bukti_pengembalian_deposit  TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS rejection_reason            TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS is_attended                 BOOLEAN DEFAULT false;

-- Normalize status_pendaftaran values
UPDATE event_registrations SET status_pendaftaran = 'menunggu_validasi' WHERE status_pendaftaran IN ('Pending', 'pending', 'Pending Payment');
UPDATE event_registrations SET status_pendaftaran = 'terdaftar'         WHERE status_pendaftaran IN ('Approved', 'approved', 'Confirmed');
UPDATE event_registrations SET status_pendaftaran = 'ditolak'           WHERE status_pendaftaran IN ('Rejected', 'rejected', 'Cancelled');
