-- Tambah nilai 'partial' ke constraint status_peminjaman
-- Status partial = sebagian barang/aksesori belum dikembalikan

ALTER TABLE peminjaman_barang
  DROP CONSTRAINT IF EXISTS peminjaman_status_check,
  ADD CONSTRAINT peminjaman_status_check
    CHECK (status_peminjaman IS NULL OR status_peminjaman IN ('aktif','partial','selesai'));
