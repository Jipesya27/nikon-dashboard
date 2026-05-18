import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let id_karyawan: string, currentPassword: string, newPassword: string;
  try { ({ id_karyawan, currentPassword, newPassword } = await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!id_karyawan || !currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: karyawan } = await supabase
    .from('karyawan')
    .select('password')
    .eq('id_karyawan', id_karyawan)
    .single();

  if (!karyawan) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });

  // Verify current password (support bcrypt + legacy plaintext)
  const storedPw: string = karyawan.password || '';
  const isHashed = storedPw.startsWith('$2');
  const valid = isHashed
    ? await bcrypt.compare(currentPassword, storedPw)
    : storedPw === currentPassword;

  if (!valid) {
    return NextResponse.json({ error: 'Password saat ini tidak sesuai!' }, { status: 401 });
  }

  // Hash and save new password
  const hash = await bcrypt.hash(newPassword, 12);
  const { error } = await supabase
    .from('karyawan')
    .update({ password: hash })
    .eq('id_karyawan', id_karyawan);

  if (error) return NextResponse.json({ error: 'Gagal menyimpan password' }, { status: 500 });

  return NextResponse.json({ success: true });
}
