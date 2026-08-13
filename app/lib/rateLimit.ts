import { createClient } from '@supabase/supabase-js';

const WINDOW_MS = 15 * 60 * 1000; // 15 menit

/**
 * Rate limiter berbasis Supabase — persistent & shared across semua Vercel instances.
 *
 * Memanggil RPC `check_rate_limit` (SQL function di migration 20260814000000)
 * yang melakukan upsert + increment atomik. Race read-modify-write versi lama
 * (dua request paralel baca count yang sama, keduanya update ke N+1) sudah
 * dihilangkan karena serialisasi di Postgres row lock.
 *
 * Returns true jika request boleh dilanjutkan, false jika harus ditolak.
 */
export async function checkRateLimit(ip: string, maxAttempts: number): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_ip: ip,
    p_max_attempts: maxAttempts,
    p_window_ms: WINDOW_MS,
  });

  if (error) {
    // Fail-safe: RPC belum di-deploy / DB error — biarkan request lolos,
    // konsisten dengan pola lama (login tetap jalan kalau tabel belum ada).
    console.warn('[rateLimit] check_rate_limit RPC failed:', error.message);
    return true;
  }

  return data === true;
}

/** Reset hitungan setelah login berhasil (opsional — hindari lockout karyawan yang valid) */
export async function resetRateLimit(ip: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await supabase.from('login_attempts').delete().eq('ip', ip);
}
