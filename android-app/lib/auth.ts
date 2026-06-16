import axios from 'axios';
import { API_BASE_URL } from '@/constants/config';
import { saveSession, clearSession, getSession } from './storage';
import { Karyawan, SessionData } from './types';

function parseCookies(setCookieHeaders: string[]): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    const [name, ...rest] = pair.split('=');
    cookies[name.trim()] = rest.join('=').trim();
  }
  return cookies;
}

export async function login(username: string, password: string): Promise<Karyawan> {
  const res = await axios.post(
    `${API_BASE_URL}/api/auth/karyawan-login`,
    { username, password },
    {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
      // Don't follow redirects; we handle the raw response
      maxRedirects: 0,
      validateStatus: (s) => s < 500,
    }
  );

  if (res.status === 429) {
    throw new Error('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
  }
  if (res.status === 403) {
    throw new Error('Akun dinonaktifkan. Hubungi Admin.');
  }
  if (res.status !== 200) {
    throw new Error(res.data?.error || 'Login gagal');
  }

  // Extract Set-Cookie headers — axios normalizes to array
  const rawHeaders = res.headers['set-cookie'] || [];
  const cookies = parseCookies(Array.isArray(rawHeaders) ? rawHeaders : [rawHeaders]);

  const adminSession = cookies['admin_session'];
  const karyawanIdentity = cookies['karyawan_identity'];

  if (!adminSession || !karyawanIdentity) {
    throw new Error('Session tidak diterima. Coba lagi.');
  }

  const karyawan: Karyawan = res.data.karyawan;
  const sessionData: SessionData = { adminSession, karyawanIdentity, karyawan };
  await saveSession(sessionData);
  return karyawan;
}

export async function logout(): Promise<void> {
  await clearSession();
}

export async function isLoggedIn(): Promise<boolean> {
  const session = await getSession();
  return !!(session?.adminSession && session?.karyawanIdentity);
}

export { getSession };
