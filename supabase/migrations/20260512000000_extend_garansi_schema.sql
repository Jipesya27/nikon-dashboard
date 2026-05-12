-- Perluas skema garansi agar selaras dengan claim_promo
-- Tambah kolom untuk tracking pemilik (nomor_wa), toko, validasi MKT/FA, & nomor_wa_update

ALTER TABLE public.garansi
  ADD COLUMN IF NOT EXISTS nomor_wa TEXT,
  ADD COLUMN IF NOT EXISTS nomor_wa_update TEXT,
  ADD COLUMN IF NOT EXISTS nama_pendaftar TEXT,
  ADD COLUMN IF NOT EXISTS nama_toko TEXT,
  ADD COLUMN IF NOT EXISTS validasi_by_mkt TEXT,
  ADD COLUMN IF NOT EXISTS validasi_by_fa TEXT,
  ADD COLUMN IF NOT EXISTS catatan_mkt TEXT,
  ADD COLUMN IF NOT EXISTS catatan_fa TEXT;

-- Index untuk query lookup by nomor_wa (cek status / fetch by user)
CREATE INDEX IF NOT EXISTS idx_garansi_nomor_wa ON public.garansi (nomor_wa);
CREATE INDEX IF NOT EXISTS idx_garansi_nomor_seri ON public.garansi (nomor_seri);

-- Backfill validasi: kalau status_validasi sudah 'Valid', anggap MKT & FA juga Valid
UPDATE public.garansi
SET validasi_by_mkt = COALESCE(validasi_by_mkt, status_validasi),
    validasi_by_fa  = COALESCE(validasi_by_fa, status_validasi)
WHERE status_validasi IS NOT NULL;
