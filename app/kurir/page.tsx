'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PeminjamanBarang } from '@/app/index';
import type { Karyawan } from '@/app/index';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function proxyImg(url: string): string {
  if (!url) return '';
  const m = url.match(/[?&]id=([^&]+)/);
  if (m) return `/api/admin/proxy-img?id=${m[1]}`;
  return url;
}

function StatusBadge({ status }: { status?: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    menunggu: { cls: 'bg-gray-100 text-gray-600', label: 'Menunggu' },
    dikirim:  { cls: 'bg-blue-100 text-blue-700', label: 'Sedang Dikirim' },
    terkirim: { cls: 'bg-green-100 text-green-700', label: 'Terkirim' },
  };
  const c = cfg[status || 'menunggu'] || cfg.menunggu;
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.cls}`}>{c.label}</span>;
}

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface UploadState {
  kondisi: File[];
  bukti: File[];
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export default function KurirPage() {
  const [user, setUser] = useState<Karyawan | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [lendings, setLendings] = useState<PeminjamanBarang[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Per-card upload state: id_peminjaman → files
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const kondisiInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const buktiInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Auth check on mount ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/kurir/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.karyawan) setUser(d.karyawan);
      })
      .finally(() => setLoadingAuth(false));
  }, []);

  // ── Fetch lendings ───────────────────────────────────────────
  const fetchLendings = useCallback(async () => {
    setLoadingData(true);
    try {
      const r = await fetch('/api/kurir/lending');
      if (r.ok) {
        const d = await r.json();
        setLendings(d.data || []);
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchLendings();
  }, [user, fetchLendings]);

  // ── Login ────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/karyawan-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Login gagal'); return; }
      setUser(data.karyawan);
    } catch {
      setLoginError('Terjadi kesalahan jaringan');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────
  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {});
    setUser(null);
    setLendings([]);
  };

  // ── Upload file util ─────────────────────────────────────────
  async function uploadFileToGDrive(file: File, prefix: string, kode: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prefix', `Kurir_${prefix}_${kode}`);
    const res = await fetch('/api/upload-google-drive', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload gagal');
    const d = await res.json();
    return d.url as string;
  }

  // ── Save kondisi (mulai pengiriman) ─────────────────────────
  const handleMulaiKirim = async (l: PeminjamanBarang) => {
    const id = l.id_peminjaman!;
    const files = uploads[id]?.kondisi || [];
    if (files.length === 0 && !window.confirm('Tidak ada foto kondisi barang. Lanjutkan tanpa foto?')) return;

    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const kode = l.kode_peminjaman || id.slice(-5);
      const uploadedUrls: string[] = [];
      for (const f of files) {
        const url = await uploadFileToGDrive(f, 'kondisi', kode);
        uploadedUrls.push(url);
      }

      const existing = Array.isArray(l.foto_kondisi_kurir) ? l.foto_kondisi_kurir : [];
      const res = await fetch('/api/kurir/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_peminjaman: id,
          id_kurir: user?.id_karyawan,
          foto_kondisi_kurir: [...existing, ...uploadedUrls],
          status_pengiriman: 'dikirim',
        }),
      });
      if (!res.ok) throw new Error('Gagal update status');
      await fetchLendings();
      setUploads(prev => ({ ...prev, [id]: { ...prev[id], kondisi: [] } }));
    } catch (e) {
      alert('Gagal: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  // ── Save bukti (selesaikan pengiriman) ───────────────────────
  const handleSelesaikanKirim = async (l: PeminjamanBarang) => {
    const id = l.id_peminjaman!;
    const files = uploads[id]?.bukti || [];
    if (files.length === 0 && !window.confirm('Tidak ada foto bukti pengiriman. Selesaikan tanpa foto?')) return;
    if (!window.confirm('Tandai pengiriman sebagai SELESAI?')) return;

    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const kode = l.kode_peminjaman || id.slice(-5);
      const uploadedUrls: string[] = [];
      for (const f of files) {
        const url = await uploadFileToGDrive(f, 'bukti', kode);
        uploadedUrls.push(url);
      }

      const existing = Array.isArray(l.foto_bukti_pengiriman) ? l.foto_bukti_pengiriman : [];
      const res = await fetch('/api/kurir/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_peminjaman: id,
          foto_bukti_pengiriman: [...existing, ...uploadedUrls],
          status_pengiriman: 'terkirim',
        }),
      });
      if (!res.ok) throw new Error('Gagal update status');
      await fetchLendings();
      setUploads(prev => ({ ...prev, [id]: { ...prev[id], bukti: [] } }));
    } catch (e) {
      alert('Gagal: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  // ── File input handler ───────────────────────────────────────
  function handleFileChange(id: string, type: 'kondisi' | 'bukti', files: FileList | null) {
    if (!files) return;
    const current = uploads[id]?.[type] || [];
    const newFiles = Array.from(files);
    const merged = [...current, ...newFiles].slice(0, 3);
    setUploads(prev => ({ ...prev, [id]: { ...(prev[id] || { kondisi: [], bukti: [] }), [type]: merged } }));
  }

  function removeFile(id: string, type: 'kondisi' | 'bukti', idx: number) {
    setUploads(prev => {
      const curr = prev[id]?.[type] || [];
      return { ...prev, [id]: { ...(prev[id] || { kondisi: [], bukti: [] }), [type]: curr.filter((_, i) => i !== idx) } };
    });
  }

  // ────────────────────────────────────────────────────────────
  // Render: Loading
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm animate-pulse">Memuat...</div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Render: Login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🚚</div>
            <h1 className="text-xl font-black text-gray-900">Portal Kurir</h1>
            <p className="text-sm text-gray-500 mt-1">Alta Nikindo — Pengiriman Barang</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{loginError}</div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Username karyawan"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Password"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#FFE500] hover:bg-[#E5CE00] text-black font-bold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
            >
              {loginLoading ? 'Memuat...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Render: Main
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚚</span>
            <div>
              <h1 className="font-black text-gray-900 text-base leading-tight">Portal Kurir</h1>
              <p className="text-xs text-gray-500">Halo, {user.nama_karyawan}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLendings}
              disabled={loadingData}
              className="text-xs text-blue-600 hover:underline font-bold disabled:opacity-50"
            >
              {loadingData ? '...' : '↻ Refresh'}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-600 font-bold px-2 py-1 rounded border border-gray-200 hover:border-red-200 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loadingData && lendings.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10 animate-pulse">Memuat data pengiriman...</div>
        )}

        {!loadingData && lendings.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-16">
            <div className="text-4xl mb-3">📦</div>
            <p className="font-medium">Tidak ada pengiriman aktif</p>
            <p className="text-xs mt-1">Semua pengiriman sudah selesai atau belum ada peminjaman baru.</p>
          </div>
        )}

        {lendings.map(l => {
          const id = l.id_peminjaman!;
          const isExpanded = expanded[id] !== false; // default expanded
          const isSaving = saving[id];
          const uploadState = uploads[id] || { kondisi: [], bukti: [] };
          const status = l.status_pengiriman || 'menunggu';

          const fotoKondisiExisting: string[] = Array.isArray(l.foto_kondisi_kurir) ? l.foto_kondisi_kurir : [];
          const fotoBuktiExisting: string[] = Array.isArray(l.foto_bukti_pengiriman) ? l.foto_bukti_pengiriman : [];

          return (
            <div key={id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Card Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpanded(prev => ({ ...prev, [id]: !isExpanded }))}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{l.nama_peminjam}</span>
                      {l.kode_peminjaman && (
                        <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded tracking-wider">{l.kode_peminjaman}</span>
                      )}
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {l.items_dipinjam?.length || 0} barang
                      {l.tanggal_estimasi_pengembalian && ` • Est. ${new Date(l.tanggal_estimasi_pengembalian).toLocaleDateString('id-ID')}`}
                    </p>
                  </div>
                </div>
                <span className="text-gray-400 text-lg ml-2">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {/* Card Body */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                  {/* Daftar barang */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Barang Dipinjam</h3>
                    <ul className="space-y-1.5">
                      {l.items_dipinjam?.map((item, idx) => {
                        const accs = [item.accs1, item.accs2, item.accs3, item.accs4, item.accs5, item.accs6, item.accs7].filter(Boolean);
                        return (
                          <li key={idx} className="text-sm text-gray-800">
                            <span className="font-medium">{item.nama_barang}</span>
                            <span className="text-gray-500 font-mono text-xs ml-2">SN: {item.nomor_seri}</span>
                            {accs.length > 0 && <div className="text-xs text-gray-500 mt-0.5 pl-2">• {accs.join(', ')}</div>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* ── Foto Kondisi Barang (sebelum dikirim) ────────────── */}
                  {status !== 'terkirim' && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-3">
                      <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                        📸 Foto Kondisi Barang <span className="font-normal normal-case">(sebelum dikirim, maks 3)</span>
                      </h3>

                      {/* Existing photos */}
                      {fotoKondisiExisting.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fotoKondisiExisting.map((url, fi) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={fi} src={proxyImg(url) || url} alt="" className="w-16 h-16 object-cover rounded-lg border border-blue-200" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                          ))}
                        </div>
                      )}

                      {/* New file previews */}
                      {uploadState.kondisi.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {uploadState.kondisi.map((f, fi) => (
                            <div key={fi} className="relative w-16 h-16">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-blue-300" />
                              <button
                                type="button"
                                onClick={() => removeFile(id, 'kondisi', fi)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {fotoKondisiExisting.length + uploadState.kondisi.length < 3 && status === 'menunggu' && (
                        <>
                          <input
                            ref={el => { kondisiInputRefs.current[id] = el; }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            onChange={e => handleFileChange(id, 'kondisi', e.target.files)}
                          />
                          <button
                            type="button"
                            onClick={() => kondisiInputRefs.current[id]?.click()}
                            className="text-xs text-blue-600 font-bold border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition"
                          >
                            + Tambah Foto Kondisi
                          </button>
                        </>
                      )}

                      {status === 'menunggu' && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleMulaiKirim(l)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
                        >
                          {isSaving ? 'Menyimpan...' : '🚚 Mulai Pengiriman'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Foto Bukti Pengiriman ─────────────────────────────── */}
                  {(status === 'dikirim' || status === 'terkirim') && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 space-y-3">
                      <h3 className="text-xs font-bold text-green-800 uppercase tracking-wider">
                        📷 Foto Bukti Pengiriman <span className="font-normal normal-case">(maks 3)</span>
                      </h3>

                      {/* Existing photos */}
                      {fotoBuktiExisting.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fotoBuktiExisting.map((url, fi) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={fi} src={proxyImg(url) || url} alt="" className="w-16 h-16 object-cover rounded-lg border border-green-200" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                          ))}
                        </div>
                      )}

                      {/* New file previews */}
                      {status === 'dikirim' && uploadState.bukti.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {uploadState.bukti.map((f, fi) => (
                            <div key={fi} className="relative w-16 h-16">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-green-300" />
                              <button
                                type="button"
                                onClick={() => removeFile(id, 'bukti', fi)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {status === 'dikirim' && fotoBuktiExisting.length + uploadState.bukti.length < 3 && (
                        <>
                          <input
                            ref={el => { buktiInputRefs.current[id] = el; }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            onChange={e => handleFileChange(id, 'bukti', e.target.files)}
                          />
                          <button
                            type="button"
                            onClick={() => buktiInputRefs.current[id]?.click()}
                            className="text-xs text-green-700 font-bold border border-green-300 rounded-lg px-3 py-1.5 hover:bg-green-100 transition"
                          >
                            + Tambah Foto Bukti
                          </button>
                        </>
                      )}

                      {status === 'dikirim' && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSelesaikanKirim(l)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
                        >
                          {isSaving ? 'Menyimpan...' : '✅ Pengiriman Selesai'}
                        </button>
                      )}

                      {status === 'terkirim' && (
                        <div className="text-center text-green-700 font-bold text-sm py-2">
                          ✅ Pengiriman telah selesai
                          {l.tanggal_dikirim && (
                            <p className="text-xs font-normal text-green-600 mt-1">
                              {new Date(l.tanggal_dikirim).toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
