'use client';

import React from 'react';
import { KonsumenData, ClaimPromo, Karyawan } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash } from '@/app/components/GradientActionBtn';
import { SortConfig, handleSort } from '@/app/lib/uiHelpers';

const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];

function initials(name: string): string {
  return (name || '?').split(/\s+/).map(w => w[0] || '').filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function colorFor(s: string): string {
  return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length] || 'bg-gray-500';
}

export interface KonsumenTabProps {
  consumersList: KonsumenData[];
  sortedConsumers: KonsumenData[];
  claims: ClaimPromo[];
  searchKonsumen: string;
  setSearchKonsumen: (v: string) => void;
  viewMode: 'table' | 'card';
  setViewMode: (v: 'table' | 'card') => void;
  sortConfigKonsumen: SortConfig;
  setSortConfigKonsumen: React.Dispatch<React.SetStateAction<SortConfig>>;
  konsumenNumberMap: Map<string, number>;
  setViewingKonsumen: (k: KonsumenData) => void;
  currentUser: Karyawan | null;
  openModal: (action: 'create' | 'edit', type: 'konsumen' | 'claim', item?: KonsumenData) => void;
  handleDelete: (type: 'konsumen', id: string) => unknown;
}

export default function KonsumenTab({
  consumersList,
  sortedConsumers,
  claims,
  searchKonsumen,
  setSearchKonsumen,
  viewMode,
  setViewMode,
  sortConfigKonsumen,
  setSortConfigKonsumen,
  konsumenNumberMap,
  setViewingKonsumen,
  currentUser,
  openModal,
  handleDelete,
}: KonsumenTabProps) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  const totalKonsumen = consumersList.length;
  const konsumenWithClaim = consumersList.filter(k => claims.some(c => c.nomor_wa === k.nomor_wa)).length;
  const konsumenLengkap = consumersList.filter(k => k.nik && k.nik !== 'BELUM_DIISI' && k.alamat_rumah && k.alamat_rumah !== 'BELUM_DIISI').length;

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">Total Konsumen</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalKonsumen}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">Punya Claim</p>
          <p className="text-2xl font-black text-green-700 mt-1">{konsumenWithClaim}</p>
          <p className="text-[10px] text-gray-700 font-medium">{totalKonsumen ? Math.round(konsumenWithClaim / totalKonsumen * 100) : 0}% dari total</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">Data Lengkap</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{konsumenLengkap}</p>
          <p className="text-[10px] text-gray-700 font-medium">NIK + Alamat terisi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">Total Claim</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{claims.length}</p>
        </div>
      </div>

      {/* Toolbar: search + view toggle + actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-50">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            title="Cari Konsumen"
            aria-label="Cari Konsumen"
            placeholder="Cari Nama, No. WA, ID Konsumen, atau NIK..."
            value={searchKonsumen}
            onChange={e => setSearchKonsumen(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-2 focus:ring-[#FFE500]/40 text-sm font-medium"
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>📋 Tabel</button>
          <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>🪪 Kartu</button>
        </div>
        <button onClick={() => openModal('create', 'konsumen')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2.5 rounded-lg font-bold text-sm transition shadow-sm whitespace-nowrap">+ Tambah Konsumen</button>
        <button onClick={() => openModal('create', 'claim')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition shadow-sm whitespace-nowrap">+ Tambah Claim</button>
      </div>

      {/* Empty state */}
      {sortedConsumers.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
            {searchKonsumen ? (
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" /></svg>
            ) : (
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            )}
          </div>
          <p className="text-gray-900 font-bold mb-1">{searchKonsumen ? 'Tidak ada konsumen ditemukan' : 'Belum ada konsumen'}</p>
          <p className="text-sm text-gray-700">{searchKonsumen ? 'Coba ubah kata kunci pencarian.' : 'Klik tombol "+ Tambah Konsumen" untuk menambah konsumen baru.'}</p>
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && sortedConsumers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
          <table className="w-full text-sm whitespace-normal wrap-break-word">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKonsumen, setSortConfigKonsumen, 'nama_lengkap')}>Konsumen {sortConfigKonsumen.column === 'nama_lengkap' && (<span>{sortConfigKonsumen.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontak</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Alamat</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">NIK</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Claim</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedConsumers.map((k: KonsumenData) => {
                const userClaims = claims.filter((c: ClaimPromo) => c.nomor_wa === k.nomor_wa);
                const alamatLengkap = [k.alamat_rumah, k.kelurahan, k.kecamatan, k.kabupaten_kotamadya, k.provinsi, k.kodepos].filter(v => v && v !== 'BELUM_DIISI').join(', ');
                return (
                  <tr key={k.nomor_wa} className="hover:bg-gray-50 font-medium">
                    <td className="px-4 py-3 text-center text-xs font-bold text-gray-700">{konsumenNumberMap.get(k.nomor_wa)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-md ${colorFor(k.nama_lengkap || '?')} text-white font-bold text-sm flex items-center justify-center shrink-0`}>{initials(k.nama_lengkap || '?')}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{k.nama_lengkap || '-'}</p>
                          <p className="text-[10px] font-mono text-gray-700">{k.id_konsumen || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 font-mono text-xs">{k.nomor_wa}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800 max-w-xs">
                      {alamatLengkap || <span className="text-gray-500 italic">Belum diisi</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800 font-mono">{k.nik && k.nik !== 'BELUM_DIISI' ? k.nik : <span className="text-gray-500 italic font-sans">-</span>}</td>
                    <td className="px-4 py-3">
                      {userClaims.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-xs font-bold">
                          {userClaims.length} claim
                        </span>
                      ) : (
                        <span className="text-gray-500 italic text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <button onClick={() => setViewingKonsumen(k)} className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">👁 View</button>
                        <GradientActionBtn onClick={() => openModal('edit', 'konsumen', k)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                        {isAdmin && (
                          <GradientActionBtn onClick={() => handleDelete('konsumen', k.nomor_wa)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CARD VIEW */}
      {viewMode === 'card' && sortedConsumers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedConsumers.map((k: KonsumenData) => {
            const userClaims = claims.filter((c: ClaimPromo) => c.nomor_wa === k.nomor_wa);
            const alamatLengkap = [k.alamat_rumah, k.kelurahan, k.kecamatan, k.kabupaten_kotamadya, k.provinsi, k.kodepos].filter(v => v && v !== 'BELUM_DIISI').join(', ');
            return (
              <div key={k.nomor_wa} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className={`${colorFor(k.nama_lengkap || '?')} p-4 text-white`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-white/30 backdrop-blur text-white font-bold flex items-center justify-center text-lg shrink-0">{initials(k.nama_lengkap || '?')}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-base truncate">{k.nama_lengkap || '-'}</p>
                      <p className="text-[11px] font-mono opacity-90">{k.id_konsumen || '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600">WhatsApp</p>
                    <p className="font-mono text-gray-900">{k.nomor_wa}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600">NIK</p>
                    <p className="font-mono text-gray-900">{k.nik && k.nik !== 'BELUM_DIISI' ? k.nik : <span className="text-gray-500 italic font-sans">Belum diisi</span>}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Alamat</p>
                    <p className="text-gray-900 leading-snug">{alamatLengkap || <span className="text-gray-500 italic">Belum diisi</span>}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      {userClaims.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-[11px] font-bold">
                          ✓ {userClaims.length} claim
                        </span>
                      ) : (
                        <span className="text-gray-500 italic text-[11px]">Belum ada claim</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setViewingKonsumen(k)} className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">👁 View</button>
                      <GradientActionBtn onClick={() => openModal('edit', 'konsumen', k)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                      {isAdmin && (
                        <GradientActionBtn onClick={() => handleDelete('konsumen', k.nomor_wa)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
