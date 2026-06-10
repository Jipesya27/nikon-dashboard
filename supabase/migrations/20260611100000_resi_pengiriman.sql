CREATE TABLE IF NOT EXISTS resi_pengiriman (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     TEXT        NOT NULL DEFAULT '',
  nama_pembuat   TEXT        NOT NULL DEFAULT '',
  tanggal_kirim  DATE        NOT NULL DEFAULT CURRENT_DATE,
  nama_expedisi  TEXT        NOT NULL DEFAULT '',
  file_url       TEXT        NOT NULL DEFAULT '',
  file_name      TEXT        NOT NULL DEFAULT '',
  catatan        TEXT                 DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_resi_created_by ON resi_pengiriman(created_by);
CREATE INDEX IF NOT EXISTS idx_resi_tanggal    ON resi_pengiriman(tanggal_kirim DESC);
