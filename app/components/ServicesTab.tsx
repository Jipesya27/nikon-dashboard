'use client';

import React from 'react';
import { StatusService, Karyawan } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash } from '@/app/components/GradientActionBtn';
import { SortConfig, handleSort } from '@/app/lib/uiHelpers';

export interface ServicesTabProps {
  sortedServices: StatusService[];
  searchService: string;
  setSearchService: (v: string) => void;
  viewMode: 'table' | 'card';
  sortConfigServices: SortConfig;
  setSortConfigServices: React.Dispatch<React.SetStateAction<SortConfig>>;
  currentUser: Karyawan | null;
  openModal: (action: 'create' | 'edit', type: 'service', item?: StatusService) => void;
  handleDelete: (type: 'service', id: string) => unknown;
}

export default function ServicesTab({
  sortedServices,
  searchService,
  setSearchService,
  viewMode,
  sortConfigServices,
  setSortConfigServices,
  currentUser,
  openModal,
  handleDelete,
}: ServicesTabProps) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      <input type="text" title="Cari Service" aria-label="Cari Service" placeholder="🔍 Cari No Tanda Terima / No Seri / Status..." value={searchService} onChange={e => setSearchService(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm whitespace-normal wrap-break-word">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'nomor_tanda_terima')}>No Tanda Terima {sortConfigServices.column === 'nomor_tanda_terima' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'nomor_seri')}>No Seri Barang {sortConfigServices.column === 'nomor_seri' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'status_service')}>Status Service {sortConfigServices.column === 'status_service' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'created_at')}>Tgl Update {sortConfigServices.column === 'created_at' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedServices.map((s: StatusService) => (
                <tr key={s.id_service} className="hover:bg-gray-50 font-medium">
                  <td className="px-3 py-2.5font-mono font-bold text-slate-800">{s.nomor_tanda_terima}</td>
                  <td className="px-6 py-3">{s.nomor_seri}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded text-[10px] tracking-wide font-extrabold bg-blue-100 text-blue-800 uppercase">{s.status_service}</span>
                  </td>
                  <td className="px-3 py-2.5font-bold text-gray-500">{s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <GradientActionBtn onClick={() => openModal('edit', 'service', s)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                      {isAdmin && (
                        <GradientActionBtn onClick={() => handleDelete('service', s.id_service!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedServices.map((s: StatusService) => (
            <div key={s.id_service} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
              <div className="border-b border-gray-100 pb-3 mb-3">
                <h3 className="font-bold text-base text-slate-800 font-mono">{s.nomor_tanda_terima}</h3>
                <p className="text-xs text-gray-500">{s.nomor_seri}</p>
              </div>
              <div className="space-y-2 text-xs flex-1">
                <p><span className="font-bold w-20 inline-block">Status:</span> <span className="px-2 py-0.5 rounded text-[10px] tracking-wide font-extrabold bg-blue-100 text-blue-800 uppercase">{s.status_service}</span></p>
                <p><span className="font-bold w-20 inline-block">Update:</span> {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                <GradientActionBtn onClick={() => openModal('edit', 'service', s)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                {isAdmin && (
                  <GradientActionBtn onClick={() => handleDelete('service', s.id_service!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
