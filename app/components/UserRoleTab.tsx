'use client';

import React from 'react';
import { Karyawan } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash, IconKey } from '@/app/components/GradientActionBtn';
import { SortConfig, handleSort } from '@/app/lib/uiHelpers';

export interface UserRoleTabProps {
  sortedKaryawans: Karyawan[];
  searchKaryawan: string;
  setSearchKaryawan: (v: string) => void;
  viewMode: 'table' | 'card';
  sortConfigKaryawans: SortConfig;
  setSortConfigKaryawans: React.Dispatch<React.SetStateAction<SortConfig>>;
  currentUser: Karyawan | null;
  resetPwLoadingId: string | null;
  handleQuickResetPassword: (k: Karyawan) => Promise<void> | void;
  openModal: (action: 'create' | 'edit', type: 'karyawan', item?: Karyawan) => void;
  handleDelete: (type: 'karyawan', id: string) => unknown;
}

export default function UserRoleTab({
  sortedKaryawans,
  searchKaryawan,
  setSearchKaryawan,
  viewMode,
  sortConfigKaryawans,
  setSortConfigKaryawans,
  currentUser,
  resetPwLoadingId,
  handleQuickResetPassword,
  openModal,
  handleDelete,
}: UserRoleTabProps) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      <input type="text" title="Cari Karyawan" aria-label="Cari Karyawan" placeholder="🔍 Cari Username atau Nama Karyawan..." value={searchKaryawan} onChange={e => setSearchKaryawan(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm whitespace-normal wrap-break-word">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'username')}>Username {sortConfigKaryawans.column === 'username' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'nama_karyawan')}>Nama Karyawan {sortConfigKaryawans.column === 'nama_karyawan' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'role')}>Role {sortConfigKaryawans.column === 'role' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'status_aktif')}>Status {sortConfigKaryawans.column === 'status_aktif' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Akses Halaman</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedKaryawans.map((k: Karyawan) => (
                <tr key={k.id_karyawan} className="hover:bg-gray-50 font-medium">
                  <td className="px-3 py-2.5font-bold text-slate-800">{k.username}</td>
                  <td className="px-6 py-3">{k.nama_karyawan}</td>
                  <td className="px-3 py-2.5font-bold text-black">{k.role}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${k.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{k.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
                  </td>
                  <td className="px-3 py-2.5font-mono text-xs text-gray-600">{(k.role === 'Admin' || k.role === 'Super Admin') ? 'Semua Akses' : (k.akses_halaman || []).join(', ')}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <GradientActionBtn onClick={() => openModal('edit', 'karyawan', k)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                      {isAdmin && (
                        <GradientActionBtn
                          onClick={() => handleQuickResetPassword(k)}
                          label="Reset PW"
                          gradientFrom="#F59E0B"
                          gradientTo="#FBBF24"
                          icon={IconKey}
                          disabled={resetPwLoadingId === String(k.id_karyawan)}
                        />
                      )}
                      <GradientActionBtn onClick={() => handleDelete('karyawan', k.id_karyawan!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedKaryawans.map((k: Karyawan) => (
            <div key={k.id_karyawan} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
              <div className="border-b border-gray-100 pb-3 mb-3">
                <h3 className="font-bold text-base text-slate-800">{k.nama_karyawan}</h3>
                <p className="text-xs text-gray-500">{k.username}</p>
              </div>
              <div className="space-y-2 text-xs flex-1">
                <p><span className="font-bold w-20 inline-block">Role:</span> {k.role}</p>
                <p><span className="font-bold w-20 inline-block">Status:</span> <span className={`px-2 py-0.5 rounded text-[10px] tracking-wide font-extrabold ${k.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{k.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span></p>
                <p><span className="font-bold w-20 inline-block">Akses:</span> {(k.role === 'Admin' || k.role === 'Super Admin') ? 'Semua Akses' : (k.akses_halaman || []).join(', ')}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                <GradientActionBtn onClick={() => openModal('edit', 'karyawan', k)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                {isAdmin && (
                  <GradientActionBtn
                    onClick={() => handleQuickResetPassword(k)}
                    label="Reset PW"
                    gradientFrom="#F59E0B"
                    gradientTo="#FBBF24"
                    icon={IconKey}
                    disabled={resetPwLoadingId === String(k.id_karyawan)}
                  />
                )}
                <GradientActionBtn onClick={() => handleDelete('karyawan', k.id_karyawan!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
