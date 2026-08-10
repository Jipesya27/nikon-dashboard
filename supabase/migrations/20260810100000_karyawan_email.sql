-- Email karyawan — dipakai sebagai channel alternatif untuk reset password
ALTER TABLE karyawan ADD COLUMN IF NOT EXISTS email text;
