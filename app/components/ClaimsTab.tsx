'use client';
import React from 'react';
import { ClaimPromo, KonsumenData, Karyawan } from '@/app/index';
import { GradientActionBtn, IconLabel, IconPin, IconSend, IconBox, IconCheck, IconEdit, IconTrash } from '@/app/components/GradientActionBtn';
import { GlassButton } from '@/app/components/GlassButton';

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
  openValidasiModal: (c: ClaimPromo) => void;
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
  openValidasiModal,
}: ClaimsTabProps) {
  const [expandedClaimIds, setExpandedClaimIds] = React.useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedClaimIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollTable = (dir: 'left' | 'right') => { tableScrollRef.current?.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' }); };
  const [tableVisible, setTableVisible] = React.useState(true);
  const handleFilterChange = (key: string) => {
    setTableVisible(false);
    setTimeout(() => { setFilterStatusWarna(key); setTableVisible(true); }, 180);
  };

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
          <div className="flex items-center gap-1">
            <GlassButton size="xs" active={viewMode === 'table'} onClick={() => setViewMode('table')}>Baris</GlassButton>
            <GlassButton size="xs" active={viewMode === 'card'} onClick={() => setViewMode('card')}>Kartu</GlassButton>
          </div>
          <GlassButton size="xs" onClick={handleExportCSVClaim} contentClassName="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export
          </GlassButton>
          <GlassButton size="xs" onClick={handleTandaTerimaCSV}>Tanda Terima</GlassButton>
          <GlassButton size="xs" onClick={() => resiCsvInputRef.current?.click()}>Upload Resi</GlassButton>
          <input ref={resiCsvInputRef} type="file" accept=".csv" className="hidden" onChange={handleUploadResiCSV} />
          <GlassButton size="xs" onClick={() => openModal('create', 'claim')} className="glass-button-yellow">+ Tambah</GlassButton>
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
            { key: 'Semua',  label: 'Semua',         count: claims.length,                  from: '#374151', to: '#111827' },
            { key: 'Putih',  label: 'Belum Di Cek',  count: claimStatusCounts.Putih ?? 0,   from: '#9CA3AF', to: '#6B7280' },
            { key: 'Merah',  label: 'Tidak Valid',   count: claimStatusCounts.Merah ?? 0,   from: '#EF4444', to: '#DC2626' },
            { key: 'Orange', label: 'Hold',           count: claimStatusCounts.Orange ?? 0,  from: '#F97316', to: '#EA580C' },
            { key: 'Biru',   label: 'Tunggu FA',      count: claimStatusCounts.Biru ?? 0,    from: '#3B82F6', to: '#2563EB' },
            { key: 'Pink',   label: 'Tunggu Resi',    count: claimStatusCounts.Pink ?? 0,    from: '#F43F5E', to: '#E11D48' },
            { key: 'Hijau',  label: 'Selesai',        count: claimStatusCounts.Hijau ?? 0,   from: '#10B981', to: '#059669' },
            { key: 'Teal',   label: 'Resi Terkirim',  count: claimStatusCounts.Teal ?? 0,    from: '#14B8A6', to: '#0D9488' },
          ].map(p => (
            <GlassButton
              key={p.key}
              size="xs"
              active={filterStatusWarna === p.key}
              activeFrom={p.from}
              activeTo={p.to}
              onClick={() => handleFilterChange(filterStatusWarna === p.key ? 'Semua' : p.key)}
              contentClassName="flex items-center gap-1"
            >
              {p.label} <span className="font-bold">{p.count}</span>
            </GlassButton>
          ))}
        </div>
      </div>
      <div style={{ opacity: tableVisible ? 1 : 0, transform: tableVisible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
      {viewMode === 'table' ? (
        <div className="relative">
          <button onClick={() => scrollTable('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:shadow-lg transition -translate-x-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => scrollTable('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:shadow-lg transition translate-x-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        <div ref={tableScrollRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-center w-8">
                  <input type="checkbox" title="Pilih Semua" aria-label="Pilih Semua" className="w-4 h-4 cursor-pointer"
                    checked={sortedClaims.length > 0 && sortedClaims.every((c: ClaimPromo) => c.id_claim && selectedClaimIds.has(c.id_claim))}
                    onChange={e => { const next = new Set(selectedClaimIds); sortedClaims.forEach((c: ClaimPromo) => { if (c.id_claim) { e.target.checked ? next.add(c.id_claim) : next.delete(c.id_claim); } }); setSelectedClaimIds(next); }} />
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">No</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'nama_konsumen')}>
                  Nama {sortConfigClaims.column === 'nama_konsumen' && <span>{sortConfigClaims.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'nomor_seri')}>
                  No Seri {sortConfigClaims.column === 'nomor_seri' && <span>{sortConfigClaims.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Barang</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'jenis_promosi')}>
                  Promo {sortConfigClaims.column === 'jenis_promosi' && <span>{sortConfigClaims.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 whitespace-nowrap" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'tanggal_pembelian')}>
                  Tgl Beli {sortConfigClaims.column === 'tanggal_pembelian' && <span>{sortConfigClaims.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Tgl Submit</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Durasi</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Toko</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Nota / Garansi</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">MKT / FA</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Catatan MKT</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Kirim Status</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Cetak Label</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedClaims.map((c: ClaimPromo) => {
                const isDuplicate = c.id_claim ? duplicateClaimIds.has(c.id_claim) : false;
                const isSelected = c.id_claim ? selectedClaimIds.has(c.id_claim) : false;
                const statusColor = getClaimStatusColor(c);
                const borderColorMap: Record<string, string> = {
                  Putih:  'border-l-gray-300',
                  Merah:  'border-l-red-500',
                  Orange: 'border-l-orange-400',
                  Biru:   'border-l-blue-500',
                  Pink:   'border-l-pink-400',
                  Hijau:  'border-l-green-500',
                  Teal:   'border-l-teal-500',
                };
                return (
                  <tr key={c.id_claim} className={`border-l-4 ${borderColorMap[statusColor] || 'border-l-gray-200'} hover:bg-gray-50 transition-colors ${isDuplicate ? 'bg-red-50' : ''} ${isSelected ? '!bg-yellow-50' : ''}`}>
                    <td className="px-3 py-2.5 text-center">
                      <input type="checkbox" title="Pilih baris ini" aria-label="Pilih baris ini" className="w-4 h-4 cursor-pointer"
                        checked={isSelected}
                        onChange={e => { if (c.id_claim) { const next = new Set(selectedClaimIds); e.target.checked ? next.add(c.id_claim!) : next.delete(c.id_claim!); setSelectedClaimIds(next); } }} />
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-500 text-xs">{claimNumberMap.get(c.id_claim!)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-extrabold inline-block whitespace-nowrap ${getBadgeStyle(statusColor)}`}>
                        {getBadgeLabel(statusColor)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-slate-800 text-sm leading-tight">{c.nama_pendaftar || c.nomor_wa}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.nomor_wa}
                        {isDuplicate && <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1 py-0.5 rounded font-bold animate-pulse">⚠️ DUPLIKAT</span>}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{c.nomor_seri || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700">{c.tipe_barang || '-'}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-black">{c.jenis_promosi || getNamaPromo(c.tipe_barang) || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{formatTglBeli(c.tanggal_pembelian)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{formatSubmitDate(c.created_at)}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-700">{getClaimDurationDays(c.created_at)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700">{c.nama_toko || '-'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1 items-start">
                        {c.link_nota_pembelian ? (
                          <button type="button" onClick={() => openImageViewer(c.link_nota_pembelian as string)} className="text-blue-600 hover:underline text-[11px] font-bold text-left flex items-center gap-1">
                            📄 Nota {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded">Drive</span>}
                          </button>
                        ) : <span className="text-[11px] text-gray-400 italic">-Nota</span>}
                        {c.link_kartu_garansi ? (
                          <button type="button" onClick={() => openImageViewer(c.link_kartu_garansi as string)} className="text-blue-600 hover:underline text-[11px] font-bold text-left flex items-center gap-1">
                            🛡️ Garansi {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded">Drive</span>}
                          </button>
                        ) : <span className="text-[11px] text-gray-400 italic">-Garansi</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px]">
                      <div className="text-gray-700 font-medium">MKT: {c.validasi_by_mkt || '-'}</div>
                      <div className="text-gray-700 font-medium">FA: {c.validasi_by_fa || '-'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-600 max-w-[140px]">{c.catatan_mkt || '-'}</td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-600 whitespace-nowrap">
                      {c.resi_sent_at ? (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="text-teal-700 font-bold">✅ Terkirim</span>
                          <span className="text-gray-500">{new Date(c.resi_sent_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'Asia/Jakarta' })}</span>
                          <span className="text-gray-500">{new Date(c.resi_sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</span>
                        </span>
                      ) : <span className="text-gray-400 italic">Belum</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {(c.tanggal_cetak?.length ?? 0) === 0 ? (
                        <span className="text-[11px] text-gray-400 italic">Belum dicetak</span>
                      ) : (
                        <div className="flex flex-col gap-0.5 items-start">
                          {c.tanggal_cetak!.map((d, i) => (
                            <span key={i} className="inline-block bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">✓ {d}</span>
                          ))}
                          {currentUser?.role === 'Super Admin' && (
                            <button onClick={async () => {
                              if (!c.id_claim) return;
                              setClaims(prev => prev.map(cl => cl.id_claim === c.id_claim ? { ...cl, tanggal_cetak: [] } : cl));
                              await sbWrite({ action: 'update', table: 'claim_promo', data: { tanggal_cetak: [] }, match: { id_claim: c.id_claim } });
                            }} className="text-[10px] text-red-400 hover:text-red-600 hover:underline text-left mt-0.5">Reset</button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5 items-center">
                          <GradientActionBtn onClick={() => handlePrintLabelPengiriman(c, claimNumberMap.get(c.id_claim!))} label="Label" gradientFrom="#3B82F6" gradientTo="#06B6D4"
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" /></svg>} />
                          <GradientActionBtn onClick={() => { const obj = consumersList.find(k => k.nomor_wa === c.nomor_wa); if (obj) { setReturnTab('claims'); setActiveTab('konsumen'); openModal('edit', 'konsumen', obj); } else alert('Data konsumen tidak ditemukan.'); }} label="Alamat" gradientFrom="#F97316" gradientTo="#FBBF24"
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                          <GradientActionBtn onClick={() => handleKirimStatusClaim(c)} label="Status" gradientFrom="#10B981" gradientTo="#34D399"
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>} />
                          {statusColor === 'Pink' && (
                            <GradientActionBtn onClick={() => { setResiModal(c); setResiModalForm({ nama_jasa_pengiriman: c.nama_jasa_pengiriman || '', nomor_resi: c.nomor_resi || '' }); }} label="Resi" gradientFrom="#EC4899" gradientTo="#F472B6"
                              icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
                          )}
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <GradientActionBtn onClick={() => openValidasiModal(c)} label="Validasi" gradientFrom="#6366F1" gradientTo="#8B5CF6"
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                          <GradientActionBtn onClick={() => openModal('edit', 'claim', c)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8"
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} />
                          <GradientActionBtn onClick={() => handleDelete('claim', c.id_claim!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171"
                            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
                          {c.nama_pendaftar || c.nomor_wa}
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
                  <button onClick={() => openValidasiModal(c)} className="text-indigo-600 text-xs font-bold hover:underline">✓ Validasi</button>
                  <button onClick={() => openModal('edit', 'claim', c)} className="text-black text-xs font-bold hover:underline">Edit</button>
                  <button onClick={() => handleDelete('claim', c.id_claim!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
