-- ============================================================
-- RLS SECURITY HARDENING — Alta Nikindo Dashboard
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/hfqnlttxxrqarmpvtnhu/sql
-- ============================================================
-- SEMUA tabel sebelumnya terbuka ke publik (anon key).
-- Script ini mengaktifkan RLS dan memblokir semua akses anon.
-- API routes sudah menggunakan service_role key yang bypass RLS.
-- ============================================================

-- 1. ENABLE RLS pada semua tabel
ALTER TABLE IF EXISTS public.konsumen              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.karyawan              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.claim_promo           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.garansi               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promosi               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.riwayat_pesan         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pengaturan_bot        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_skema       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_penjualan   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_approvals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.peminjaman_barang     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.barang_aset           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.data_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.status_service        ENABLE ROW LEVEL SECURITY;

-- 2. HAPUS semua policy lama (kalau ada) agar tidak konflik
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 3. FORCE RLS untuk role postgres (owner) juga
ALTER TABLE IF EXISTS public.konsumen              FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.karyawan              FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.riwayat_pesan         FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pengaturan_bot        FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.claim_promo           FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.garansi               FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_registrations   FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliates            FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_skema       FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_penjualan   FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_approvals      FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.peminjaman_barang     FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.barang_aset           FORCE ROW LEVEL SECURITY;

-- 4. POLICY: service_role bisa semua hal (sudah bypass RLS by default,
--    tapi kita tambah explicit policy untuk kejelasan)
--    NOTE: service_role sudah bypass RLS secara default di Supabase,
--    jadi policy ini sebenarnya tidak diperlukan tapi tidak ada ruginya.

-- 5. POLICY: anon dan authenticated TIDAK bisa baca/tulis tabel sensitif
--    (Default deny setelah RLS enabled tanpa policy = tidak bisa akses)
--
--    Tabel SENSITIF (tidak ada akses publik):
--    konsumen, karyawan, riwayat_pesan, pengaturan_bot,
--    affiliates, affiliate_skema, affiliate_penjualan,
--    budget_approvals, budget_items, peminjaman_barang, barang_aset,
--    claim_promo, garansi, event_registrations, data_logs, status_service

-- 6. POLICY: events bisa dibaca anon (untuk halaman registrasi publik)
CREATE POLICY "events_public_read"
  ON public.events
  FOR SELECT
  TO anon
  USING (
    event_status NOT IN ('close', 'Out of stock')
    AND event_status IS NOT NULL
  );

-- 7. POLICY: promosi bisa dibaca anon (untuk halaman publik)
CREATE POLICY "promosi_public_read"
  ON public.promosi
  FOR SELECT
  TO anon
  USING (true);

-- 8. Semua tabel lainnya: NO POLICY = DENY ALL untuk anon/authenticated
-- (RLS dengan tidak ada policy = tidak bisa akses apapun)

-- ============================================================
-- VERIFIKASI — jalankan ini setelah setup untuk konfirmasi
-- ============================================================
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
