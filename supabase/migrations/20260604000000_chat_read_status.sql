-- Track per-user per-contact last-read timestamp so unread counts sync across devices
CREATE TABLE IF NOT EXISTS chat_read_status (
  id_karyawan  text        NOT NULL,
  nomor_wa     text        NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_karyawan, nomor_wa)
);

ALTER TABLE chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON chat_read_status
  USING (true)
  WITH CHECK (true);
