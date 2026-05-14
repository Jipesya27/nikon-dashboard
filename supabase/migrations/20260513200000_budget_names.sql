-- Tambah kolom nama untuk PROPOSED / MANAGEMENT (3 nama) / FINANCE di budget_approval
-- Supaya tiap proposal bisa punya orang berbeda yang approve
ALTER TABLE public.budget_approval
  ADD COLUMN IF NOT EXISTS proposed_name TEXT,
  ADD COLUMN IF NOT EXISTS mgt_name_1 TEXT,
  ADD COLUMN IF NOT EXISTS mgt_name_2 TEXT,
  ADD COLUMN IF NOT EXISTS mgt_name_3 TEXT,
  ADD COLUMN IF NOT EXISTS finance_name TEXT;

-- Default value untuk data lama (akan auto-fill di UI kalau column-nya null)
COMMENT ON COLUMN public.budget_approval.proposed_name IS 'Nama orang yang mengajukan proposal (PROPOSED/PREPARED BY)';
COMMENT ON COLUMN public.budget_approval.mgt_name_1 IS 'Nama Management Approver kolom 1 (COMMENT)';
COMMENT ON COLUMN public.budget_approval.mgt_name_2 IS 'Nama Management Approver kolom 2 (COMMENT)';
COMMENT ON COLUMN public.budget_approval.mgt_name_3 IS 'Nama Management Approver kolom 3 (CONSENT)';
COMMENT ON COLUMN public.budget_approval.finance_name IS 'Nama Finance & Accounting Approver';
