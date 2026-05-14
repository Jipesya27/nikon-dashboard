-- Enforce konsistensi nilai pada kolom dengan opsi terbatas via CHECK constraints.
-- Pakai CHECK (bukan ENUM type) supaya gampang tambah/ubah value tanpa migration rumit.
-- Semua constraint pakai 'NOT VALID' supaya data lama yang nilai-nya tidak match tidak block migration,
-- baru di-validate setelah cleanup manual.

-- ============ claim_promo ============
-- Bersihkan data lama: normalisasi nilai validasi yg lama ke set baru
UPDATE public.claim_promo SET validasi_by_mkt = 'Dalam Proses Verifikasi'
  WHERE validasi_by_mkt IS NOT NULL AND validasi_by_mkt NOT IN ('Dalam Proses Verifikasi', 'Valid', 'Ditolak');
UPDATE public.claim_promo SET validasi_by_fa = 'Dalam Proses Verifikasi'
  WHERE validasi_by_fa IS NOT NULL AND validasi_by_fa NOT IN ('Dalam Proses Verifikasi', 'Valid', 'Ditolak');

ALTER TABLE public.claim_promo
  DROP CONSTRAINT IF EXISTS claim_promo_validasi_by_mkt_check,
  ADD CONSTRAINT claim_promo_validasi_by_mkt_check
    CHECK (validasi_by_mkt IS NULL OR validasi_by_mkt IN ('Dalam Proses Verifikasi', 'Valid', 'Ditolak'));

ALTER TABLE public.claim_promo
  DROP CONSTRAINT IF EXISTS claim_promo_validasi_by_fa_check,
  ADD CONSTRAINT claim_promo_validasi_by_fa_check
    CHECK (validasi_by_fa IS NULL OR validasi_by_fa IN ('Dalam Proses Verifikasi', 'Valid', 'Ditolak'));

-- ============ garansi ============
UPDATE public.garansi SET status_validasi = 'Menunggu'
  WHERE status_validasi IS NOT NULL AND status_validasi NOT IN ('Menunggu', 'Proses Validasi', 'Valid', 'Ditolak');
UPDATE public.garansi SET validasi_by_mkt = NULL
  WHERE validasi_by_mkt IS NOT NULL AND validasi_by_mkt NOT IN ('Proses Validasi', 'Valid', 'Ditolak');
UPDATE public.garansi SET validasi_by_fa = NULL
  WHERE validasi_by_fa IS NOT NULL AND validasi_by_fa NOT IN ('Proses Validasi', 'Valid', 'Ditolak');
UPDATE public.garansi SET jenis_garansi = 'Jasa 30%'
  WHERE jenis_garansi IS NOT NULL AND jenis_garansi NOT IN ('Jasa 30%','Jasa 50%','Jasa 100%','Sparepart 30%','Sparepart 50%','Sparepart 100%','Full');
UPDATE public.garansi SET lama_garansi = '1 Tahun'
  WHERE lama_garansi IS NOT NULL AND lama_garansi NOT IN ('6 Bulan','1 Tahun','2 Tahun','3 Tahun');

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_status_validasi_check,
  ADD CONSTRAINT garansi_status_validasi_check
    CHECK (status_validasi IS NULL OR status_validasi IN ('Menunggu', 'Proses Validasi', 'Valid', 'Ditolak'));

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_validasi_by_mkt_check,
  ADD CONSTRAINT garansi_validasi_by_mkt_check
    CHECK (validasi_by_mkt IS NULL OR validasi_by_mkt IN ('Proses Validasi', 'Valid', 'Ditolak'));

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_validasi_by_fa_check,
  ADD CONSTRAINT garansi_validasi_by_fa_check
    CHECK (validasi_by_fa IS NULL OR validasi_by_fa IN ('Proses Validasi', 'Valid', 'Ditolak'));

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_jenis_garansi_check,
  ADD CONSTRAINT garansi_jenis_garansi_check
    CHECK (jenis_garansi IS NULL OR jenis_garansi IN ('Jasa 30%','Jasa 50%','Jasa 100%','Sparepart 30%','Sparepart 50%','Sparepart 100%','Full'));

ALTER TABLE public.garansi
  DROP CONSTRAINT IF EXISTS garansi_lama_garansi_check,
  ADD CONSTRAINT garansi_lama_garansi_check
    CHECK (lama_garansi IS NULL OR lama_garansi IN ('6 Bulan','1 Tahun','2 Tahun','3 Tahun'));

-- ============ status_service ============
UPDATE public.status_service SET status_service = 'Diterima'
  WHERE status_service IS NOT NULL AND status_service NOT IN (
    'Diterima','Pengecekan oleh Teknisi','Menunggu Sparepart','Dalam Pengerjaan',
    'Quality Check','Siap Diambil','Selesai','Tidak Bisa Diperbaiki','Dibatalkan');

