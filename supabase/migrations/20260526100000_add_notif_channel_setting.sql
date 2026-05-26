-- Tambahkan entri default notif_channel ke pengaturan_bot jika belum ada.
-- Nilai: 'wa_only' | 'email_only' | 'wa_and_email'
INSERT INTO pengaturan_bot (nama_pengaturan, description, url_file)
VALUES ('notif_channel', 'wa_only', NULL)
ON CONFLICT (nama_pengaturan) DO NOTHING;

-- Placeholder untuk email admin (opsional, bisa diisi via admin UI)
INSERT INTO pengaturan_bot (nama_pengaturan, description, url_file)
VALUES ('admin_email', '', NULL)
ON CONFLICT (nama_pengaturan) DO NOTHING;

COMMENT ON TABLE pengaturan_bot IS 'Key-value store untuk pengaturan bot & sistem. notif_channel: wa_only|email_only|wa_and_email';
