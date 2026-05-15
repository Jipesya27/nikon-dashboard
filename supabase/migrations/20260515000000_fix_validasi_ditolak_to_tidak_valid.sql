-- Sinkronkan nilai 'Ditolak' → 'Tidak Valid' di semua tabel & constraint.
-- Urutan: DROP constraint dulu, UPDATE data, baru ADD constraint baru.

-- ================================================================
-- 1. Drop semua constraint lama dulu (supaya UPDATE tidak diblokir)
-- ================================================================

ALTER TABLE public.claim_promo
  DROP CONSTRAINT IF EXISTS claim_promo_validasi_by_mkt_check,
  DROP CONSTRAINT IF EXISTS claim_promo_validasi_by_fa_check;

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_validasi_by_mkt_check,
  DROP CONSTRAINT IF EXISTS garansi_validasi_by_fa_check,
  DROP CONSTRAINT IF EXISTS garansi_status_validasi_check;

-- ================================================================
-- 2. Migrasi data lama
-- ================================================================

-- claim_promo
UPDATE public.claim_promo SET validasi_by_mkt = 'Tidak Valid' WHERE validasi_by_mkt = 'Ditolak';
UPDATE public.claim_promo SET validasi_by_fa  = 'Tidak Valid' WHERE validasi_by_fa  = 'Ditolak';

-- garansi: 'Ditolak' → 'Tidak Valid', 'Proses Validasi' → 'Dalam Proses Verifikasi'
UPDATE public.garansi SET validasi_by_mkt = 'Tidak Valid'             WHERE validasi_by_mkt = 'Ditolak';
UPDATE public.garansi SET validasi_by_mkt = 'Dalam Proses Verifikasi' WHERE validasi_by_mkt = 'Proses Validasi';
UPDATE public.garansi SET validasi_by_fa  = 'Tidak Valid'             WHERE validasi_by_fa  = 'Ditolak';
UPDATE public.garansi SET validasi_by_fa  = 'Dalam Proses Verifikasi' WHERE validasi_by_fa  = 'Proses Validasi';
UPDATE public.garansi SET status_validasi = 'Tidak Valid'             WHERE status_validasi = 'Ditolak';

-- ================================================================
-- 3. Pasang constraint baru yang sesuai UI (enums.ts)
-- ================================================================

ALTER TABLE public.claim_promo
  ADD CONSTRAINT claim_promo_validasi_by_mkt_check
    CHECK (validasi_by_mkt IS NULL OR validasi_by_mkt IN (
      'Dalam Proses Verifikasi', 'Valid', 'Tidak Valid', 'HOLD'
    ));

ALTER TABLE public.claim_promo
  ADD CONSTRAINT claim_promo_validasi_by_fa_check
    CHECK (validasi_by_fa IS NULL OR validasi_by_fa IN (
      'Dalam Proses Verifikasi', 'Valid', 'Tidak Valid', 'HOLD'
    ));

ALTER TABLE public.garansi
  ADD CONSTRAINT garansi_validasi_by_mkt_check
    CHECK (validasi_by_mkt IS NULL OR validasi_by_mkt IN (
      'Dalam Proses Verifikasi', 'Valid', 'Tidak Valid', 'HOLD'
    ));

ALTER TABLE public.garansi
  ADD CONSTRAINT garansi_validasi_by_fa_check
    CHECK (validasi_by_fa IS NULL OR validasi_by_fa IN (
      'Dalam Proses Verifikasi', 'Valid', 'Tidak Valid', 'HOLD'
    ));

ALTER TABLE public.garansi
  ADD CONSTRAINT garansi_status_validasi_check
    CHECK (status_validasi IS NULL OR status_validasi IN (
      'Menunggu', 'Proses Validasi', 'Valid', 'Tidak Valid'
    ));
