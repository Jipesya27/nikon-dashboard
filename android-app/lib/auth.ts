import axios from 'axios';
import { API_BASE_URL } from '@/constants/config';
import { saveSession, clearSession, getSession } from './storage';
import { Karyawan, SessionData } from './types';

export async function login(username: string, password: string): Promise<Karyawan> {
  const res = await axios.post(
    `${API_BASE_URL}/api/auth/mobile-login`,
    { username, password },
    {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
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

  const { adminSession, karyawanIdentity } = res.data.tokens || {};
  if (!adminSession || !karyawanIdentity) {
    throw new Error('Session tidak diterima dari server. Coba lagi.');
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
