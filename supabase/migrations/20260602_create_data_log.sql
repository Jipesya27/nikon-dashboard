-- Audit log table for tracking all dashboard mutations
CREATE TABLE IF NOT EXISTS data_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  user_name    text NOT NULL,
  action       text NOT NULL,
  table_name   text NOT NULL,
  record_id    text NOT NULL,
  old_values   jsonb NOT NULL DEFAULT '{}',
  new_values   jsonb NOT NULL DEFAULT '{}'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS data_log_table_name_idx ON data_log (table_name);
CREATE INDEX IF NOT EXISTS data_log_user_name_idx  ON data_log (user_name);
CREATE INDEX IF NOT EXISTS data_log_created_at_idx ON data_log (created_at DESC);

-- Only the service role can write; nobody can delete or update
ALTER TABLE data_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON data_log
  USING (true)
  WITH CHECK (true);
