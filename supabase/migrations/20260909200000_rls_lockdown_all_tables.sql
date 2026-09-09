-- ============================================================
-- RLS LOCKDOWN — tutup semua tabel dari akses anon/authenticated
-- ============================================================
-- TEMUAN AUDIT (2026-09-09):
--   Beberapa tabel bisa dibaca / ditulis / dihapus pakai ANON KEY
--   (kunci yang ikut ter-bundle di browser):
--     - data_log            : anon bisa SELECT / INSERT / DELETE  → audit trail bisa dihapus/dipalsukan
--     - chat_read_status    : anon bisa SELECT / INSERT / DELETE  → bocor id karyawan + nomor wa
--     - system_error_log    : anon bisa SELECT / DELETE           → bocor error internal / stack
--     - resi_pengiriman     : anon bisa SELECT (+ tulis?)         → bocor PII penerima (nama/kota/hp)
--     - promo_datacolor*    : anon bisa SELECT                    → promo_datacolor_orders = PII order
--     - altasolution_*      : anon bisa SELECT                    → katalog internal
--
-- SEBAB: policy "service_role_full_access" dibuat TANPA klausa `TO service_role`,
--   sehingga `USING (true)` berlaku untuk SEMUA role (anon, authenticated, service_role).
--   Selain itu beberapa tabel baru tidak pernah di-ENABLE RLS sama sekali.
--
-- STRATEGI: ENABLE RLS di SEMUA tabel public, lalu DROP semua policy
--   KECUALI dua policy read-publik yang memang disengaja (events + promosi,
--   dipakai landing page). service_role punya atribut BYPASSRLS → semua API
--   route (semuanya pakai SUPABASE_SERVICE_ROLE_KEY) tetap jalan normal.
--   (Tidak pakai FORCE ROW LEVEL SECURITY supaya role `postgres`/owner —
--    yang dipakai migration & SQL editor — tidak ikut terkunci.)
-- ============================================================

DO $$
DECLARE
  r RECORD;
  keep_policies TEXT[] := ARRAY['events_public_read', 'promosi_public_read'];
BEGIN
  -- 1. ENABLE RLS pada semua base table di schema public
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;

  -- 2. DROP semua policy yang tidak ada di whitelist
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND NOT (policyname = ANY(keep_policies))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. Pastikan policy read-publik yang disengaja tetap ada (idempotent).
--    events: hanya event yang tampil publik. promosi: semua (dipakai /promo).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events' AND policyname='events_public_read') THEN
    CREATE POLICY "events_public_read" ON public.events
      FOR SELECT TO anon
      USING (event_status IS NOT NULL AND event_status NOT IN ('close', 'Out of stock'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promosi' AND policyname='promosi_public_read') THEN
    CREATE POLICY "promosi_public_read" ON public.promosi
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- 4. VERIFIKASI (opsional — lihat hasil di output):
--    Semua tabel harus rowsecurity=true; policy_count 0 kecuali events & promosi = 1.
SELECT t.tablename, t.rowsecurity AS rls_enabled, COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY policy_count DESC, t.tablename;
