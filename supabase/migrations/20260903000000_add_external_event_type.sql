-- Skema "redirect eksternal": event yang pendaftarannya diarahkan ke pihak lain via WA,
-- bukan ditangani lewat form internal. Dashboard nikon hanya jadi landing page/etalase.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS external_wa_number TEXT,
  ADD COLUMN IF NOT EXISTS redirect_click_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_payment_tipe_check,
  ADD CONSTRAINT events_payment_tipe_check
    CHECK (event_payment_tipe IS NULL OR event_payment_tipe IN ('regular', 'deposit', 'gratis', 'external'));
