/**
 * Admin-only: set/reset password karyawan lain.
 * Protected by middleware (/api/admin/*).
 */
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

  let id_karyawan: string, password: string;
  try { ({ id_karyawan, password } = await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!id_karyawan || !password) {
    return NextResponse.json({ error: 'id_karyawan dan password wajib diisi' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await supabase
    .from('karyawan')
    .update({ password: hash })
    .eq('id_karyawan', id_karyawan);

  if (error) return NextResponse.json({ error: 'Gagal menyimpan password' }, { status: 500 });

  return NextResponse.json({ success: true });
}
