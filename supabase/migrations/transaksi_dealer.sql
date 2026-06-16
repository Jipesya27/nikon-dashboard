-- Tabel transaksi_dealer
-- row_hash = SHA256 dari isi baris (untuk deduplikasi otomatis)
-- row_data = semua kolom dari Google Sheet disimpan sebagai key-value JSON

CREATE TABLE IF NOT EXISTS transaksi_dealer (
  id          bigserial PRIMARY KEY,
  row_hash    text        UNIQUE NOT NULL,
  row_data    jsonb       NOT NULL,
  synced_at   timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaksi_dealer_row_data_tanggal
  ON transaksi_dealer ((row_data->>'tanggal_penjualan'));

CREATE INDEX IF NOT EXISTS idx_transaksi_dealer_synced_at
  ON transaksi_dealer (synced_at DESC);
