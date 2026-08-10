-- Master data Kategori & Brand untuk marketplace AltaSolution
CREATE TABLE IF NOT EXISTS altasolution_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  nama        TEXT        NOT NULL UNIQUE,
  urutan      INTEGER     NOT NULL    DEFAULT 0
);

CREATE TABLE IF NOT EXISTS altasolution_brands (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  nama        TEXT        NOT NULL UNIQUE,
  urutan      INTEGER     NOT NULL    DEFAULT 0
);

ALTER TABLE altasolution_products ADD COLUMN IF NOT EXISTS kategori TEXT;
ALTER TABLE altasolution_products ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS idx_altasolution_products_kategori ON altasolution_products(kategori);
CREATE INDEX IF NOT EXISTS idx_altasolution_products_brand ON altasolution_products(brand);
CREATE INDEX IF NOT EXISTS idx_altasolution_categories_urutan ON altasolution_categories(urutan);
CREATE INDEX IF NOT EXISTS idx_altasolution_brands_urutan ON altasolution_brands(urutan);
