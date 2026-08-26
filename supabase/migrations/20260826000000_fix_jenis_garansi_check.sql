-- Perbaiki CHECK constraint jenis_garansi.
-- Constraint lama (20260513100000) izinkan 7 nilai (Jasa 30/50/100%, Sparepart 30/50/100%, Full)
-- yang ternyata tidak pernah sesuai kebutuhan bisnis nyata — sisa dari salah tebak awal.
-- Nilai yang benar cuma 3:
--   'Jasa 30%'         -> diskon jasa service, berlaku setelah masa garansi normal habis (maks 2 tahun)
--   '1 Tahun'          -> garansi normal 1 tahun
--   'Extended 2 Years' -> garansi diperpanjang 2 tahun (nilai ini sudah dipakai 98 baris data lama)

-- Remap hasil import "New Warranty DB.xlsx" (26 Aug 2026) yang sempat diisi jenis_garansi='Full'
-- karena saat itu constraint lama belum diperbaiki.
UPDATE public.garansi SET jenis_garansi = 'Extended 2 Years'
  WHERE jenis_garansi = 'Full' AND lama_garansi = '2 Tahun';
UPDATE public.garansi SET jenis_garansi = '1 Tahun'
  WHERE jenis_garansi = 'Full' AND lama_garansi = '1 Tahun';

-- Jaga-jaga: nilai lain yang tidak match aturan baru dikosongkan saja (tidak ada asumsi aman untuk di-remap)
UPDATE public.garansi SET jenis_garansi = NULL
  WHERE jenis_garansi IS NOT NULL AND jenis_garansi NOT IN ('Jasa 30%', '1 Tahun', 'Extended 2 Years');

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_jenis_garansi_check,
  ADD CONSTRAINT garansi_jenis_garansi_check
    CHECK (jenis_garansi IS NULL OR jenis_garansi IN ('Jasa 30%', '1 Tahun', 'Extended 2 Years'));
