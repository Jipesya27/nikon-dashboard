-- Tambahkan kolom estimasi tanggal pengembalian + tracking reminder otomatis
ALTER TABLE public.peminjaman_barang
  ADD COLUMN IF NOT EXISTS tanggal_estimasi_pengembalian TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Index untuk query cron reminder (cari yang aktif & belum reminder)
CREATE INDEX IF NOT EXISTS idx_peminjaman_active_estimasi
  ON public.peminjaman_barang (tanggal_estimasi_pengembalian)
  WHERE status_peminjaman = 'aktif' AND reminder_sent_at IS NULL;
