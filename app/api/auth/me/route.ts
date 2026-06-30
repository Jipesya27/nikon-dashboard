import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession, verifyIdentityToken } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identityCookie = cookieStore.get('karyawan_identity')?.value || '';
  const identity = await verifyIdentityToken(identityCookie);
  if (!identity?.username) {
    return NextResponse.json({ error: 'Identity tidak ditemukan' }, { status: 401 });
  }

  const { data: karyawan, error } = await sbAdmin
    .from('karyawan')
    .select('id_karyawan, nama_karyawan, username, role, status_aktif, akses_halaman, nomor_wa, foto_profil')
    .eq('username', identity.username)
    .single();

  if (error || !karyawan) {
    return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ karyawan });
}
