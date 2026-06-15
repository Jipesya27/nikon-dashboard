import { createClient } from '@supabase/supabase-js';
import { parseIdentityCookieUnsafe } from '@/app/lib/session';

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export function getAuditUser(
  cookieStore: { get: (name: string) => { value: string } | undefined }
): string {
  const raw = cookieStore.get('karyawan_identity')?.value ?? '';
  const identity = parseIdentityCookieUnsafe(raw);
  return identity?.nama || 'Admin';
}

export async function writeAuditLog(opts: {
  user_name: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}): Promise<void> {
  try {
    await sbAdmin.from('data_log').insert({
      user_name: opts.user_name,
      action: opts.action,
      table_name: opts.table_name,
      record_id: opts.record_id,
      old_values: opts.old_values ?? {},
      new_values: opts.new_values ?? {},
    });
  } catch {
    // audit failure must never break the main request
  }
}
