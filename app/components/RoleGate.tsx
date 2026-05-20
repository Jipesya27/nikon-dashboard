'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface RoleGateProps {
  children: ReactNode;
  title?: string;
  /** Tab IDs yang boleh akses halaman ini. Admin & Super Admin selalu lolos. */
  requiredAccess?: string[];
}

type AuthStatus = 'checking' | 'auth' | 'unauth' | 'forbidden';

export default function RoleGate({ children, title = 'Admin Area', requiredAccess = [] }: RoleGateProps) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [karyawanName, setKaryawanName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth', { cache: 'no-store' });
      if (!res.ok) { setStatus('unauth'); return; }

      // Cookie valid — cek role dari localStorage
      if (requiredAccess.length === 0) { setStatus('auth'); return; }

      try {
        const raw = localStorage.getItem('nikon_karyawan');
        if (!raw) { setStatus('auth'); return; } // login lama (password), tidak ada data role → izinkan

        const karyawan = JSON.parse(raw) as { role?: string; nama_karyawan?: string; akses_halaman?: string[] };
        setKaryawanName(karyawan.nama_karyawan || '');

        const role = karyawan.role || '';
        if (role === 'Admin' || role === 'Super Admin') { setStatus('auth'); return; }

        const akses = karyawan.akses_halaman || [];
        const hasAccess = requiredAccess.some(a => akses.includes(a));
        setStatus(hasAccess ? 'auth' : 'forbidden');
      } catch {
        setStatus('auth'); // parse error → izinkan, jangan block
      }
    } catch {
      setStatus('unauth');
    }
  }, [requiredAccess]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setStatus('auth');
        setPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || 'Password salah');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  // Loading
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#FFE800] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Login form
  if (status === 'unauth') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center space-y-2">
            <div className="inline-flex items-center justify-center mb-1">
              <Image src="/nikon-logo.svg" alt="Nikon" width={90} height={36} className="h-9 w-auto" />
            </div>
            <p className="text-gray-900 text-lg font-bold tracking-wide">Alta Nikindo</p>
            <p className="text-gray-500 text-sm">{title}</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5 font-semibold uppercase tracking-wider">
                Password Admin
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                placeholder="Masukkan password..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors placeholder-gray-400"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm flex items-center gap-1.5">
                <span>⚠️</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#FFE800] text-black font-bold py-2.5 rounded-lg text-sm hover:bg-yellow-400 active:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin inline-block" />
                  Memeriksa...
                </span>
              ) : 'Masuk →'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-4">
            Atau <Link href="/dashboard" className="text-gray-600 hover:underline font-medium">login via Dashboard</Link>
          </p>
        </div>
      </div>
    );
  }

  // Forbidden — karyawan login tapi tidak punya akses
  if (status === 'forbidden') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
            {karyawanName && (
              <p className="text-gray-500 text-sm mb-1">
                Login sebagai <span className="font-semibold text-gray-700">{karyawanName}</span>
              </p>
            )}
            <p className="text-gray-400 text-sm mb-6">
              Anda tidak memiliki akses ke halaman <span className="font-semibold text-gray-600">{title}</span>.
              Hubungi Admin untuk meminta akses.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-[#FFE800] hover:bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-all shadow-sm"
            >
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
