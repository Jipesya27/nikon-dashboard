-- Status pengiriman tiket event ke peserta.
-- `ticket_url`  = tiket PDF sudah digenerate (ada di Google Drive)
-- `ticket_sent_at` = tiket terakhir BERHASIL dikirim ke WhatsApp peserta (template Meta accepted)
-- Dashboard "Data Peserta" pakai kolom ini untuk badge status + tombol "Kirim Tiket" manual.

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS ticket_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.event_registrations.ticket_sent_at
  IS 'Waktu tiket event terakhir berhasil dikirim ke peserta via WhatsApp (Meta template accepted). NULL = belum pernah terkirim.';
