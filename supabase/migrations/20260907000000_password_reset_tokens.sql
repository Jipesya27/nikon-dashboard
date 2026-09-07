-- Token reset password self-service (alur "Lupa Password" → email → link reset).
-- Token asli TIDAK disimpan; hanya SHA-256 hash-nya. Link berlaku 1 jam & sekali pakai.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_karyawan  uuid NOT NULL REFERENCES karyawan(id_karyawan) ON DELETE CASCADE,
  token_hash   text NOT NULL,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_hash_idx     ON password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS password_reset_tokens_karyawan_idx ON password_reset_tokens (id_karyawan);

-- Hanya service role (dipakai server-side di API route). Tidak ada akses anon/publik.
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON password_reset_tokens
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup token kadaluarsa (jika pg_cron tersedia).
-- Tag dollar-quote berbeda ($do$ / $job$) supaya string SQL di dalam tidak menutup blok DO.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-password-reset-tokens',
      '15 * * * *',
      $job$DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day'$job$
    );
  END IF;
END
$do$;
