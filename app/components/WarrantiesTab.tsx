'use client';

import React from 'react';
import { Garansi, ClaimPromo, Karyawan } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash, IconSend, IconDoc, IconShield } from '@/app/components/GradientActionBtn';
import { SortConfig, handleSort } from '@/app/lib/uiHelpers';

export interface WarrantiesTabProps {
  warranties: Garansi[];
  sortedWarranties: Garansi[];
  claims: ClaimPromo[];
  warrantyStatusCounts: Record<string, number>;
  filterStatusGaransi: string;
  setFilterStatusGaransi: (v: string) => void;
  searchGaransi: string;
  setSearchGaransi: (v: string) => void;
  filterDuplikatGaransi: boolean;
  setFilterDuplikatGaransi: React.Dispatch<React.SetStateAction<boolean>>;
  duplicateGaransiIds: Set<string>;
  garansiNumberMap: Map<string, number>;
  sortConfigWarranties: SortConfig;
  setSortConfigWarranties: React.Dispatch<React.SetStateAction<SortConfig>>;
  viewMode: 'table' | 'card';
  currentUser: Karyawan | null;
  calculateSisaGaransi: (tgl: string | undefined, lama: string) => string;
  openImageViewer: (urlOrFile: string | File) => void;
  handleKirimStatusGaransi: (w: Garansi) => Promise<void> | void;
  openModal: (action: 'create' | 'edit', type: 'warranty', item?: Garansi) => void;
  handleDelete: (type: 'warranty', id: string) => unknown;
}

