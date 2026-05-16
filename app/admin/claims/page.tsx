'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Claim = {
  id_claim: number;
  created_at: string;
  nomor_wa: string;
  nama_pendaftar: string;
  nama_penerima_claim: string;
  tipe_barang: string;
  nomor_seri: string;
  jenis_promosi: string | null;
  tanggal_pembelian: string | null;
  nama_toko: string;
  alamat_pengiriman: string;
  nomor_wa_update: string | null;
  link_kartu_garansi: string | null;
  link_nota_pembelian: string | null;
  validasi_by_mkt: string | null;
  validasi_by_fa: string | null;
  catatan_mkt: string | null;
  catatan_fa: string | null;
};

const STATUS_VALUES = ['Dalam Proses Verifikasi', 'Valid', 'Tidak Valid', 'HOLD'];

const STATUS_STYLE: Record<string, string> = {
  'Dalam Proses Verifikasi': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Valid':   'bg-green-500/20 text-green-300 border-green-500/30',
  'Tidak Valid': 'bg-red-500/20 text-red-300 border-red-500/30',
  'HOLD':    'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'null':    'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
};

function badge(val: string | null) {
  const key = val || 'null';
  const label = val || 'Belum Diverifikasi';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${STATUS_STYLE[key] || STATUS_STYLE['null']}`}>
      {label}
    </span>
  );
}

export default function AdminClaimsPage() {
  const [claims, setClaims]     = useState<Claim[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl]   = useState<string | null>(null);
  const [docsModal, setDocsModal]       = useState<{ garansi: string | null; nota: string | null } | null>(null);
  const [zoomG, setZoomG]               = useState(1);
  const [zoomN, setZoomN]               = useState(1);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [savingId, setSavingId]         = useState<number | null>(null);
  // Per-row edit state
  const [edits, setEdits] = useState<Record<number, Partial<Claim>>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search,
        status: filterStatus,
      });
      const res = await fetch(`/api/admin/claims?${params}`);
      const data = await res.json();
      setClaims(data.claims || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterStatus]);

  function getEdit(id: number, field: keyof Claim, fallback: string | null): string {
    return (edits[id]?.[field] as string | null) ?? (fallback || '');
  }

  function setEdit(id: number, field: keyof Claim, value: string) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveValidasi(claim: Claim) {
    setSavingId(claim.id_claim);
    try {
      const edit = edits[claim.id_claim] || {};
      const payload: Record<string, string> = {};
      if (edit.validasi_by_mkt !== undefined) payload.validasi_by_mkt = edit.validasi_by_mkt as string;
      if (edit.validasi_by_fa  !== undefined) payload.validasi_by_fa  = edit.validasi_by_fa  as string;
      if (edit.catatan_mkt     !== undefined) payload.catatan_mkt     = edit.catatan_mkt     as string;
      if (edit.catatan_fa      !== undefined) payload.catatan_fa      = edit.catatan_fa      as string;

      const res = await fetch(`/api/admin/claims/${claim.id_claim}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Validasi disimpan & notif WA terkirim');
      setEdits(prev => { const n = { ...prev }; delete n[claim.id_claim]; return n; });
      await fetchClaims();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', false);
    } finally {
      setSavingId(null);
    }
  }

  const totalPages = Math.ceil(total / 20);
  const isDriveImg = (url: string | null) => url?.includes('drive.google.com') || url?.includes('googleusercontent.com');

  function driveThumb(url: string | null, size = 'w400'): string {
    if (!url) return '';
    const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=${size}`;
    return url;
  }

  function ZoomPanel({ label, url, zoom, setZoom }: { label: string; url: string | null; zoom: number; setZoom: (fn: (z: number) => number) => void }) {
    return (
      <div className="flex-1 flex flex-col bg-zinc-900 rounded-lg overflow-hidden min-w-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0 gap-2">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">{label}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold text-base leading-none">−</button>
            <span className="w-12 text-center text-xs text-zinc-400">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold text-base leading-none">+</button>
            <button onClick={() => setZoom(() => 1)} className="px-2 h-7 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 text-xs">Reset</button>
          </div>
        </div>
        <div
          className="flex-1 overflow-auto p-2"
          onWheel={e => { e.preventDefault(); setZoom(z => Math.min(5, Math.max(0.25, z + (e.deltaY > 0 ? -0.15 : 0.15)))); }}
        >
          {url ? (
            isDriveImg(url) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={driveThumb(url, 'w2000')}
                alt={label}
                style={{ width: `${zoom * 100}%`, height: 'auto', minWidth: '100%' }}
                className="rounded block"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#ffe000] underline text-sm">Buka di tab baru</a>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm">Tidak ada file</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Lightbox — untuk thumbnail di kolom Foto */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-bold" onClick={() => setLightboxUrl(null)}>✕</button>
        </div>
      )}

      {/* Dual-modal dokumen */}
      {docsModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setDocsModal(null)}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-sm font-bold text-white">Dokumen Claim</span>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>Scroll roda mouse untuk zoom · Drag untuk geser</span>
              <button onClick={() => setDocsModal(null)} className="text-white/60 hover:text-white text-2xl font-bold ml-2 leading-none">✕</button>
            </div>
          </div>
          <div className="flex flex-1 gap-2 p-2 overflow-hidden" onClick={e => e.stopPropagation()}>
            <ZoomPanel label="Kartu Garansi"   url={docsModal.garansi} zoom={zoomG} setZoom={setZoomG} />
            <ZoomPanel label="Nota Pembelian"  url={docsModal.nota}    zoom={zoomN} setZoom={setZoomN} />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-40 px-4 py-3 rounded-lg shadow-xl text-sm font-semibold ${toast.ok ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/homepage" className="text-zinc-400 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-xl font-black tracking-tight">Klaim Promo</h1>
          <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-2 py-0.5 rounded">{total}</span>
        </div>
        <Link href="/admin/garansi" className="text-sm text-zinc-400 hover:text-[#ffe000] transition-colors">Lihat Garansi →</Link>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-4 flex flex-wrap gap-3 border-b border-zinc-900">
        <input
          type="text"
          placeholder="Cari nama, WA, serial, produk…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 w-64 focus:outline-none focus:border-[#ffe000]"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ffe000]"
        >
          <option value="all">Semua Status MKT</option>
          {STATUS_VALUES.map(s => <option key={s} value={s}>{s}</option>)}
          <option value="null">Belum Diverifikasi</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">Memuat data...</div>
        ) : claims.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">Tidak ada data klaim.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Pendaftar</th>
                <th className="text-left px-4 py-3">Produk</th>
                <th className="text-left px-4 py-3">Toko & Tgl</th>
                <th className="text-left px-4 py-3">Status MKT</th>
                <th className="text-left px-4 py-3">Status FA</th>
                <th className="text-left px-4 py-3">Foto</th>
                <th className="text-left px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(c => {
                const isExpanded = expandedId === c.id_claim;
                return (
                  <React.Fragment key={c.id_claim}>
                    <tr
                      className="border-b border-zinc-900 hover:bg-zinc-900/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : c.id_claim)}
                    >
                      <td className="px-4 py-3 text-zinc-500 text-xs">{c.id_claim}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{c.nama_pendaftar}</div>
                        <div className="text-zinc-500 text-xs">{c.nomor_wa}</div>
                        {c.nama_penerima_claim !== c.nama_pendaftar && (
                          <div className="text-zinc-400 text-xs mt-0.5">→ {c.nama_penerima_claim}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{c.tipe_barang}</div>
                        <div className="text-zinc-500 text-xs font-mono">{c.nomor_seri}</div>
                        {c.jenis_promosi && <div className="text-[#ffe000] text-xs mt-0.5">{c.jenis_promosi}</div>}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        <div>{c.nama_toko}</div>
                        {c.tanggal_pembelian && <div>{c.tanggal_pembelian}</div>}
                      </td>
                      <td className="px-4 py-3">{badge(c.validasi_by_mkt)}</td>
                      <td className="px-4 py-3">{badge(c.validasi_by_fa)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {c.link_kartu_garansi && isDriveImg(c.link_kartu_garansi) && (
                            <button onClick={e => { e.stopPropagation(); setLightboxUrl(driveThumb(c.link_kartu_garansi, 'w1600')); }}
                              className="w-10 h-10 rounded overflow-hidden border border-zinc-700 hover:border-[#ffe000] transition-colors">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={driveThumb(c.link_kartu_garansi)} alt="garansi" className="w-full h-full object-cover" />
                            </button>
                          )}
                          {c.link_nota_pembelian && isDriveImg(c.link_nota_pembelian) && (
                            <button onClick={e => { e.stopPropagation(); setLightboxUrl(driveThumb(c.link_nota_pembelian, 'w1600')); }}
                              className="w-10 h-10 rounded overflow-hidden border border-zinc-700 hover:border-[#ffe000] transition-colors">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={driveThumb(c.link_nota_pembelian)} alt="nota" className="w-full h-full object-cover" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-zinc-500 text-xs">{isExpanded ? '▲ Tutup' : '▼ Verifikasi'}</span>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr className="bg-zinc-900/70 border-b border-zinc-800">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Dokumen */}
                            <div>
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Dokumen</p>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setZoomG(() => 1); setZoomN(() => 1);
                                  setDocsModal({ garansi: c.link_kartu_garansi, nota: c.link_nota_pembelian });
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-[#ffe000] rounded-lg transition-colors text-sm font-semibold text-white"
                              >
                                <svg className="w-4 h-4 text-[#ffe000]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Lihat Kartu Garansi &amp; Nota
                              </button>
                              <div className="mt-4">
                                <p className="text-xs text-zinc-500 mb-1">Alamat Pengiriman Hadiah</p>
                                <p className="text-sm text-zinc-300">{c.alamat_pengiriman}</p>
                              </div>
                            </div>

                            {/* Form validasi */}
                            <div className="space-y-4">
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Verifikasi</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-zinc-400 mb-1 block">Status MKT</label>
                                  <select
                                    value={getEdit(c.id_claim, 'validasi_by_mkt', c.validasi_by_mkt)}
                                    onChange={e => setEdit(c.id_claim, 'validasi_by_mkt', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffe000]"
                                  >
                                    <option value="">-- Belum --</option>
                                    {STATUS_VALUES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-zinc-400 mb-1 block">Status FA</label>
                                  <select
                                    value={getEdit(c.id_claim, 'validasi_by_fa', c.validasi_by_fa)}
                                    onChange={e => setEdit(c.id_claim, 'validasi_by_fa', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffe000]"
                                  >
                                    <option value="">-- Belum --</option>
                                    {STATUS_VALUES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-zinc-400 mb-1 block">Catatan MKT</label>
                                <textarea
                                  value={getEdit(c.id_claim, 'catatan_mkt', c.catatan_mkt)}
                                  onChange={e => setEdit(c.id_claim, 'catatan_mkt', e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  rows={2}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white resize-none focus:outline-none focus:border-[#ffe000]"
                                  placeholder="Catatan untuk Marketing..."
                                />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-400 mb-1 block">Catatan FA</label>
                                <textarea
                                  value={getEdit(c.id_claim, 'catatan_fa', c.catatan_fa)}
                                  onChange={e => setEdit(c.id_claim, 'catatan_fa', e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  rows={2}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white resize-none focus:outline-none focus:border-[#ffe000]"
                                  placeholder="Catatan untuk Finance & Admin..."
                                />
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); saveValidasi(c); }}
                                disabled={savingId === c.id_claim}
                                className="w-full bg-[#ffe000] text-black font-bold py-2.5 rounded text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
                              >
                                {savingId === c.id_claim ? 'Menyimpan...' : '💾 Simpan & Kirim Notif WA'}
                              </button>
                              <p className="text-xs text-zinc-500">Jika status = Valid/Tidak Valid, notifikasi WA otomatis dikirim ke konsumen.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-6 border-t border-zinc-900">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 bg-zinc-800 text-sm rounded disabled:opacity-40 hover:bg-zinc-700">
            ← Prev
          </button>
          <span className="text-zinc-400 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-800 text-sm rounded disabled:opacity-40 hover:bg-zinc-700">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
