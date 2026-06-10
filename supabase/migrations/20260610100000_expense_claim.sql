-- Tabel klaim biaya internal (expense reimbursement)
CREATE TABLE IF NOT EXISTS expense_claim (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  created_by     TEXT        NOT NULL,                         -- username karyawan
  nama_pembuat   TEXT        NOT NULL    DEFAULT '',           -- nama_karyawan (display)
  to_person      TEXT        NOT NULL    DEFAULT '',           -- "To :" penerima claim
  claim_date     DATE        NOT NULL    DEFAULT CURRENT_DATE,
  status         TEXT        NOT NULL    DEFAULT 'draft'
                   CHECK (status IN ('draft','submitted','approved','rejected')),
  catatan        TEXT                    DEFAULT '',
  items          JSONB       NOT NULL    DEFAULT '[]',         -- [{tanggal,description,nominal}]
  receipt_urls   TEXT[]      NOT NULL    DEFAULT '{}',         -- Google Drive file IDs / URLs
  total_nominal  BIGINT      NOT NULL    DEFAULT 0
);

-- Index untuk filter per user
CREATE INDEX IF NOT EXISTS idx_expense_claim_created_by ON expense_claim(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_claim_created_at ON expense_claim(created_at DESC);
