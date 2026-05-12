-- Jadwalkan cron harian untuk panggil Edge Function lending-reminder
-- Membutuhkan pg_cron & pg_net extension (sudah default di Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Hapus job lama (kalau pernah dibuat) supaya idempotent
DO $$ BEGIN
  PERFORM cron.unschedule('lending-reminder-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Jalan setiap hari jam 09:00 WIB (= 02:00 UTC)
-- Pakai anon key (function deployed --no-verify-jwt)
SELECT cron.schedule(
  'lending-reminder-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hfqnlttxxrqarmpvtnhu.supabase.co/functions/v1/lending-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcW5sdHR4eHJxYXJtcHZ0bmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NDc0MTUsImV4cCI6MjA5MjMyMzQxNX0.diaYizgGiy2r6vlURrREP9W7TxE0OFF3vAaA19ptn0s'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $$
);
