'use client';
import React from 'react';
import { ClaimPromo, KonsumenData, Karyawan } from '@/app/index';

type SortDirection = 'asc' | 'desc' | null;
interface SortConfig { column: string; direction: SortDirection; }

export interface ClaimsTabProps {
  claims: ClaimPromo[];
  setClaims: React.Dispatch<React.SetStateAction<ClaimPromo[]>>;
  sortedClaims: ClaimPromo[];
  searchClaim: string;
  setSearchClaim: (v: string) => void;
  filterStatusWarna: string;
  setFilterStatusWarna: (v: string) => void;
  filterDuplikat: boolean;
  setFilterDuplikat: React.Dispatch<React.SetStateAction<boolean>>;
  duplicateClaimIds: Set<string>;
  hasActiveColFilters: boolean;
  setFilterColClaims: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  claimStatusCounts: Record<string, number>;
  viewMode: 'table' | 'card';
  setViewMode: React.Dispatch<React.SetStateAction<'table' | 'card'>>;
  filterColClaims: Record<string, string>;
  setClaimColFilter: (col: string, val: string) => void;
  claimColOptions: { tipe: string[]; promo: string[]; mkt: string[]; fa: string[] };
  sortConfigClaims: SortConfig;
  setSortConfigClaims: React.Dispatch<React.SetStateAction<SortConfig>>;
  handleSort: (config: SortConfig, setter: React.Dispatch<React.SetStateAction<SortConfig>>, column: string) => void;
  selectedClaimIds: Set<string>;
  setSelectedClaimIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  claimNumberMap: Map<string, number>;
  getClaimStatusColor: (c: ClaimPromo) => string;
  getBadgeStyle: (color: string) => string;
  getBadgeLabel: (color: string) => string;
  consumers: Record<string, string>;
  isGoogleDriveLink: (url: string) => boolean;
  openImageViewer: (urlOrFile: string | File) => void;
  formatTglBeli: (val?: string) => string;
  formatSubmitDate: (createdAt?: string) => string;
  getClaimDurationDays: (createdAt?: string) => string;
  currentUser: Karyawan | null;
  sbWrite: (opts: { action: string; table: string; data?: Record<string, unknown>; match?: Record<string, unknown> }) => Promise<unknown>;
  handlePrintLabelPengiriman: (c: ClaimPromo, rowNumber?: number) => void;
  consumersList: KonsumenData[];
  setReturnTab: (tab: string) => void;
  setActiveTab: (tab: string) => void;
  openModal: (mode: string, type: string, data?: unknown) => void;
  handleKirimStatusClaim: (c: ClaimPromo) => void;
  setResiModal: React.Dispatch<React.SetStateAction<ClaimPromo | null>>;
  setResiModalForm: React.Dispatch<React.SetStateAction<{ nama_jasa_pengiriman: string; nomor_resi: string }>>;
  handleDelete: (type: string, id: string) => void;
  getNamaPromo: (tipeBarang: string) => string;
  handleExportCSVClaim: () => void;
  handleTandaTerimaCSV: () => void;
  handleUploadResiCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  resiCsvInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function ClaimsTab({
  claims, setClaims, sortedClaims, searchClaim, setSearchClaim,
  filterStatusWarna, setFilterStatusWarna, filterDuplikat, setFilterDuplikat,
  duplicateClaimIds, hasActiveColFilters, setFilterColClaims, claimStatusCounts,
  viewMode, setViewMode, filterColClaims, setClaimColFilter, claimColOptions,
  sortConfigClaims, setSortConfigClaims, handleSort,
  selectedClaimIds, setSelectedClaimIds, claimNumberMap,
  getClaimStatusColor, getBadgeStyle, getBadgeLabel, consumers,
  isGoogleDriveLink, openImageViewer, formatTglBeli, formatSubmitDate,
  getClaimDurationDays, currentUser, sbWrite, handlePrintLabelPengiriman,
  consumersList, setReturnTab, setActiveTab, openModal, handleKirimStatusClaim,
  setResiModal, setResiModalForm, handleDelete, getNamaPromo,
  handleExportCSVClaim, handleTandaTerimaCSV, handleUploadResiCSV, resiCsvInputRef,
}: ClaimsTabProps) {
  const [expandedClaimIds, setExpandedClaimIds] = React.useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedClaimIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Stat card definitions
  const statCards = [
    { key: 'Semua',  label: 'Total Claim',   count: claims.length,              accent: '#6b7280', sub: 'Semua data' },
    { key: 'Pink',   label: 'Tunggu Resi',   count: claimStatusCounts.Pink ?? 0,  accent: '#f43f5e', sub: 'Perlu aksi' },
    { key: 'Hijau',  label: 'Selesai',       count: claimStatusCounts.Hijau ?? 0, accent: '#10b981', sub: 'Bulan ini' },
    { key: 'Biru',   label: 'Tunggu FA',     count: claimStatusCounts.Biru ?? 0,  accent: '#3b82f6', sub: 'Dalam review' },
  ];

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">

      {/* CONTENT HEADER */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900">Claim Promo</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="Cari nama, seri..." value={searchClaim} onChange={e => setSearchClaim(e.target.value)} className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 w-44" />
          </div>
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'table' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Baris</button>
            <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'card' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Kartu</button>
          </div>
          <button onClick={handleExportCSVClaim} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export
          </button>
          <button onClick={handleTandaTerimaCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition">
            Tanda Terima
          </button>
          <button onClick={() => resiCsvInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition">
            Upload Resi
          </button>
          <input ref={resiCsvInputRef} type="file" accept=".csv" className="hidden" onChange={handleUploadResiCSV} />
          <button onClick={() => openModal('create', 'claim')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFE500] hover:bg-[#E5CE00] text-black text-xs font-bold transition shadow-sm">
            + Tambah
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatusWarna(s.key)}
            className={`bg-white rounded-xl p-4 text-left border transition-all hover:shadow-sm ${filterStatusWarna === s.key ? 'border-gray-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
            style={{ borderTop: `3px solid ${s.accent}` }}
          >
            <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs mt-1.5 font-medium" style={{ color: s.accent }}>{s.sub}</p>
          </button>
        ))}
      </div>

      {/* FILTER ROW */}
      <div className="flex flex-wrap gap-2 items-center">
        <select id="status-warna-filter" aria-label="Filter Status Warna" value={filterStatusWarna} onChange={e => setFilterStatusWarna(e.target.value)} className="py-2 px-3 border border-gray-200 bg-white text-gray-700 rounded-lg outline-none focus:border-[#FFE500] text-xs sm:w-40">
          <option value="Semua">Semua Status</option>
          <option value="Putih">Belum Di Cek</option>
          <option value="Merah">Tidak Valid</option>
          <option value="Orange">Hold</option>
          <option value="Biru">Tunggu FA</option>
          <option value="Pink">Tunggu Resi</option>
          <option value="Hijau">Selesai</option>
          <option value="Teal">Resi Terkirim</option>
        </select>
        <button
          onClick={() => setFilterDuplikat(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap transition ${filterDuplikat ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-600 border-red-200 hover:border-red-400'}`}
        >
          Duplikat <span className={`font-bold px-1 py-0.5 rounded-full ${filterDuplikat ? 'bg-white/20' : 'bg-red-100'}`}>{duplicateClaimIds.size}</span>
        </button>
        {hasActiveColFilters && (
          <button onClick={() => setFilterColClaims({})} className="px-3 py-2 rounded-lg border text-xs font-semibold bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100">
            Reset Filter
          </button>
        )}
      </div>

      {/* TABLE SECTION HEADING + QUICK FILTER PILLS */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Daftar claim</h3>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {[
            { key: 'Semua',  label: 'Semua',        count: claims.length,                    activeClass: 'bg-gray-700 text-white',     inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
            { key: 'Putih',  label: 'Belum Di Cek', count: claimStatusCounts.Putih ?? 0,     activeClass: 'bg-gray-400 text-white',     inactiveClass: 'bg-gray-50 text-gray-500 hover:bg-gray-100' },
            { key: 'Merah',  label: 'Tidak Valid',  count: claimStatusCounts.Merah ?? 0,     activeClass: 'bg-red-500 text-white',      inactiveClass: 'bg-red-50 text-red-600 hover:bg-red-100' },
            { key: 'Orange', label: 'Hold',         count: claimStatusCounts.Orange ?? 0,    activeClass: 'bg-orange-500 text-white',   inactiveClass: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
            { key: 'Biru',   label: 'Tunggu FA',    count: claimStatusCounts.Biru ?? 0,      activeClass: 'bg-blue-500 text-white',     inactiveClass: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
            { key: 'Pink',   label: 'Tunggu Resi',  count: claimStatusCounts.Pink ?? 0,      activeClass: 'bg-rose-500 text-white',     inactiveClass: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
            { key: 'Hijau',  label: 'Selesai',      count: claimStatusCounts.Hijau ?? 0,     activeClass: 'bg-emerald-500 text-white',  inactiveClass: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
            { key: 'Teal',   label: 'Resi Terkirim',count: claimStatusCounts.Teal ?? 0,      activeClass: 'bg-teal-500 text-white',     inactiveClass: 'bg-teal-50 text-teal-600 hover:bg-teal-100' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setFilterStatusWarna(filterStatusWarna === p.key ? 'Semua' : p.key)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition flex items-center gap-1 ${filterStatusWarna === p.key ? p.activeClass : p.inactiveClass}`}
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
                <th className="px-3 py-3 text-center w-8">
                  <input type="checkbox" title="Pilih Semua" aria-label="Pilih Semua" className="w-4 h-4 cursor-pointer"
                    checked={sortedClaims.length > 0 && sortedClaims.every((c: ClaimPromo) => c.id_claim && selectedClaimIds.has(c.id_claim))}
                    onChange={e => { const next = new Set(selectedClaimIds); sortedClaims.forEach((c: ClaimPromo) => { if (c.id_claim) { e.target.checked ? next.add(c.id_claim) : next.delete(c.id_claim); } }); setSelectedClaimIds(next); }} />
                </th>
                <th className="px-2 py-2.5 w-6"></th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'nama_konsumen')}>
                  Nama {sortConfigClaims.column === 'nama_konsumen' && <span>{sortConfigClaims.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'nomor_seri')}>
                  No Seri {sortConfigClaims.column === 'nomor_seri' && <span>{sortConfigClaims.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'jenis_promosi')}>
                  Promo {sortConfigClaims.column === 'jenis_promosi' && <span>{sortConfigClaims.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'tanggal_pembelian')}>
                  Tgl Beli {sortConfigClaims.column === 'tanggal_pembelian' && <span>{sortConfigClaims.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Durasi</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedClaims.map((c: ClaimPromo) => {
                const isDuplicate = c.id_claim ? duplicateClaimIds.has(c.id_claim) : false;
                const isSelected = c.id_claim ? selectedClaimIds.has(c.id_claim) : false;
                const isExpanded = c.id_claim ? expandedClaimIds.has(c.id_claim) : false;
                const statusColor = getClaimStatusColor(c);
                const pillMap: Record<string, string> = {
                  Putih:  'bg-gray-100 text-gray-600',
                  Merah:  'bg-red-100 text-red-700',
                  Orange: 'bg-orange-100 text-orange-700',
                  Biru:   'bg-blue-100 text-blue-700',
                  Pink:   'bg-rose-100 text-rose-700',
                  Hijau:  'bg-emerald-100 text-emerald-700',
                  Teal:   'bg-teal-100 text-teal-700',
                };
                return (
                  <React.Fragment key={c.id_claim}>
                    <tr onClick={e => { if ((e.target as HTMLElement).closest('td:first-child,td:nth-child(2),button,a,input,select,textarea')) return; if (c.id_claim) toggleExpand(c.id_claim); }} className={`cursor-pointer hover:bg-blue-50/60 transition-colors ${isDuplicate ? 'bg-red-50' : ''} ${isSelected ? '!bg-blue-100 ring-1 ring-inset ring-blue-300' : ''}`}>
                      <td className="px-3 py-3 text-center">
                        <input type="checkbox" title="Pilih baris ini" aria-label="Pilih baris ini" className="w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={e => { if (c.id_claim) { const next = new Set(selectedClaimIds); e.target.checked ? next.add(c.id_claim!) : next.delete(c.id_claim!); setSelectedClaimIds(next); } }} />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button onClick={e => { e.stopPropagation(); if (c.id_claim) toggleExpand(c.id_claim); }} className="text-gray-400 hover:text-gray-700 transition" title={isExpanded ? 'Tutup detail' : 'Lihat detail'}>
                          <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{consumers[c.nomor_wa] || c.nomor_wa}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.nomor_wa}
                          {isDuplicate && <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1 py-0.5 rounded font-bold">DUPLIKAT</span>}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-700">{c.nomor_seri || '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-700 max-w-[140px]">
                        <span className="font-medium">{c.jenis_promosi || getNamaPromo(c.tipe_barang) || '-'}</span>
                        {c.tipe_barang && <p className="text-[11px] text-gray-400 mt-0.5">{c.tipe_barang}</p>}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{formatTglBeli(c.tanggal_pembelian)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pillMap[statusColor] || 'bg-gray-100 text-gray-600'}`}>
                          {getBadgeLabel(statusColor)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{getClaimDurationDays(c.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button onClick={() => handlePrintLabelPengiriman(c, claimNumberMap.get(c.id_claim!))} title="Print Label" className="p-1.5 rounded-lg text-blue-400 hover:text-blue-700 hover:bg-blue-50 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                          </button>
                          <button onClick={() => {
                            const consumerObj = consumersList.find(k => k.nomor_wa === c.nomor_wa);
                            if (consumerObj) { setReturnTab('claims'); setActiveTab('konsumen'); openModal('edit', 'konsumen', consumerObj); }
                            else alert('Data konsumen tidak ditemukan di database.');
                          }} title="Edit Alamat" className="p-1.5 rounded-lg text-orange-400 hover:text-orange-700 hover:bg-orange-50 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          </button>
                          <button onClick={() => handleKirimStatusClaim(c)} title="Kirim Status WA" className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                          </button>
                          {statusColor === 'Pink' && (
                            <button onClick={() => { setResiModal(c); setResiModalForm({ nama_jasa_pengiriman: c.nama_jasa_pengiriman || '', nomor_resi: c.nomor_resi || '' }); }} title="Isi Resi" className="p-1.5 rounded-lg text-pink-400 hover:text-pink-700 hover:bg-pink-50 transition">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>
                            </button>
                          )}
                          <button onClick={() => openModal('edit', 'claim', c)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={() => handleDelete('claim', c.id_claim!)} title="Hapus" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className={`${isDuplicate ? 'bg-red-50' : 'bg-gray-50/70'}`}>
                        <td colSpan={9} className="px-6 py-4 border-t border-dashed border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-2 text-xs">
                            <div><span className="text-gray-400 font-semibold uppercase tracking-wide">Barang</span><p className="text-gray-800 mt-0.5">{c.tipe_barang || '-'}</p></div>
                            <div><span className="text-gray-400 font-semibold uppercase tracking-wide">Tgl Submit</span><p className="text-gray-800 mt-0.5">{formatSubmitDate(c.created_at)}</p></div>
                            <div><span className="text-gray-400 font-semibold uppercase tracking-wide">Toko</span><p className="text-gray-800 mt-0.5">{c.nama_toko || '-'}</p></div>
                            <div><span className="text-gray-400 font-semibold uppercase tracking-wide">MKT / FA</span><p className="text-gray-800 mt-0.5">{c.validasi_by_mkt || '-'} / {c.validasi_by_fa || '-'}</p></div>
                            {c.nomor_resi && <div><span className="text-gray-400 font-semibold uppercase tracking-wide">No Resi</span><p className="text-gray-800 mt-0.5 font-mono">{c.nomor_resi} {c.nama_jasa_pengiriman && <span className="text-gray-500">({c.nama_jasa_pengiriman})</span>}</p></div>}
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wide">Tgl Cetak Label</span>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {(c.tanggal_cetak?.length ?? 0) === 0 ? (
                                  <span className="text-[10px] text-gray-400 italic">Belum dicetak</span>
                                ) : (
                                  <>
                                    {c.tanggal_cetak!.map((d, i) => (
                                      <span key={i} className="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded inline-block w-fit">✓ {d}</span>
                                    ))}
                                    {currentUser?.role === 'Super Admin' && (
                                      <button onClick={async () => {
                                        if (!c.id_claim) return;
                                        setClaims(prev => prev.map(cl => cl.id_claim === c.id_claim ? { ...cl, tanggal_cetak: [] } : cl));
                                        await sbWrite({ action: 'update', table: 'claim_promo', data: { tanggal_cetak: [] }, match: { id_claim: c.id_claim } });
                                      }} className="text-[10px] text-red-400 hover:underline text-left mt-0.5">Reset</button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {c.catatan_mkt && (
                              <div className="col-span-2">
                                <span className="text-gray-400 font-semibold uppercase tracking-wide">Catatan MKT</span>
                                <p className="mt-0.5 bg-blue-50 border border-blue-100 rounded px-2 py-1 text-blue-900">{c.catatan_mkt}</p>
                              </div>
                            )}
                            {(c.link_nota_pembelian || c.link_kartu_garansi) && (
                              <div className="flex gap-3 items-start col-span-2">
                                {c.link_nota_pembelian && (
                                  <button type="button" onClick={() => openImageViewer(c.link_nota_pembelian as string)} className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
                                    {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) ? '🔗📂' : '🔗'} Lihat Nota
                                    {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">(Drive)</span>}
                                  </button>
                                )}
                                {c.link_kartu_garansi && (
                                  <button type="button" onClick={() => openImageViewer(c.link_kartu_garansi as string)} className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
                                    {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) ? '🔗📂' : '🔗'} Lihat Garansi
                                    {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">(Drive)</span>}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClaims.map((c: ClaimPromo) => {
            const isDuplicate = c.id_claim ? duplicateClaimIds.has(c.id_claim) : false;
            return (
              <div key={c.id_claim} className={`bg-white p-4 rounded-lg shadow-sm border flex flex-col hover:border-[#FFE500] transition ${isDuplicate ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>
                <div className="border-b border-gray-100 pb-3 mb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-gray-600 bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center text-center">{claimNumberMap.get(c.id_claim!)}</span>
                      <div>
                        <h3 className="font-bold text-base text-slate-800">
                          {consumers[c.nomor_wa] || c.nomor_wa}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                          {c.nomor_seri}
                          {isDuplicate && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap animate-pulse">⚠️ DUPLIKAT</span>}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold shadow-sm ${getBadgeStyle(getClaimStatusColor(c))}`}>
                      {getBadgeLabel(getClaimStatusColor(c))}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-xs flex-1">
                  <p><span className="font-bold w-20 inline-block">Barang:</span> {c.tipe_barang}</p>
                  <p><span className="font-bold w-20 inline-block">Tgl Beli:</span> {formatTglBeli(c.tanggal_pembelian)}</p>
                  <p><span className="font-bold w-20 inline-block">Tgl Submit:</span> {formatSubmitDate(c.created_at)}</p>
                  <p><span className="font-bold w-20 inline-block">Durasi:</span> {getClaimDurationDays(c.created_at)}</p>
                  <p><span className="font-bold w-20 inline-block">Toko:</span> {c.nama_toko || '-'}</p>
                  <p><span className="font-bold w-20 inline-block">MKT/FA:</span> {c.validasi_by_mkt} / {c.validasi_by_fa}</p>
                  {c.catatan_mkt && <p className="bg-blue-50 border border-blue-100 rounded p-2"><span className="font-bold">Catatan MKT:</span> {c.catatan_mkt}</p>}
                  <div className="flex flex-col gap-1 pt-1">
                    {c.link_nota_pembelian && <button type="button" onClick={() => openImageViewer(c.link_nota_pembelian as string)} className="hover:underline hover:text-blue-800 text-left font-bold flex items-center gap-1">
                      {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) ? '🔗📂' : '🔗'} Lihat Nota {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded whitespace-nowrap">(Drive)</span>}
                    </button>}
                    {c.link_kartu_garansi && <button type="button" onClick={() => openImageViewer(c.link_kartu_garansi as string)} className="hover:underline hover:text-blue-800 text-left font-bold flex items-center gap-1">
                      {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) ? '🔗📂' : '🔗'} Lihat Garansi {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded whitespace-nowrap">(Drive)</span>}
                    </button>}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end flex-wrap">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handlePrintLabelPengiriman(c, claimNumberMap.get(c.id_claim!))} className="text-blue-600 text-xs font-bold hover:underline">🏷️ Print Label</button>
                    <div className="flex flex-col gap-0.5">
                      {(c.tanggal_cetak?.length ?? 0) === 0 ? (
                        <span className="text-[10px] text-gray-400 italic">Belum dicetak</span>
                      ) : (
                        <>
                          {c.tanggal_cetak!.map((d, i) => (
                            <span key={i} className="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded">✓ {d}</span>
                          ))}
                          {currentUser?.role === 'Super Admin' && (
                            <button onClick={async () => {
                              if (!c.id_claim) return;
                              setClaims(prev => prev.map(cl => cl.id_claim === c.id_claim ? { ...cl, tanggal_cetak: [] } : cl));
                              await sbWrite({ action: 'update', table: 'claim_promo', data: { tanggal_cetak: [] }, match: { id_claim: c.id_claim } });
                            }} className="text-[10px] text-red-400 hover:underline text-left">Reset</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => {
                    const consumerObj = consumersList.find(k => k.nomor_wa === c.nomor_wa);
                    if (consumerObj) {
                      setReturnTab('claims');
                      setActiveTab('konsumen');
                      openModal('edit', 'konsumen', consumerObj);
                    } else {
                      alert('Data konsumen tidak ditemukan di database.');
                    }
                  }} className="text-orange-600 text-xs font-bold hover:underline">Edit Alamat</button>
                  <button onClick={() => handleKirimStatusClaim(c)} className="text-emerald-600 text-xs font-bold hover:underline">Kirim Status</button>
                  {getClaimStatusColor(c) === 'Pink' && (
                    <button onClick={() => { setResiModal(c); setResiModalForm({ nama_jasa_pengiriman: c.nama_jasa_pengiriman || '', nomor_resi: c.nomor_resi || '' }); }} className="text-pink-600 text-xs font-bold hover:underline">📦 Isi Resi</button>
                  )}
                  <button onClick={() => openModal('edit', 'claim', c)} className="text-black text-xs font-bold hover:underline">Edit</button>
                  <button onClick={() => handleDelete('claim', c.id_claim!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
