import { createClient } from '@supabase/supabase-js';

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function logSystemError(opts: {
  source: string;
  message: string;
  severity?: 'error' | 'warning';
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await sbAdmin.from('system_error_log').insert({
      source: opts.source,
      severity: opts.severity ?? 'error',
      message: opts.message,
      detail: opts.detail ?? {},
    });
  } catch {
    // logging failure must never break the caller
  }
}
