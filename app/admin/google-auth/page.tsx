'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function GoogleAuthInner() {
  const params = useSearchParams();
  const refreshToken = params.get('refresh_token');
  const email = params.get('email');
  const error = params.get('error');
  const detail = params.get('detail');
  const [copied, setCopied] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  // Gate: hanya user yang login dashboard yang bisa akses
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('nikon_karyawan');
      if (saved) {
        const user = JSON.parse(saved);
        if (user?.role === 'Admin') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAuthorized(true);
        }
      }
    } catch {}
     
    setChecking(false);
  }, []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-gray-900" style={{ colorScheme: 'light' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-800 mb-4 font-medium">
            Halaman ini hanya bisa diakses oleh <strong>Admin</strong> yang sudah login di dashboard.
          </p>
          <Link href="/" className="inline-block bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-800 transition">
            ← Login ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 text-gray-900" style={{ colorScheme: 'light' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-xl mb-3">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Google Drive Auth Helper</h1>
          <p className="text-gray-800 text-sm mt-1 font-medium">Regenerate Refresh Token untuk Upload Drive</p>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-bold text-red-800 mb-1">❌ Gagal mendapatkan token</p>
            <p className="text-xs text-red-700">Error: <code className="bg-white px-1 rounded">{error}</code></p>
            {detail && (
              <details className="mt-2">
                <summary className="text-xs text-red-700 cursor-pointer font-semibold">Lihat detail</summary>
                <pre className="text-[10px] bg-white p-2 rounded mt-1 overflow-x-auto text-red-900">{decodeURIComponent(detail)}</pre>
              </details>
            )}
          </div>
        )}

        {/* Success: token tersedia */}
        {refreshToken ? (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <h2 className="text-lg font-bold text-green-900">Refresh Token Berhasil Dibuat</h2>
              </div>
              {email && (
                <p className="text-xs text-green-800 mb-3">
                  Otorisasi diberikan oleh: <strong className="font-mono">{email}</strong>
                </p>
              )}
              <div className="bg-white border border-green-200 rounded-lg p-3 mb-3">
                <label className="block text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Refresh Token (Copy ke Vercel & Supabase)
                </label>
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    readOnly
                    value={refreshToken}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
                    aria-label="Refresh token"
                  />
                  <button
                    onClick={() => copy(refreshToken)}
                    className={`px-4 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${copied ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-gray-800'}`}
                  >
                    {copied ? '✓ Tersalin' : '📋 Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Instruksi update */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">📝 Update di 3 Tempat</h3>
              <ol className="space-y-3 text-sm text-gray-900">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-700 shrink-0">1.</span>
                  <div>
                    <strong>Vercel (Production):</strong>
                    <p className="text-xs text-gray-800 font-medium mt-1">
                      Buka dashboard Vercel → Settings → Environment Variables → edit <code className="bg-gray-100 px-1 rounded">GOOGLE_REFRESH_TOKEN</code> → paste token → Save → <strong>Redeploy</strong>.
                    </p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-700 shrink-0">2.</span>
                  <div>
                    <strong>Supabase Edge Functions:</strong>
                    <p className="text-xs text-gray-800 font-medium mt-1 mb-1">Jalankan di terminal:</p>
                    <pre className="bg-gray-900 text-green-300 text-[11px] p-2 rounded overflow-x-auto">
{`npx supabase secrets set GOOGLE_REFRESH_TOKEN="${refreshToken.substring(0, 20)}..." --project-ref hfqnlttxxrqarmpvtnhu`}
                    </pre>
                    <p className="text-[10px] text-gray-700 mt-1 italic">(Atau kirim token ke Claude, akan di-update otomatis)</p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-700 shrink-0">3.</span>
                  <div>
                    <strong>Local <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code>:</strong>
                    <p className="text-xs text-gray-800 font-medium mt-1">
                      Edit <code className="bg-gray-100 px-1 rounded">C:\Users\Jamal\Desktop\nikon-dashboard\.env.local</code> → update <code className="bg-gray-100 px-1 rounded">GOOGLE_REFRESH_TOKEN=</code>
                    </p>
                  </div>
                </li>
              </ol>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-[11px] text-amber-800 font-bold">
                  ⚠️ Token ini bersifat rahasia — jangan share via channel publik. Jika sudah selesai update, refresh halaman untuk membersihkan dari URL.
                </p>
              </div>
            </div>

            <button
              onClick={() => window.location.href = '/admin/google-auth'}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold text-sm transition"
            >
              🧹 Selesai — Bersihkan URL
            </button>
          </div>
        ) : (
          /* Initial state: belum authorize */
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Apa ini?</h2>
              <p className="text-sm text-gray-900 mb-3">
                Token Google Drive untuk upload kartu garansi, nota, dan dokumen lain dari form publik. Token bisa expired (90 hari tidak dipakai) atau di-revoke. Tombol di bawah akan generate token baru lewat OAuth flow Google.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-gray-900 font-medium">
                  📌 <strong>Sebelum klik tombol</strong>, pastikan URL berikut sudah ditambahkan di <strong>Authorized Redirect URIs</strong> di <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold">Google Cloud Console</a>:
                </p>
                <code className="block bg-white border border-yellow-200 rounded p-2 mt-2 text-[11px] font-mono break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google/callback` : '/api/auth/google/callback'}
                </code>
                <p className="text-[10px] text-gray-800 mt-1 italic">
                  Tambahkan juga <code className="font-mono">http://localhost:3000/api/auth/google/callback</code> kalau mau test dari local dev.
                </p>
              </div>
            </div>

            <a
              href="/api/auth/google/start"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-base text-center transition shadow-lg"
            >
              🔐 Connect Google Drive — Authorize Now
            </a>

            <Link href="/" className="block text-center text-sm font-bold text-gray-700 hover:text-gray-900 transition">
              ← Kembali ke Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    }>
      <GoogleAuthInner />
    </Suspense>
  );
}
