-- Tabel produk marketplace AltaSolution (www.altanikindo.com/altasolution)
CREATE TABLE IF NOT EXISTS altasolution_products (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  nama_produk     TEXT        NOT NULL,
  gambar_url      TEXT,                                          -- Google Drive URL
  detail          TEXT                    DEFAULT '',
  harga           BIGINT      NOT NULL    DEFAULT 0,
  harga_promo     BIGINT,                                        -- NULL = tidak ada promo
  link_pembelian  TEXT,                                          -- opsional, link marketplace/toko eksternal
  is_active       BOOLEAN     NOT NULL    DEFAULT true,
  urutan          INTEGER     NOT NULL    DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_altasolution_products_active ON altasolution_products(is_active, urutan);
