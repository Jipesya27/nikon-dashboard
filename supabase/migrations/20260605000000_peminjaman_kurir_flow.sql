-- Skema pengiriman barang: kode peminjaman, kurir flow, penerima flow
-- Dibuat: 2026-06-05

-- 1. Tambah kolom baru ke peminjaman_barang
ALTER TABLE public.peminjaman_barang
  ADD COLUMN IF NOT EXISTS kode_peminjaman    VARCHAR(5)   UNIQUE,
  ADD COLUMN IF NOT EXISTS status_pengiriman  TEXT         NOT NULL DEFAULT 'menunggu',
  ADD COLUMN IF NOT EXISTS id_kurir           UUID         REFERENCES public.karyawan(id_karyawan) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tanggal_dikirim    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tanggal_diterima   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS foto_kondisi_kurir     TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS foto_bukti_pengiriman  TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS foto_kondisi_penerima  TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS catatan_penerima   TEXT;

-- 2. CHECK constraint status_pengiriman
ALTER TABLE public.peminjaman_barang
  ADD CONSTRAINT peminjaman_status_pengiriman_check
    CHECK (status_pengiriman IN ('menunggu', 'dikirim', 'terkirim'));

-- 3. Index untuk lookup cepat kode_peminjaman
CREATE INDEX IF NOT EXISTS idx_peminjaman_kode
  ON public.peminjaman_barang (kode_peminjaman)
  WHERE kode_peminjaman IS NOT NULL;

-- 4. Tambah role Kurir ke check constraint karyawan (jika ada)
-- (Tidak ada enum di DB untuk role, jadi tidak perlu migrasi tambahan)
