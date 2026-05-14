-- Tambah nilai HOLD ke validasi_by_mkt (& fa untuk konsistensi)
ALTER TABLE public.claim_promo
  DROP CONSTRAINT IF EXISTS claim_promo_validasi_by_mkt_check,
  ADD CONSTRAINT claim_promo_validasi_by_mkt_check
    CHECK (validasi_by_mkt IS NULL OR validasi_by_mkt IN ('Dalam Proses Verifikasi', 'Valid', 'Ditolak', 'HOLD'));

ALTER TABLE public.claim_promo
  DROP CONSTRAINT IF EXISTS claim_promo_validasi_by_fa_check,
  ADD CONSTRAINT claim_promo_validasi_by_fa_check
    CHECK (validasi_by_fa IS NULL OR validasi_by_fa IN ('Dalam Proses Verifikasi', 'Valid', 'Ditolak', 'HOLD'));

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_validasi_by_mkt_check,
  ADD CONSTRAINT garansi_validasi_by_mkt_check
    CHECK (validasi_by_mkt IS NULL OR validasi_by_mkt IN ('Proses Validasi', 'Valid', 'Ditolak', 'HOLD'));

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_validasi_by_fa_check,
  ADD CONSTRAINT garansi_validasi_by_fa_check
    CHECK (validasi_by_fa IS NULL OR validasi_by_fa IN ('Proses Validasi', 'Valid', 'Ditolak', 'HOLD'));
