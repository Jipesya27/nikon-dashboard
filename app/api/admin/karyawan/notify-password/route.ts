/**
 * Admin-only: kirim pemberitahuan password (baru) ke karyawan lewat email.
 * Dipakai setelah admin me-reset password di dashboard — sebagai alternatif
 * dari modal copy-paste WA. TIDAK mengubah password, hanya mengirim email.
 *
 * Protected by middleware (/api/admin/*). Hanya role 'Admin' / 'Super Admin'.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession, verifyIdentityToken } from '@/app/lib/session';
import { sendEmailStrict } from '@/app/lib/notify';
import { logSystemError } from '@/app/lib/errorLog';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['Admin', 'Super Admin'];

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${'*'.repeat(Math.max(2, user.length - visible.length))}@${domain}`;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identity = await verifyIdentityToken(cookieStore.get('karyawan_identity')?.value ?? '');
  if (!identity) {
    return NextResponse.json({ error: 'Sesi tidak valid, silakan logout dan login ulang.' }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(identity.role)) {
    return NextResponse.json({ error: 'Forbidden: hanya Admin yang dapat mengirim reset password.' }, { status: 403 });
  }

  let id_karyawan: string, password: string;
  try { ({ id_karyawan, password } = await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!id_karyawan || !password) {
    return NextResponse.json({ error: 'id_karyawan dan password wajib diisi' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: karyawan } = await supabase
    .from('karyawan')
    .select('nama_karyawan, username, email')
    .eq('id_karyawan', id_karyawan)
    .single();

  if (!karyawan) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
  if (!karyawan.email) {
    return NextResponse.json({ error: 'Karyawan belum punya email. Tambahkan email di data karyawan dulu.' }, { status: 400 });
  }

  try {
    await sendEmailStrict(
      karyawan.email,
      'Password Nikon Dashboard Diperbarui',
      `Halo ${karyawan.nama_karyawan || karyawan.username},\n\n`
        + `Password akun Nikon Dashboard Anda telah diperbarui oleh Admin.\n\n`
        + `Username: *${karyawan.username}*\n`
        + `Password baru: *${password}*\n\n`
        + `Segera login ke altanikindo.com dan ganti password Anda. `
        + `Jika Anda tidak meminta perubahan ini, hubungi Admin.`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    void logSystemError({ source: 'api:notify-password', message: msg, detail: { id_karyawan } });
    return NextResponse.json({ error: 'Gagal mengirim email. Coba lagi.' }, { status: 502 });
  }

  return NextResponse.json({ success: true, sentTo: maskEmail(karyawan.email) });
}
