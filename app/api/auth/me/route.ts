import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession, verifyIdentityToken } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Coba dapat username dari karyawan_identity cookie dulu
  let username = '';
  const identityCookie = cookieStore.get('karyawan_identity')?.value || '';
  const identity = await verifyIdentityToken(identityCookie);
  if (identity?.username) {
    username = identity.username;
  }

  // Fallback: username dikirim sebagai query param dari localStorage
  if (!username) {
    const qUsername = req.nextUrl.searchParams.get('username')?.trim() || '';
    // Validasi: hanya huruf, angka, underscore, titik, strip — max 64 char
    if (qUsername && /^[a-zA-Z0-9._-]{1,64}$/.test(qUsername)) {
      username = qUsername;
    }
  }

  if (!username) {
    return NextResponse.json({ error: 'Username tidak ditemukan' }, { status: 400 });
  }

  const { data: karyawan, error } = await sbAdmin
    .from('karyawan')
    .select('id_karyawan, nama_karyawan, username, role, status_aktif, akses_halaman, nomor_wa, foto_profil')
    .eq('username', username)
    .single();

  if (error || !karyawan) {
    return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ karyawan });
}
