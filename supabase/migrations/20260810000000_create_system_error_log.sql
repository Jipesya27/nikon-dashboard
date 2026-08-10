-- System error log: histori kesalahan backend (API routes & edge functions)
-- supaya bisa dipantau & diidentifikasi dari dashboard, bukan cuma console.error
-- yang hilang begitu proses selesai.
CREATE TABLE IF NOT EXISTS system_error_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  source       text NOT NULL,
  severity     text NOT NULL DEFAULT 'error' CHECK (severity IN ('error', 'warning')),
  message      text NOT NULL,
  detail       jsonb NOT NULL DEFAULT '{}',
  resolved     boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS system_error_log_source_idx     ON system_error_log (source);
CREATE INDEX IF NOT EXISTS system_error_log_created_at_idx ON system_error_log (created_at DESC);
CREATE INDEX IF NOT EXISTS system_error_log_resolved_idx   ON system_error_log (resolved) WHERE resolved = false;

-- Hanya service role yang boleh baca/tulis; tidak ada akses publik/anon
ALTER TABLE system_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON system_error_log
  USING (true)
  WITH CHECK (true);
