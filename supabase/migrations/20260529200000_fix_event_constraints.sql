-- Fix kedua constraint events yang menyebabkan error saat simpan event:
--   1. events_payment_tipe_check — tambah nilai 'gratis'
--   2. events_status_check       — pastikan nilai yang diizinkan sesuai frontend

-- Bersihkan data yang tidak valid sebelum mengubah constraint
UPDATE public.events
  SET event_payment_tipe = 'regular'
  WHERE event_payment_tipe IS NOT NULL
    AND event_payment_tipe NOT IN ('regular', 'deposit', 'gratis');

UPDATE public.events
  SET event_status = 'In stock'
  WHERE event_status IS NOT NULL
    AND event_status NOT IN ('In stock', 'Out of stock', 'close');

-- Terapkan ulang kedua constraint
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_payment_tipe_check,
  ADD CONSTRAINT events_payment_tipe_check
    CHECK (event_payment_tipe IS NULL OR event_payment_tipe IN ('regular', 'deposit', 'gratis'));

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check,
  ADD CONSTRAINT events_status_check
    CHECK (event_status IS NULL OR event_status IN ('In stock', 'Out of stock', 'close'));
