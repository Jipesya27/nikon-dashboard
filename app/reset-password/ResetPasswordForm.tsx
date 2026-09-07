'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Phase = 'checking' | 'form' | 'invalid' | 'done';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>(token ? 'checking' : 'invalid');
  const [reason, setReason] = useState(token ? '' : 'Link tidak lengkap. Buka link persis seperti yang dikirim ke email Anda.');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const j = await res.json();
        if (!alive) return;
        if (j.valid) {
          setPhase('form');
        } else {
          setPhase('invalid');
          setReason(j.reason || 'Link tidak valid atau sudah kedaluwarsa.');
        }
      } catch {
        if (!alive) return;
        setPhase('invalid');
        setReason('Gagal memeriksa link. Periksa koneksi lalu muat ulang halaman.');
      }
    })();
    return () => { alive = false; };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) return setErr('Password baru minimal 8 karakter.');
    if (pw !== confirm) return setErr('Konfirmasi password tidak sama.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pw }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        setPhase('done');
      } else {
        setErr(j.error || 'Gagal menyimpan password baru.');
      }
    } catch {
      setErr('Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'checking') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#FFE500]" />
        <span className="text-sm">Memeriksa link...</span>
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <div className="space-y-5">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm font-medium">{reason}</div>
        <Link href="/dashboard" className="btn-secondary w-full block text-center">← Kembali ke Login</Link>
        <p className="text-xs text-gray-500 text-center">Di halaman login, klik “Lupa Password?” untuk meminta link baru.</p>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="space-y-5">
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm font-medium">
          Password berhasil diubah. Silakan masuk dengan password baru Anda.
        </div>
        <Link href="/dashboard" className="btn-primary w-full block text-center">Masuk ke Dashboard</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {err && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm font-medium">{err}</div>}
      <div>
        <label className="block text-sm font-bold mb-2 text-gray-800">Password Baru</label>
        <input
          type={show ? 'text' : 'password'}
          value={pw}
          onChange={e => setPw(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="input-modern"
          placeholder="Minimal 8 karakter"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-2 text-gray-800">Ulangi Password Baru</label>
        <input
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="input-modern"
          placeholder="Ketik ulang password baru"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
        <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="rounded" />
        Tampilkan password
      </label>
      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
      </button>
    </form>
  );
}
