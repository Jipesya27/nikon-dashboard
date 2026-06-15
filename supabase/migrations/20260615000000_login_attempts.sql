-- Rate limiting berbasis DB untuk login & forgot-password
-- Efektif di Vercel serverless (in-memory Map tidak shared antar instance)

create table if not exists login_attempts (
  ip        text        primary key,
  count     int         not null default 1,
  reset_at  timestamptz not null
);

-- Tidak perlu index tambahan — ip adalah primary key

-- Auto-cleanup baris lama via pg_cron (tiap jam hapus yang sudah expired > 1 jam)
-- Jalankan hanya jika pg_cron tersedia di project ini
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup-login-attempts',
      '0 * * * *',
      $$delete from login_attempts where reset_at < now() - interval '1 hour'$$
    );
  end if;
end $$;
