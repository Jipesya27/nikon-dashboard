-- Audit trail lebih lengkap untuk "IT check and review".
--
-- 1. data_log.note  — alasan/keterangan bebas untuk tiap perubahan (mis. "koreksi
--    salah approve", "kirim ulang tiket"). Diisi oleh endpoint yang sadar-audit.
-- 2. event_registrations.last_action_* — jejak perubahan terakhir langsung di baris
--    peserta supaya admin lihat "diubah oleh siapa & kapan" tanpa buka Log Aktivitas.

ALTER TABLE public.data_log
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS last_action_by   TEXT,
  ADD COLUMN IF NOT EXISTS last_action_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_action_note TEXT;

COMMENT ON COLUMN public.data_log.note
  IS 'Alasan / keterangan perubahan (free text) untuk review IT.';
COMMENT ON COLUMN public.event_registrations.last_action_by
  IS 'Nama akun admin yang melakukan perubahan terakhir pada baris ini.';
COMMENT ON COLUMN public.event_registrations.last_action_at
  IS 'Timestamp perubahan terakhir (approve/reject/ubah status/kirim tiket).';
COMMENT ON COLUMN public.event_registrations.last_action_note
  IS 'Ringkasan perubahan terakhir, mis. "Status: terdaftar -> menunggu_validasi (koreksi salah approve)".';
