-- Hapus tabel lama (JSONB), ganti dengan kolom proper sesuai Google Form
DROP TABLE IF EXISTS transaksi_dealer;

CREATE TABLE transaksi_dealer (
  id                    bigserial PRIMARY KEY,
  row_hash              text        UNIQUE NOT NULL,
  form_timestamp        text,
  nama_toko             text,
  tanggal_penjualan     text,
  type_barang           text,
  serial_number         text,
  foto_kartu_garansi    text,
  foto_invoice          text,
  foto_box_serial       text,
  nama_sales            text,
  nomor_hp_sales        text,
  synced_at             timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_td_tanggal ON transaksi_dealer (tanggal_penjualan);
CREATE INDEX IF NOT EXISTS idx_td_nama_toko ON transaksi_dealer (nama_toko);
CREATE INDEX IF NOT EXISTS idx_td_synced_at ON transaksi_dealer (synced_at DESC);
