-- Tambah nilai 'gratis' ke constraint event_payment_tipe untuk mendukung event gratis.
-- Sebelumnya hanya 'regular' dan 'deposit' yang diizinkan.

UPDATE public.events
  SET event_payment_tipe = 'regular'
  WHERE event_payment_tipe IS NOT NULL
    AND event_payment_tipe NOT IN ('regular', 'deposit', 'gratis');

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_payment_tipe_check,
  ADD CONSTRAINT events_payment_tipe_check
    CHECK (event_payment_tipe IS NULL OR event_payment_tipe IN ('regular', 'deposit', 'gratis'));
