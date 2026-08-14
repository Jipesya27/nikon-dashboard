'use client';

import React from 'react';
import { Promosi, Karyawan } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash } from '@/app/components/GradientActionBtn';
import { SortConfig, handleSort } from '@/app/lib/uiHelpers';

export interface PromosTabProps {
  sortedPromos: Promosi[];
  searchPromo: string;
  setSearchPromo: (v: string) => void;
  viewMode: 'table' | 'card';
  sortConfigPromos: SortConfig;
  setSortConfigPromos: React.Dispatch<React.SetStateAction<SortConfig>>;
  currentUser: Karyawan | null;
  openModal: (action: 'create' | 'edit', type: 'promo', item?: Promosi) => void;
  handleDelete: (type: 'promo', id: string) => unknown;
}

export default function PromosTab({
  sortedPromos,
  searchPromo,
  setSearchPromo,
  viewMode,
  sortConfigPromos,
  setSortConfigPromos,
  currentUser,
  openModal,
  handleDelete,
}: PromosTabProps) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      <input type="text" title="Cari Promo" aria-label="Cari Promo" placeholder="🔍 Cari Nama Promo atau Periode Tanggal..." value={searchPromo} onChange={e => setSearchPromo(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPromos.map((p: Promosi) => (
            <div key={p.id_promo} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{p.nama_promo}</h3>
                  <div className="text-sm font-bold text-gray-500 mt-1">📅 {p.tanggal_mulai} s/d {p.tanggal_selesai}</div>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-extrabold tracking-wide ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-700 text-sm mb-2">Tipe Produk Berlaku ({p.tipe_produk?.length || 0})</h4>
                {(!p.tipe_produk || p.tipe_produk.length === 0) ? (
                  <p className="text-xs font-bold text-gray-400 italic">Belum ada produk</p>
                ) : (
                  <div className="space-y-2 max-h-37.5 overflow-y-auto pr-2">
                    {p.tipe_produk.map((prod, idx) => (
                      <div key={idx} className="text-xs p-2 bg-gray-50 border border-gray-100 rounded-md font-bold text-gray-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-md bg-blue-500 block"></span>{prod.nama_produk}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                <GradientActionBtn onClick={() => openModal('edit', 'promo', p)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                {isAdmin && (
                  <GradientActionBtn onClick={() => handleDelete('promo', p.id_promo!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm whitespace-normal wrap-break-word">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'nama_promo')}>Nama Promo {sortConfigPromos.column === 'nama_promo' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'tanggal_mulai')}>Periode {sortConfigPromos.column === 'tanggal_mulai' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'status_aktif')}>Status {sortConfigPromos.column === 'status_aktif' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-4 py-3 text-left font-bold">Produk Berlaku</th>
                <th className="px-4 py-3 text-left font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedPromos.map((p: Promosi) => (
                <tr key={p.id_promo} className="hover:bg-gray-50 font-medium">
                  <td className="px-4 py-3 font-bold">{p.nama_promo}</td>
                  <td className="px-4 py-3">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-extrabold tracking-wide ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span></td>
                  <td className="px-4 py-3 text-xs whitespace-normal">{(p.tipe_produk || []).map(tp => tp.nama_produk).join(', ')}</td>
                  <td className="px-4 py-3"><div className="flex gap-1.5 items-center"><GradientActionBtn onClick={() => openModal('edit', 'promo', p)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />{isAdmin && <GradientActionBtn onClick={() => handleDelete('promo', p.id_promo!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
