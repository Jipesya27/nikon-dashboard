'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Garansi = {
  id_garansi: number;
  created_at: string;
  nomor_wa: string;
  nama_pendaftar: string;
  tipe_barang: string;
  nomor_seri: string;
  tanggal_pembelian: string | null;
  nama_toko: string;
  nomor_wa_update: string | null;
  link_kartu_garansi: string | null;
  link_nota_pembelian: string | null;
  validasi_by_mkt: string | null;
  validasi_by_fa: string | null;
  jenis_garansi: string | null;
  lama_garansi: string | null;
  status_validasi: string | null;
  catatan_mkt: string | null;
  catatan_fa: string | null;
};

const STATUS_VALUES    = ['Dalam Proses Verifikasi', 'Valid', 'Tidak Valid', 'HOLD'];
const JENIS_GARANSI    = ['Jasa 30%', 'Jasa 50%', 'Jasa 100%', 'Sparepart 30%', 'Sparepart 50%', 'Sparepart 100%', 'Full'];
const LAMA_GARANSI     = ['6 Bulan', '1 Tahun', '2 Tahun', '3 Tahun'];
const STATUS_VALIDASI  = ['Menunggu', 'Proses Validasi', 'Valid', 'Tidak Valid'];

const STATUS_STYLE: Record<string, string> = {
  'Dalam Proses Verifikasi': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Valid':        'bg-green-500/20 text-green-300 border-green-500/30',
  'Tidak Valid':  'bg-red-500/20 text-red-300 border-red-500/30',
  'HOLD':         'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'null':         'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
};

