import { createClient } from '@supabase/supabase-js';

const WINDOW_MS = 15 * 60 * 1000; // 15 menit

/**
 * Rate limiter berbasis Supabase — persistent & shared across semua Vercel instances.
 *
 * Menggunakan upsert sehingga 1 baris per IP, window di-reset otomatis saat expired.
 * Returns true jika request boleh dilanjutkan, false jika harus ditolak.
 */
export async function checkRateLimit(ip: string, maxAttempts: number): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();
  const resetAt = new Date(now.getTime() + WINDOW_MS);

  // Baca state saat ini
  const { data: existing } = await supabase
    .from('login_attempts')
    .select('count, reset_at')
    .eq('ip', ip)
    .maybeSingle();

  if (existing) {
    const windowExpired = new Date(existing.reset_at) <= now;

    if (windowExpired) {
      // Window lama sudah expired — mulai ulang hitungan
      await supabase
        .from('login_attempts')
        .update({ count: 1, reset_at: resetAt.toISOString() })
        .eq('ip', ip);
      return true;
    }

    if (existing.count >= maxAttempts) {
      // Masih dalam window & sudah melebihi batas
      return false;
    }

    // Masih dalam window & belum melebihi batas — increment
    await supabase
      .from('login_attempts')
      .update({ count: existing.count + 1 })
      .eq('ip', ip);
    return true;
  }

  // Baris belum ada — insert baru
  await supabase
    .from('login_attempts')
    .insert({ ip, count: 1, reset_at: resetAt.toISOString() });
  return true;
}

/** Reset hitungan setelah login berhasil (opsional — hindari lockout karyawan yang valid) */
export async function resetRateLimit(ip: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await supabase.from('login_attempts').delete().eq('ip', ip);
}
