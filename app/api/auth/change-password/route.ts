import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { verifyAdminSession, verifyIdentityToken } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verifikasi identity dari signed cookie — karyawan hanya boleh ganti password sendiri
  const identityRaw = cookieStore.get('karyawan_identity')?.value ?? '';
  const identity = await verifyIdentityToken(identityRaw);
  if (!identity) {
    // Cookie identity tidak valid atau masih format lama (pre-login baru) → minta re-login
    return NextResponse.json({ error: 'Sesi tidak valid, silakan logout dan login ulang.' }, { status: 401 });
  }

  let id_karyawan: string, currentPassword: string, newPassword: string;
  try { ({ id_karyawan, currentPassword, newPassword } = await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!id_karyawan || !currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: karyawan } = await supabase
    .from('karyawan')
    .select('id_karyawan, username, password')
    .eq('id_karyawan', id_karyawan)
    .single();

  if (!karyawan) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });

  // Pastikan yang login hanya bisa ganti password miliknya sendiri (verified dari signed cookie)
  if (karyawan.username !== identity.username) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verifikasi password lama — support bcrypt + legacy plaintext
  const storedPw: string = karyawan.password || '';
  const isHashed = storedPw.startsWith('$2');
  const valid = isHashed
    ? await bcrypt.compare(currentPassword, storedPw)
    : storedPw === currentPassword;

  if (!valid) {
    return NextResponse.json({ error: 'Password saat ini tidak sesuai!' }, { status: 401 });
  }

  // Hash dan simpan password baru — pakai PK dari DB (bukan dari request) untuk hindari type mismatch
  const hash = await bcrypt.hash(newPassword, 12);
  const { data: updated, error } = await supabase
    .from('karyawan')
    .update({ password: hash })
    .eq('id_karyawan', karyawan.id_karyawan)
    .select('id_karyawan');

  if (error) return NextResponse.json({ error: 'Gagal menyimpan password' }, { status: 500 });
  if (!updated || updated.length === 0) return NextResponse.json({ error: 'Gagal menyimpan password (0 baris ter-update)' }, { status: 500 });

  return NextResponse.json({ success: true });
}
