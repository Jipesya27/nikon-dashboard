-- Tambah kolom detail alamat pengiriman hadiah
-- alamat_pengiriman sudah ada (jalan/RT/RW), tambah kolom terpisah untuk wilayah

ALTER TABLE claim_promo
  ADD COLUMN IF NOT EXISTS kelurahan_pengiriman  text,
  ADD COLUMN IF NOT EXISTS kecamatan_pengiriman  text,
  ADD COLUMN IF NOT EXISTS kabupaten_pengiriman  text,
  ADD COLUMN IF NOT EXISTS provinsi_pengiriman   text,
  ADD COLUMN IF NOT EXISTS kodepos_pengiriman    text;
