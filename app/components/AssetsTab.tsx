'use client';

import React from 'react';
import { BarangAset, Karyawan } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash } from '@/app/components/GradientActionBtn';

export interface AssetsTabProps {
  assets: BarangAset[];
  currentUser: Karyawan | null;
  searchAssets: string;
  setSearchAssets: (v: string) => void;
  viewMode: 'table' | 'card';
  setViewMode: (v: 'table' | 'card') => void;
  // Prop signatures dijaga tetap sinkron dengan versi lebar di dashboard/page.tsx —
  // kalau parent-nya berubah, TS akan langsung teriak di call-site (bukan di sini).
  openModal: (action: 'create' | 'edit', type: 'asset', item?: BarangAset) => void;
  handleDelete: (type: 'asset', id: string) => unknown;
}

export default function AssetsTab({
  assets,
  currentUser,
  searchAssets,
  setSearchAssets,
  viewMode,
  setViewMode,
  openModal,
  handleDelete,
}: AssetsTabProps) {
  const filteredAssets = assets.filter(a =>
    a.nama_barang_aset?.toLowerCase().includes(searchAssets.toLowerCase()) ||
    a.no_seri_aset?.toLowerCase().includes(searchAssets.toLowerCase()) ||
    a.catatan?.toLowerCase().includes(searchAssets.toLowerCase())
  );

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <input type="text" placeholder="🔍 Cari Nama Barang / No Seri / Catatan..." value={searchAssets} onChange={e => setSearchAssets(e.target.value)} className="flex-1 p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
        <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{filteredAssets.length} barang</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>☰ Tabel</button>
          <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>🪪 Kartu</button>
        </div>
        <button onClick={() => openModal('create', 'asset')} className="btn-primary whitespace-nowrap">+ Tambah Aset</button>
      </div>
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-center font-bold w-12">No</th>
                <th className="px-4 py-3 text-left font-bold">Nama Barang</th>
                <th className="px-4 py-3 text-left font-bold">No. Seri</th>
                <th className="px-4 py-3 text-left font-bold">Accessories</th>
                <th className="px-4 py-3 text-left font-bold">Catatan</th>
                <th className="px-4 py-3 text-left font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.map((a, idx) => {
                const accs = [a.accs1, a.accs2, a.accs3, a.accs4, a.accs5, a.accs6, a.accs7].filter(Boolean);
                return (
                  <tr key={a.id || idx} className="hover:bg-gray-50 font-medium">
                    <td className="px-4 py-3 text-center text-gray-500 font-bold">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{a.nama_barang_aset}</td>
                    <td className="px-4 py-3 font-mono text-sm">{a.no_seri_aset || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{accs.length > 0 ? accs.join(', ') : '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{a.catatan || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <GradientActionBtn onClick={() => openModal('edit', 'asset', a)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                        {isAdmin && (
                          <GradientActionBtn onClick={() => handleDelete('asset', a.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAssets.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada data aset.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.length === 0 && <div className="col-span-3 text-center py-16 text-gray-400">Tidak ada data aset.</div>}
          {filteredAssets.map((a, idx) => {
            const accs = [a.accs1, a.accs2, a.accs3, a.accs4, a.accs5, a.accs6, a.accs7].filter(Boolean);
            return (
              <div key={a.id || idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2 hover:border-[#FFE500] hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{a.nama_barang_aset}</p>
                    {a.no_seri_aset && <p className="font-mono text-xs text-gray-500 mt-0.5">SN: {a.no_seri_aset}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">#{idx + 1}</span>
                </div>
                {accs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {accs.map((ac, ai) => <span key={ai} className="text-[10px] bg-yellow-50 border border-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-semibold">{ac}</span>)}
                  </div>
                )}
                {a.catatan && <p className="text-xs text-gray-500 italic">{a.catatan}</p>}
                <div className="mt-auto pt-2 border-t border-gray-100 flex gap-1.5">
                  <GradientActionBtn onClick={() => openModal('edit', 'asset', a)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                  {isAdmin && (
                    <GradientActionBtn onClick={() => handleDelete('asset', a.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
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
