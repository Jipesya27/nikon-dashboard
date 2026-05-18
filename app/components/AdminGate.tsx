'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import Image from 'next/image';

export default function AdminGate({ children, title = 'Admin Area' }: { children: ReactNode; title?: string }) {
  const [status, setStatus] = useState<'checking' | 'auth' | 'unauth'>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth', { cache: 'no-store' });
      setStatus(res.ok ? 'auth' : 'unauth');
    } catch {
      setStatus('unauth');
    }
  }, []);

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

  // Loading check
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#ffe000] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Login form
  if (status === 'unauth') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4" style={{ colorScheme: 'dark' }}>
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center space-y-2">
            <div className="inline-flex items-center justify-center mb-1">
              <Image src="/nikon-logo.svg" alt="Nikon" width={90} height={36} className="h-9 w-auto" />
            </div>
            <p className="text-white text-lg font-bold tracking-wide">Alta Nikindo</p>
            <p className="text-zinc-500 text-sm">{title}</p>
          </div>

          <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5 font-semibold uppercase tracking-wider">
                Password Admin
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                placeholder="Masukkan password..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffe000] focus:ring-1 focus:ring-[#ffe000]/30 transition-colors placeholder-zinc-600"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm flex items-center gap-1.5">
                <span>⚠️</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#ffe000] text-black font-bold py-2.5 rounded-lg text-sm hover:bg-yellow-400 active:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin inline-block" />
                  Memeriksa...
                </span>
              ) : 'Masuk →'}
            </button>
          </form>

          <p className="text-center text-zinc-700 text-xs mt-4">
            Hubungi administrator jika lupa password
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
