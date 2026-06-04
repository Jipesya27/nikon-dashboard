ALTER TABLE public.peminjaman_barang
  ADD COLUMN IF NOT EXISTS foto_penerimaan TEXT[],
  ADD COLUMN IF NOT EXISTS foto_pengembalian TEXT[];
