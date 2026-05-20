import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { buildSessionToken, SESSION_MAX_AGE_SECONDS } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const attempts = new Map<string, { count: number; resetAt: number }>();
function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.resetAt) { attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); return true; }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429 });
  }

  let username: string, password: string;
  try { ({ username, password } = await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: karyawan } = await supabase
    .from('karyawan')
    .select('*')
    .eq('username', username)
    .single();

  if (!karyawan) {
    return NextResponse.json({ error: 'Username atau Password salah!' }, { status: 401 });
  }
  if (karyawan.status_aktif === false) {
    return NextResponse.json({ error: 'Akun dinonaktifkan. Silakan hubungi Admin.' }, { status: 403 });
  }

  // Verify password — support both bcrypt hashes and legacy plaintext (auto-migrate)
  const storedPw: string = karyawan.password || '';
  const isHashed = storedPw.startsWith('$2');
  let valid = false;

  if (isHashed) {
    valid = await bcrypt.compare(password, storedPw);
  } else {
    // Legacy plaintext
    valid = storedPw === password;
    if (valid) {
      // Auto-migrate: hash and update silently
      const hash = await bcrypt.hash(password, 12);
      await supabase.from('karyawan').update({ password: hash }).eq('id_karyawan', karyawan.id_karyawan);
      karyawan.password = hash;
    }
  }

  if (!valid) {
    return NextResponse.json({ error: 'Username atau Password salah!' }, { status: 401 });
  }

  // Remove password from response
  const { password: _pw, ...safeKaryawan } = karyawan;
  void _pw;

  const secret = process.env.ADMIN_PASSWORD || process.env.SESSION_SECRET!;
  const token = await buildSessionToken(secret);

  const res = NextResponse.json({ success: true, karyawan: safeKaryawan });
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
  return res;
}
