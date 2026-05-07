-- Konversi URL Google Drive lama ke format embed baru
-- Format lama (deprecated, return halaman virus-scan):
--   https://drive.google.com/uc?id=FILEID&export=view
-- Format baru (langsung serve gambar):
--   https://lh3.googleusercontent.com/d/FILEID=w2000

UPDATE events
SET event_image = 'https://lh3.googleusercontent.com/d/' || substring(event_image FROM 'id=([a-zA-Z0-9_-]+)') || '=w2000'
WHERE event_image LIKE 'https://drive.google.com/uc?id=%';

UPDATE events
SET event_upload_payment_screenshot = 'https://lh3.googleusercontent.com/d/' || substring(event_upload_payment_screenshot FROM 'id=([a-zA-Z0-9_-]+)') || '=w2000'
WHERE event_upload_payment_screenshot LIKE 'https://drive.google.com/uc?id=%';

UPDATE event_registrations
SET bukti_transfer_url = 'https://lh3.googleusercontent.com/d/' || substring(bukti_transfer_url FROM 'id=([a-zA-Z0-9_-]+)') || '=w2000'
WHERE bukti_transfer_url LIKE 'https://drive.google.com/uc?id=%';

UPDATE event_registrations
SET bukti_pengembalian_deposit = 'https://lh3.googleusercontent.com/d/' || substring(bukti_pengembalian_deposit FROM 'id=([a-zA-Z0-9_-]+)') || '=w2000'
WHERE bukti_pengembalian_deposit LIKE 'https://drive.google.com/uc?id=%';