export default function WarrantiesTab({
  warranties,
  sortedWarranties,
  claims,
  warrantyStatusCounts,
  filterStatusGaransi,
  setFilterStatusGaransi,
  searchGaransi,
  setSearchGaransi,
  filterDuplikatGaransi,
  setFilterDuplikatGaransi,
  duplicateGaransiIds,
  garansiNumberMap,
  sortConfigWarranties,
  setSortConfigWarranties,
  viewMode,
  currentUser,
  calculateSisaGaransi,
  openImageViewer,
  handleKirimStatusGaransi,
  openModal,
  handleDelete,
}: WarrantiesTabProps) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  const validCount = warrantyStatusCounts['Valid'] ?? 0;
  const belumCount = warrantyStatusCounts['Belum'] ?? 0;
  const lainnya = warranties.length - validCount - belumCount;
  const statCards = [
    { key: 'Semua', label: 'Total Garansi', count: warranties.length, accent: '#6b7280', sub: 'Semua data' },
    { key: 'Valid', label: 'Valid', count: validCount, accent: '#10b981', sub: 'Sudah divalidasi' },
    { key: 'Belum', label: 'Belum Validasi', count: belumCount, accent: '#f59e0b', sub: 'Perlu aksi' },
    { key: '__lain', label: 'Lainnya', count: lainnya, accent: '#6366f1', sub: 'Status lain' },
  ];

  const statusColor: Record<string, string> = {
    'Valid': 'bg-emerald-100 text-emerald-700',
    'Belum': 'bg-amber-100 text-amber-700',
    'Menunggu': 'bg-amber-100 text-amber-700',
    'Ditolak': 'bg-red-100 text-red-700',
  };

  const renderRow = (w: Garansi) => {
    const linked = claims.find((c: ClaimPromo) => c.nomor_seri === w.nomor_seri);
    const linkNota = w.link_nota_pembelian || linked?.link_nota_pembelian;
    const linkGaransi = w.link_kartu_garansi || linked?.link_kartu_garansi;
    const tglBeli = linked?.tanggal_pembelian || w.tanggal_pembelian;
    const namaText = w.nama_pendaftar || linked?.nama_pendaftar || '-';
    const waText = w.nomor_wa || linked?.nomor_wa || '-';
    const tokoText = w.nama_toko || linked?.nama_toko || '-';
    const pillClass = statusColor[w.status_validasi] ?? 'bg-gray-100 text-gray-600';
    return { linked, linkNota, linkGaransi, tglBeli, namaText, waText, tokoText, pillClass };
  };

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      {/* Stat cards — clickable filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(s => (
          <button key={s.key}
            onClick={() => setFilterStatusGaransi(filterStatusGaransi === s.key ? 'Semua' : s.key)}
            className={`bg-white rounded-xl p-4 text-left border transition-all hover:shadow-sm ${filterStatusGaransi === s.key ? 'border-gray-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
            style={{ borderTop: `3px solid ${s.accent}` }}
          >
            <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs mt-1.5 font-medium" style={{ color: s.accent }}>{s.sub}</p>
          </button>
        ))}
      </div>

      {/* Search + quick filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" title="Cari Garansi" aria-label="Cari Garansi" placeholder="Cari Nomor Seri..." value={searchGaransi} onChange={e => setSearchGaransi(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 bg-white text-gray-800 rounded-lg outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-xs" />
        </div>
        <button
          onClick={() => setFilterDuplikatGaransi(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap transition ${filterDuplikatGaransi ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-600 border-red-200 hover:border-red-400'}`}
        >
          Duplikat <span className={`font-bold px-1 py-0.5 rounded-full ${filterDuplikatGaransi ? 'bg-white/20' : 'bg-red-100'}`}>{duplicateGaransiIds.size}</span>
        </button>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'Semua', label: 'Semua', count: warranties.length, activeClass: 'bg-gray-700 text-white', inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
            { key: 'Valid', label: 'Valid', count: warrantyStatusCounts['Valid'] ?? 0, activeClass: 'bg-emerald-500 text-white', inactiveClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
            { key: 'Belum', label: 'Belum Validasi', count: warrantyStatusCounts['Belum'] ?? 0, activeClass: 'bg-amber-500 text-white', inactiveClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
            ...Object.entries(warrantyStatusCounts)
              .filter(([k]) => k !== 'Valid' && k !== 'Belum')
              .map(([k, v]) => ({ key: k, label: k, count: v, activeClass: 'bg-indigo-500 text-white', inactiveClass: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' })),
          ].map(p => (
            <button key={p.key}
              onClick={() => setFilterStatusGaransi(filterStatusGaransi === p.key ? 'Semua' : p.key)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition flex items-center gap-1 ${filterStatusGaransi === p.key ? p.activeClass : p.inactiveClass}`}
            >
              {p.label} <span className="font-bold">{p.count}</span>
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">No</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama / WA</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'nomor_seri')}>No Seri / Barang {sortConfigWarranties.column === 'nomor_seri' && <span>{sortConfigWarranties.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tgl Beli / Toko</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'jenis_garansi')}>Jenis / Sisa {sortConfigWarranties.column === 'jenis_garansi' && <span>{sortConfigWarranties.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'status_validasi')}>Status {sortConfigWarranties.column === 'status_validasi' && <span>{sortConfigWarranties.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedWarranties.map((w: Garansi) => {
                const { linkNota, linkGaransi, tglBeli, namaText, waText, tokoText, pillClass } = renderRow(w);
                return (
                  <tr key={w.id_garansi} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-center text-xs font-bold text-gray-400">{garansiNumberMap.get(w.id_garansi!)}</td>
                    <td className={`px-3 py-3 ${duplicateGaransiIds.has(w.id_garansi!) ? 'bg-red-50' : ''}`}>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{namaText}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{waText}</p>
                    </td>
                    <td className={`px-3 py-3 ${duplicateGaransiIds.has(w.id_garansi!) ? 'bg-red-50' : ''}`}>
                      <p className="font-mono font-bold text-sm text-gray-900 flex items-center gap-2">
                        {w.nomor_seri}
                        {duplicateGaransiIds.has(w.id_garansi!) && (
                          <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold whitespace-nowrap animate-pulse">DUPLIKAT</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{w.tipe_barang}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-gray-700">{tglBeli || '-'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tokoText}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-semibold text-gray-700">{w.jenis_garansi || '-'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{calculateSisaGaransi(tglBeli ?? undefined, w.lama_garansi)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${pillClass}`}>{w.status_validasi}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                          {linkNota && (
                            <GradientActionBtn onClick={() => openImageViewer(linkNota as string)} label="Nota" gradientFrom="#3B82F6" gradientTo="#06B6D4" icon={IconDoc} />
                          )}
                          {linkGaransi && (
                            <GradientActionBtn onClick={() => openImageViewer(linkGaransi as string)} label="Garansi" gradientFrom="#8B5CF6" gradientTo="#A78BFA" icon={IconShield} />
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <GradientActionBtn onClick={() => openModal('edit', 'warranty', w)} label="Edit" gradientFrom="#3B82F6" gradientTo="#60A5FA" icon={IconEdit} />
                          <GradientActionBtn onClick={() => handleKirimStatusGaransi(w)} label="Kirim" gradientFrom="#10B981" gradientTo="#34D399" icon={IconSend} />
                          {isAdmin && (
                            <GradientActionBtn onClick={() => handleDelete('warranty', w.id_garansi!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedWarranties.map((w: Garansi) => {
            const { linkNota, linkGaransi, tglBeli, namaText, waText, tokoText, pillClass } = renderRow(w);
            return (
              <div key={w.id_garansi} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{namaText}</p>
                    <p className="text-xs text-gray-400">{waText}</p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold ${pillClass}`}>{w.status_validasi}</span>
                </div>
                {/* No Seri + Barang */}
                <div className={`rounded-lg px-3 py-2 ${duplicateGaransiIds.has(w.id_garansi!) ? 'bg-red-100' : 'bg-gray-50'}`}>
                  <p className="font-mono font-bold text-sm text-gray-900 flex items-center gap-2">
                    {w.nomor_seri}
                    {duplicateGaransiIds.has(w.id_garansi!) && (
                      <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold whitespace-nowrap animate-pulse">DUPLIKAT</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{w.tipe_barang}</p>
                </div>
                {/* Detail */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div><span className="text-gray-400 block">Tgl Beli</span><span className="font-semibold text-gray-700">{tglBeli || '-'}</span></div>
                  <div><span className="text-gray-400 block">Toko</span><span className="font-semibold text-gray-700">{tokoText}</span></div>
                  <div><span className="text-gray-400 block">Jenis</span><span className="font-semibold text-gray-700">{w.jenis_garansi || '-'}</span></div>
                  <div><span className="text-gray-400 block">Sisa</span><span className="font-semibold text-gray-700">{calculateSisaGaransi(tglBeli ?? undefined, w.lama_garansi)}</span></div>
                </div>
                {/* Lampiran */}
                {(linkNota || linkGaransi) && (
                  <div className="flex gap-1.5">
                    {linkNota && <GradientActionBtn onClick={() => openImageViewer(linkNota as string)} label="Nota" gradientFrom="#3B82F6" gradientTo="#06B6D4" icon={IconDoc} />}
                    {linkGaransi && <GradientActionBtn onClick={() => openImageViewer(linkGaransi as string)} label="Garansi" gradientFrom="#8B5CF6" gradientTo="#A78BFA" icon={IconShield} />}
                  </div>
                )}
                {/* Aksi */}
                <div className="pt-2 border-t border-gray-100 flex gap-1.5 justify-end">
                  <GradientActionBtn onClick={() => openModal('edit', 'warranty', w)} label="Edit" gradientFrom="#3B82F6" gradientTo="#60A5FA" icon={IconEdit} />
                  <GradientActionBtn onClick={() => handleKirimStatusGaransi(w)} label="Kirim" gradientFrom="#10B981" gradientTo="#34D399" icon={IconSend} />
                  {isAdmin && (
                    <GradientActionBtn onClick={() => handleDelete('warranty', w.id_garansi!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
