import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identity = cookieStore.get('karyawan_identity')?.value;
  if (!identity) {
    return NextResponse.json({ error: 'Identity tidak ditemukan' }, { status: 401 });
  }

  const [, username] = identity.split('|');
  if (!username) {
    return NextResponse.json({ error: 'Identity tidak valid' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: karyawan, error } = await supabase
    .from('karyawan')
    .select('id_karyawan, nama_karyawan, username, role, status_aktif, akses_halaman')
    .eq('username', username)
    .single();

  if (error || !karyawan) {
    return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ karyawan });
}
