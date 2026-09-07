-- Kalender pribadi tim (akses dibatasi via akses_halaman='calendar' di RoleGate)
CREATE TABLE IF NOT EXISTS calendar_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  created_by       TEXT        NOT NULL,                        -- username karyawan
  created_by_nama  TEXT        NOT NULL    DEFAULT '',
  title            TEXT        NOT NULL,
  description      TEXT                    DEFAULT '',
  location         TEXT                    DEFAULT '',
  category         TEXT        NOT NULL    DEFAULT 'other'
                     CHECK (category IN ('meeting','event','deadline','reminder','holiday','other')),
  all_day          BOOLEAN     NOT NULL    DEFAULT FALSE,
  start_date       DATE        NOT NULL,
  end_date         DATE        NOT NULL,
  start_time       TIME,                                        -- NULL jika all_day
  end_time         TIME,
  visibility       TEXT        NOT NULL    DEFAULT 'team'
                     CHECK (visibility IN ('team','private')),
  participants     TEXT[]      NOT NULL    DEFAULT '{}',         -- username karyawan yang di-tag
  series_id        UUID,                                        -- grup event berulang (NULL = event tunggal)
  CONSTRAINT calendar_events_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_date   ON calendar_events(end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_series     ON calendar_events(series_id);

CREATE TABLE IF NOT EXISTS calendar_tasks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  created_by       TEXT        NOT NULL,                        -- username karyawan
  created_by_nama  TEXT        NOT NULL    DEFAULT '',
  title            TEXT        NOT NULL,
  description      TEXT                    DEFAULT '',
  due_date         DATE        NOT NULL,
  due_time         TIME,                                        -- opsional, NULL = tanpa jam spesifik
  priority         TEXT        NOT NULL    DEFAULT 'medium'
                     CHECK (priority IN ('low','medium','high')),
  status           TEXT        NOT NULL    DEFAULT 'todo'
                     CHECK (status IN ('todo','in_progress','done')),
  assigned_to      TEXT        NOT NULL    DEFAULT '',           -- username karyawan
  assigned_to_nama TEXT                    DEFAULT '',
  visibility       TEXT        NOT NULL    DEFAULT 'team'
                     CHECK (visibility IN ('team','private')),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calendar_tasks_due_date    ON calendar_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_assigned_to ON calendar_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_created_by  ON calendar_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_status      ON calendar_tasks(status);
