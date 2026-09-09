import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession, verifyIdentityToken, buildIdentityToken, SESSION_MAX_AGE_SECONDS } from '@/app/lib/session';

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

  // Kolom foto_profil tidak ada di tabel karyawan — menyertakannya membuat
  // query gagal total sehingga akses_halaman tidak pernah ter-refresh.
  const { data: matches, error } = await sbAdmin
    .from('karyawan')
    .select('id_karyawan, nama_karyawan, username, role, status_aktif, akses_halaman, nomor_wa, email')
    .ilike('username', username.trim());
  const karyawan = (matches || []).find(
    k => (k.username || '').trim().toLowerCase() === username.trim().toLowerCase(),
  );

  if (error || !karyawan) {
    return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
  }
  if (karyawan.status_aktif === false) {
    return NextResponse.json({ error: 'Akun dinonaktifkan' }, { status: 403 });
  }

  const res = NextResponse.json({ karyawan });

  // Re-issue cookie karyawan_identity dengan masa berlaku baru.
  //
  // Kenapa: `admin_session` di-rolling-renew tiap 90 detik (lihat /api/admin/auth GET),
  // tapi `karyawan_identity` dulu tidak pernah diperpanjang — jadi setelah maxAge lewat
  // (atau untuk sesi lama dari sebelum cookie ini ada), `admin_session` masih hidup
  // sementara `karyawan_identity` hilang. Satu-satunya fitur yang baca cookie identity
  // di server adalah Kalender (`getCalendarUser`) → muncul "User tidak dikenali"
  // padahal dashboard lain jalan normal. Endpoint ini dipanggil tiap load dashboard &
  // RoleGate, jadi menaruh refresh di sini menyembuhkan sesi lama tanpa perlu login ulang.
  //
  // Sumber identitas: cookie identity terverifikasi kalau ada; kalau tidak, hasil lookup
  // DB (username dari localStorage) — konsisten dengan model kepercayaan saat ini
  // (semua karyawan login sudah bisa panggil semua API admin; RBAC per-rute = TODO).
  try {
    const freshIdentity = await buildIdentityToken({
      nama: karyawan.nama_karyawan || '',
      username: karyawan.username || '',
      role: karyawan.role || '',
    });
    res.cookies.set('karyawan_identity', freshIdentity, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });
  } catch { /* kalau secret belum di-set, jangan gagalkan /me */ }

  return res;
}
