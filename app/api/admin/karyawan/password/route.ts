/**
 * Admin-only: set/reset password karyawan lain.
 * Protected by middleware (/api/admin/*).
 * Hanya role 'Admin' dan 'Super Admin' yang boleh akses.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { verifyAdminSession, verifyIdentityToken } from '@/app/lib/session';
import { sendWATemplate } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['Admin', 'Super Admin'];

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verifikasi role dari signed identity cookie
  const identityRaw = cookieStore.get('karyawan_identity')?.value ?? '';
  const identity = await verifyIdentityToken(identityRaw);
  if (!identity) {
    return NextResponse.json({ error: 'Sesi tidak valid, silakan logout dan login ulang.' }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(identity.role)) {
    return NextResponse.json({ error: 'Forbidden: hanya Admin yang dapat mereset password.' }, { status: 403 });
  }

  let id_karyawan: string, password: string;
  try { ({ id_karyawan, password } = await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!id_karyawan || !password) {
    return NextResponse.json({ error: 'id_karyawan dan password wajib diisi' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: existing } = await supabase
    .from('karyawan')
    .select('id_karyawan, nama_karyawan, username, nomor_wa')
    .eq('id_karyawan', id_karyawan)
    .single();

  if (!existing) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });

  const hash = await bcrypt.hash(password, 12);

  const { data: updated, error } = await supabase
    .from('karyawan')
    .update({ password: hash })
    .eq('id_karyawan', existing.id_karyawan)
    .select('id_karyawan');

  if (error) return NextResponse.json({ error: 'Gagal menyimpan password' }, { status: 500 });
  if (!updated || updated.length === 0) return NextResponse.json({ error: 'Gagal menyimpan password (0 baris ter-update)' }, { status: 500 });

  // Kirim WA template ke karyawan — fire-and-forget, tidak memblokir response
  if (existing.nomor_wa) {
    void sendWATemplate(
      existing.nomor_wa,
      'notif_password_karyawan',
      [existing.nama_karyawan ?? existing.username ?? 'Karyawan', existing.username ?? ''],
    ).catch((e) => console.error('[password/route] Gagal kirim WA template:', e));
  }

  return NextResponse.json({ success: true });
}