function badge(val: string | null) {
  const key = val || 'null';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${STATUS_STYLE[key] || STATUS_STYLE['null']}`}>
      {val || 'Belum Diverifikasi'}
    </span>
  );
}

export default function AdminGaransiPage() {
  const [items, setItems]       = useState<Garansi[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl]   = useState<string | null>(null);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [savingId, setSavingId]         = useState<number | null>(null);
  const [edits, setEdits]               = useState<Record<number, Partial<Garansi>>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), search, status: filterStatus });
      const res  = await fetch(`/api/admin/garansi?${params}`);
      const data = await res.json();
      setItems(data.garansi || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, filterStatus]);

  function getEdit(id: number, field: keyof Garansi, fallback: string | null): string {
    return (edits[id]?.[field] as string | null) ?? (fallback || '');
  }

  function setEdit(id: number, field: keyof Garansi, value: string) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveValidasi(item: Garansi) {
    setSavingId(item.id_garansi);
    try {
      const edit = edits[item.id_garansi] || {};
      const payload: Record<string, string> = {};
      const fields: (keyof Garansi)[] = ['validasi_by_mkt', 'validasi_by_fa', 'catatan_mkt', 'catatan_fa', 'jenis_garansi', 'lama_garansi', 'status_validasi'];
      for (const f of fields) {
        if (edit[f] !== undefined) payload[f as string] = edit[f] as string;
      }
      const res = await fetch(`/api/admin/garansi/${item.id_garansi}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Validasi disimpan & notif WA terkirim');
      setEdits(prev => { const n = { ...prev }; delete n[item.id_garansi]; return n; });
      await fetchData();
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-bold" onClick={() => setLightboxUrl(null)}>✕</button>
        </div>
      )}

      {toast && (
        <div className={`fixed top-5 right-5 z-40 px-4 py-3 rounded-lg shadow-xl text-sm font-semibold ${toast.ok ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {toast.msg}
        </div>
      )}

      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/homepage" className="text-zinc-400 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-xl font-black tracking-tight">Registrasi Garansi</h1>
          <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-2 py-0.5 rounded">{total}</span>
        </div>
        <Link href="/admin/claims" className="text-sm text-zinc-400 hover:text-[#ffe000] transition-colors">Lihat Klaim →</Link>
      </div>

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
        </select>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">Memuat data...</div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">Tidak ada data garansi.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Pendaftar</th>
                <th className="text-left px-4 py-3">Produk</th>
                <th className="text-left px-4 py-3">Toko & Tgl</th>
                <th className="text-left px-4 py-3">Status MKT</th>
                <th className="text-left px-4 py-3">Garansi</th>
                <th className="text-left px-4 py-3">Foto</th>
                <th className="text-left px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isExpanded = expandedId === item.id_garansi;
                return (
                  <React.Fragment key={item.id_garansi}>
                    <tr
                      className="border-b border-zinc-900 hover:bg-zinc-900/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : item.id_garansi)}
                    >
                      <td className="px-4 py-3 text-zinc-500 text-xs">{item.id_garansi}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{item.nama_pendaftar}</div>
                        <div className="text-zinc-500 text-xs">{item.nomor_wa}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{item.tipe_barang}</div>
                        <div className="text-zinc-500 text-xs font-mono">{item.nomor_seri}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        <div>{item.nama_toko}</div>
                        {item.tanggal_pembelian && <div>{item.tanggal_pembelian}</div>}
                      </td>
                      <td className="px-4 py-3">{badge(item.validasi_by_mkt)}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {item.jenis_garansi && <div>{item.jenis_garansi}</div>}
                        {item.lama_garansi  && <div>{item.lama_garansi}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {item.link_kartu_garansi && isDriveImg(item.link_kartu_garansi) && (
                            <button onClick={e => { e.stopPropagation(); setLightboxUrl(driveThumb(item.link_kartu_garansi, 'w1600')); }}
                              className="w-10 h-10 rounded overflow-hidden border border-zinc-700 hover:border-[#ffe000] transition-colors">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={driveThumb(item.link_kartu_garansi)} alt="garansi" className="w-full h-full object-cover" />
                            </button>
                          )}
                          {item.link_nota_pembelian && isDriveImg(item.link_nota_pembelian) && (
                            <button onClick={e => { e.stopPropagation(); setLightboxUrl(driveThumb(item.link_nota_pembelian, 'w1600')); }}
                              className="w-10 h-10 rounded overflow-hidden border border-zinc-700 hover:border-[#ffe000] transition-colors">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={driveThumb(item.link_nota_pembelian)} alt="nota" className="w-full h-full object-cover" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-zinc-500 text-xs">{isExpanded ? '▲ Tutup' : '▼ Verifikasi'}</span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-zinc-900/70 border-b border-zinc-800">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Foto */}
                            <div>
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Dokumen</p>
                              <div className="flex gap-4 flex-wrap">
                                {item.link_kartu_garansi && (
                                  <div className="flex flex-col gap-1 items-center">
                                    <span className="text-xs text-zinc-500">Kartu Garansi</span>
                                    {isDriveImg(item.link_kartu_garansi) ? (
                                      <button onClick={() => setLightboxUrl(driveThumb(item.link_kartu_garansi, 'w1600'))}
                                        className="w-32 h-24 rounded-lg overflow-hidden border border-zinc-700 hover:border-[#ffe000] transition-colors">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={driveThumb(item.link_kartu_garansi)} alt="kartu garansi" className="w-full h-full object-cover" />
                                      </button>
                                    ) : (
                                      <a href={item.link_kartu_garansi} target="_blank" rel="noopener noreferrer"
                                        className="text-[#ffe000] text-xs underline">Buka Link</a>
                                    )}
                                  </div>
                                )}
                                {item.link_nota_pembelian && (
                                  <div className="flex flex-col gap-1 items-center">
                                    <span className="text-xs text-zinc-500">Nota Pembelian</span>
                                    {isDriveImg(item.link_nota_pembelian) ? (
                                      <button onClick={() => setLightboxUrl(driveThumb(item.link_nota_pembelian, 'w1600'))}
                                        className="w-32 h-24 rounded-lg overflow-hidden border border-zinc-700 hover:border-[#ffe000] transition-colors">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={driveThumb(item.link_nota_pembelian)} alt="nota" className="w-full h-full object-cover" />
                                      </button>
                                    ) : (
                                      <a href={item.link_nota_pembelian} target="_blank" rel="noopener noreferrer"
                                        className="text-[#ffe000] text-xs underline">Buka Link</a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Form validasi */}
                            <div className="space-y-3">
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Verifikasi</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-zinc-400 mb-1 block">Status MKT</label>
                                  <select value={getEdit(item.id_garansi, 'validasi_by_mkt', item.validasi_by_mkt)}
                                    onChange={e => setEdit(item.id_garansi, 'validasi_by_mkt', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffe000]">
                                    <option value="">-- Belum --</option>
                                    {STATUS_VALUES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-zinc-400 mb-1 block">Status Validasi</label>
                                  <select value={getEdit(item.id_garansi, 'status_validasi', item.status_validasi)}
                                    onChange={e => setEdit(item.id_garansi, 'status_validasi', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffe000]">
                                    <option value="">-- Belum --</option>
                                    {STATUS_VALIDASI.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-zinc-400 mb-1 block">Jenis Garansi</label>
                                  <select value={getEdit(item.id_garansi, 'jenis_garansi', item.jenis_garansi)}
                                    onChange={e => setEdit(item.id_garansi, 'jenis_garansi', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffe000]">
                                    <option value="">-- Pilih --</option>
                                    {JENIS_GARANSI.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-zinc-400 mb-1 block">Lama Garansi</label>
                                  <select value={getEdit(item.id_garansi, 'lama_garansi', item.lama_garansi)}
                                    onChange={e => setEdit(item.id_garansi, 'lama_garansi', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#ffe000]">
                                    <option value="">-- Pilih --</option>
                                    {LAMA_GARANSI.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-zinc-400 mb-1 block">Catatan MKT</label>
                                <textarea value={getEdit(item.id_garansi, 'catatan_mkt', item.catatan_mkt)}
                                  onChange={e => setEdit(item.id_garansi, 'catatan_mkt', e.target.value)}
                                  onClick={e => e.stopPropagation()} rows={2}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white resize-none focus:outline-none focus:border-[#ffe000]"
                                  placeholder="Catatan Marketing..." />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-400 mb-1 block">Catatan FA</label>
                                <textarea value={getEdit(item.id_garansi, 'catatan_fa', item.catatan_fa)}
                                  onChange={e => setEdit(item.id_garansi, 'catatan_fa', e.target.value)}
                                  onClick={e => e.stopPropagation()} rows={2}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white resize-none focus:outline-none focus:border-[#ffe000]"
                                  placeholder="Catatan Finance & Admin..." />
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); saveValidasi(item); }}
                                disabled={savingId === item.id_garansi}
                                className="w-full bg-[#ffe000] text-black font-bold py-2.5 rounded text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
                              >
                                {savingId === item.id_garansi ? 'Menyimpan...' : '💾 Simpan & Kirim Notif WA'}
                              </button>
                              <p className="text-xs text-zinc-500">Notifikasi WA otomatis dikirim saat status = Valid/Tidak Valid.</p>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-6 border-t border-zinc-900">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 bg-zinc-800 text-sm rounded disabled:opacity-40 hover:bg-zinc-700">← Prev</button>
          <span className="text-zinc-400 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-800 text-sm rounded disabled:opacity-40 hover:bg-zinc-700">Next →</button>
        </div>
      )}
    </div>
  );
}
