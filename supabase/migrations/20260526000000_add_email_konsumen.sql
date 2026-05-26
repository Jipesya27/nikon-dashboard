-- Tambah kolom email ke tabel konsumen
-- Nullable agar data lama tidak terpengaruh
-- Form claim & garansi akan meminta email mulai sekarang

ALTER TABLE konsumen
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- Index untuk pencarian / lookup by email (opsional)
CREATE INDEX IF NOT EXISTS idx_konsumen_email ON konsumen (email);

COMMENT ON COLUMN konsumen.email IS 'Alamat email konsumen — backup notifikasi jika WhatsApp tidak aktif';