ALTER TABLE public.status_service
  DROP CONSTRAINT IF EXISTS status_service_status_check,
  ADD CONSTRAINT status_service_status_check
    CHECK (status_service IS NULL OR status_service IN (
      'Diterima','Pengecekan oleh Teknisi','Menunggu Sparepart','Dalam Pengerjaan',
      'Quality Check','Siap Diambil','Selesai','Tidak Bisa Diperbaiki','Dibatalkan'));

-- ============ peminjaman_barang ============
UPDATE public.peminjaman_barang SET status_peminjaman = 'aktif'
  WHERE status_peminjaman IS NOT NULL AND status_peminjaman NOT IN ('aktif','selesai');

ALTER TABLE public.peminjaman_barang
  DROP CONSTRAINT IF EXISTS peminjaman_status_check,
  ADD CONSTRAINT peminjaman_status_check
    CHECK (status_peminjaman IS NULL OR status_peminjaman IN ('aktif','selesai'));

-- ============ events ============
UPDATE public.events SET event_status = 'In stock'
  WHERE event_status IS NOT NULL AND event_status NOT IN ('In stock','Out of stock','close');
UPDATE public.events SET event_payment_tipe = 'regular'
  WHERE event_payment_tipe IS NOT NULL AND event_payment_tipe NOT IN ('regular','deposit');

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check,
  ADD CONSTRAINT events_status_check
    CHECK (event_status IS NULL OR event_status IN ('In stock','Out of stock','close'));

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_payment_tipe_check,
  ADD CONSTRAINT events_payment_tipe_check
    CHECK (event_payment_tipe IS NULL OR event_payment_tipe IN ('regular','deposit'));

-- ============ event_registrations ============
UPDATE public.event_registrations SET status_pendaftaran = 'menunggu_validasi'
  WHERE status_pendaftaran IS NOT NULL AND status_pendaftaran NOT IN ('menunggu_validasi','terdaftar','ditolak');
UPDATE public.event_registrations SET payment_type = 'regular'
  WHERE payment_type IS NOT NULL AND payment_type NOT IN ('regular','deposit');
UPDATE public.event_registrations SET status_pengembalian_deposit = NULL
  WHERE status_pengembalian_deposit IS NOT NULL
    AND status_pengembalian_deposit NOT IN ('Diminta','Diproses','Sudah Dikembalikan','Ditolak');

ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_reg_status_pendaftaran_check,
  ADD CONSTRAINT event_reg_status_pendaftaran_check
    CHECK (status_pendaftaran IS NULL OR status_pendaftaran IN ('menunggu_validasi','terdaftar','ditolak'));

ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_reg_payment_type_check,
  ADD CONSTRAINT event_reg_payment_type_check
    CHECK (payment_type IS NULL OR payment_type IN ('regular','deposit'));

ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_reg_status_refund_check,
  ADD CONSTRAINT event_reg_status_refund_check
    CHECK (status_pengembalian_deposit IS NULL OR status_pengembalian_deposit IN (
      'Diminta','Diproses','Sudah Dikembalikan','Ditolak'));

-- ============ karyawan ============
UPDATE public.karyawan SET role = 'Karyawan'
  WHERE role IS NOT NULL AND role NOT IN ('Admin','Customer Service','Marketing','Finance','Service','Karyawan');

ALTER TABLE public.karyawan
  DROP CONSTRAINT IF EXISTS karyawan_role_check,
  ADD CONSTRAINT karyawan_role_check
    CHECK (role IS NULL OR role IN ('Admin','Customer Service','Marketing','Finance','Service','Karyawan'));

-- ============ budget_approval ============
UPDATE public.budget_approval SET mgt_consent = NULL
  WHERE mgt_consent IS NOT NULL AND mgt_consent NOT IN ('Approved','Rejected','Pending Review','Need Revision');
UPDATE public.budget_approval SET finance_consent = NULL
  WHERE finance_consent IS NOT NULL AND finance_consent NOT IN ('Approved','Rejected','Pending Review','Need Revision');
UPDATE public.budget_approval SET budget_source = 'Marketing Budget'
  WHERE budget_source IS NOT NULL AND budget_source NOT IN ('Marketing Budget','Operational Budget','Event Budget','Service Budget','Other');

ALTER TABLE public.budget_approval
  DROP CONSTRAINT IF EXISTS budget_mgt_consent_check,
  ADD CONSTRAINT budget_mgt_consent_check
    CHECK (mgt_consent IS NULL OR mgt_consent IN ('Approved','Rejected','Pending Review','Need Revision'));

ALTER TABLE public.budget_approval
  DROP CONSTRAINT IF EXISTS budget_finance_consent_check,
  ADD CONSTRAINT budget_finance_consent_check
    CHECK (finance_consent IS NULL OR finance_consent IN ('Approved','Rejected','Pending Review','Need Revision'));

ALTER TABLE public.budget_approval
  DROP CONSTRAINT IF EXISTS budget_source_check,
  ADD CONSTRAINT budget_source_check
    CHECK (budget_source IS NULL OR budget_source IN ('Marketing Budget','Operational Budget','Event Budget','Service Budget','Other'));
