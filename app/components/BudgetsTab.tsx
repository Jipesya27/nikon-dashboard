'use client';

import React from 'react';
import { BudgetApproval, Karyawan } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash, IconPrint } from '@/app/components/GradientActionBtn';
import { SortConfig, handleSort, driveImgSrc } from '@/app/lib/uiHelpers';

export interface BudgetsTabProps {
  budgets: BudgetApproval[];
  sortedBudgets: BudgetApproval[];
  searchBudget: string;
  setSearchBudget: (v: string) => void;
  viewMode: 'table' | 'card';
  sortConfigBudgets: SortConfig;
  setSortConfigBudgets: React.Dispatch<React.SetStateAction<SortConfig>>;
  currentUser: Karyawan | null;
  openModal: (action: 'create' | 'edit', type: 'budget', item?: BudgetApproval) => void;
  handleDelete: (type: 'budget', id: string) => unknown;
  setPrintData: (b: BudgetApproval) => void;
}

export default function BudgetsTab({
  budgets,
  sortedBudgets,
  searchBudget,
  setSearchBudget,
  viewMode,
  sortConfigBudgets,
  setSortConfigBudgets,
  currentUser,
  openModal,
  handleDelete,
  setPrintData,
}: BudgetsTabProps) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {([
          { label: 'Total Proposal', count: budgets.length, color: 'text-gray-900', bar: 'bg-gray-400' },
          { label: 'Total Anggaran', count: `Rp ${budgets.reduce((s, b) => s + Number(b.total_cost || 0), 0).toLocaleString('id-ID')}`, color: 'text-blue-700', bar: 'bg-blue-500', isText: true },
          { label: 'Rerata / Proposal', count: budgets.length ? `Rp ${Math.round(budgets.reduce((s, b) => s + Number(b.total_cost || 0), 0) / budgets.length).toLocaleString('id-ID')}` : 'Rp 0', color: 'text-amber-700', bar: 'bg-amber-400', isText: true },
        ] as { label: string; count: number | string; color: string; bar: string; isText?: boolean }[]).map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border-2 border-gray-200 shadow-sm">
            <div className={`w-full h-1 rounded-md mb-2 ${s.bar}`}></div>
            <p className={`${s.isText ? 'text-base' : 'text-2xl'} font-black ${s.color}`}>{s.count}</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <input type="text" title="Cari Proposal" aria-label="Cari Proposal" placeholder="🔍 Cari Title Proposal..." value={searchBudget} onChange={e => setSearchBudget(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'proposal_no')}>Proposal No {sortConfigBudgets.column === 'proposal_no' && <span className="text-xs">{sortConfigBudgets.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'title')}>Judul {sortConfigBudgets.column === 'title' && <span className="text-xs">{sortConfigBudgets.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'period')}>Periode {sortConfigBudgets.column === 'period' && <span className="text-xs">{sortConfigBudgets.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'total_cost')}>Total Biaya {sortConfigBudgets.column === 'total_cost' && <span className="text-xs">{sortConfigBudgets.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedBudgets.map((b: BudgetApproval) => (
                <tr key={b.id_budget} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-800 text-xs">{b.proposal_no}</td>
                  <td className="px-3 py-2.5 font-bold text-sm">{b.title}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700">{b.period}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-gray-800">Rp {Number(b.total_cost).toLocaleString('id-ID')}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        <GradientActionBtn onClick={() => openModal('edit', 'budget', b)} label="Edit" gradientFrom="#3B82F6" gradientTo="#60A5FA" icon={IconEdit} />
                        <GradientActionBtn onClick={() => setPrintData(b)} label="Print" gradientFrom="#10B981" gradientTo="#34D399" icon={IconPrint} />
                        {isAdmin && (
                          <GradientActionBtn onClick={() => handleDelete('budget', b.id_budget!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBudgets.map((b: BudgetApproval) => (
            <div key={b.id_budget} className="bg-white rounded-lg shadow-sm border-2 border-gray-100 flex flex-col hover:border-[#FFE500] transition overflow-hidden">
              {b.event_image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={driveImgSrc(b.event_image)} alt="poster" className="w-full h-32 object-cover" />
                : <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
              }
              <div className="p-4 flex flex-col flex-1">
                <div className="border-b border-gray-100 pb-3 mb-3">
                  <h3 className="font-bold text-base text-slate-800">{b.title}</h3>
                  <p className="text-xs text-gray-500 font-mono">{b.proposal_no}</p>
                </div>
                <div className="space-y-2 text-xs flex-1">
                  <p><span className="font-bold w-20 inline-block">Periode:</span> {b.period}</p>
                  <p><span className="font-bold w-20 inline-block">Total:</span> Rp {Number(b.total_cost).toLocaleString('id-ID')}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                  <GradientActionBtn onClick={() => openModal('edit', 'budget', b)} label="Edit" gradientFrom="#3B82F6" gradientTo="#60A5FA" icon={IconEdit} />
                  <GradientActionBtn onClick={() => setPrintData(b)} label="Print" gradientFrom="#10B981" gradientTo="#34D399" icon={IconPrint} />
                  {isAdmin && (
                    <GradientActionBtn onClick={() => handleDelete('budget', b.id_budget!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
