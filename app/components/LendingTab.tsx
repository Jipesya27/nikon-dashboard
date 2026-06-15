'use client';

import React from 'react';
import { PeminjamanBarang } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash, IconPrint } from '@/app/components/GradientActionBtn';

type SortDirection = 'asc' | 'desc' | null;
interface SortConfig { column: string; direction: SortDirection; }

export interface LendingTabProps {
  lendingRecords: PeminjamanBarang[];
  sortedLendingRecords: PeminjamanBarang[];
  searchLending: string;
  setSearchLending: (v: string) => void;
  viewMode: 'table' | 'card';
  setViewMode: (v: 'table' | 'card') => void;
  sortConfigLending: SortConfig;
  setSortConfigLending: React.Dispatch<React.SetStateAction<SortConfig>>;
  handleSort: (config: SortConfig, setter: React.Dispatch<React.SetStateAction<SortConfig>>, column: string) => void;
  openModal: (mode: string, type: string, data?: unknown) => void;
  openImageViewer: (urlOrFile: string | File) => void;
  handleDelete: (type: string, id: string) => void;
  handlePrintPeminjamanPDF: (l: PeminjamanBarang) => void;
  proxyImg: (url: string | null | undefined) => string | null;
}

export default function LendingTab({
  lendingRecords, sortedLendingRecords,
  searchLending, setSearchLending,
  viewMode, setViewMode,
  sortConfigLending, setSortConfigLending, handleSort,
  openModal, openImageViewer, handleDelete, handlePrintPeminjamanPDF,
  proxyImg,
}: LendingTabProps) {
  const aktif    = lendingRecords.filter(l => l.status_peminjaman === 'aktif').length;
  const partial  = lendingRecords.filter(l => l.status_peminjaman === 'partial').length;
  const selesai  = lendingRecords.filter(l => l.status_peminjaman === 'selesai').length;
  const totalBarang = lendingRecords.reduce((s, l) => s + l.items_dipinjam.length, 0);

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-2">
        {([
          { label: 'Total Peminjaman', count: lendingRecords.length, color: 'text-gray-900', bar: 'bg-gray-400' },
          { label: 'Aktif', count: aktif, color: 'text-orange-700', bar: 'bg-orange-400' },
          { label: 'Partial', count: partial, color: 'text-yellow-700', bar: 'bg-yellow-400' },
          { label: 'Selesai', count: selesai, color: 'text-green-700', bar: 'bg-green-500' },
          { label: 'Total Barang', count: totalBarang, color: 'text-blue-700', bar: 'bg-blue-500' },
        ] as { label: string; count: number; color: string; bar: string }[]).map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border-2 border-gray-200 shadow-sm">
            <div className={`w-full h-1 rounded-full mb-2 ${s.bar}`}></div>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input type="text" title="Cari Peminjaman" aria-label="Cari Peminjaman" placeholder="🔍 Cari Nama Peminjam / No WA / Nama Barang / No Seri..." value={searchLending} onChange={e => setSearchLending(e.target.value)} className="flex-1 p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>📋 Baris</button>
          <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>🪪 Kartu</button>
        </div>
        <button onClick={() => openModal('create', 'lending')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Pinjam Barang</button>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left font-bold text-gray-700 cursor-pointer hover:text-black" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'nama_peminjam')}>Peminjam {sortConfigLending.column === 'nama_peminjam' && <span className="text-xs">{sortConfigLending.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">Kode</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">KTP</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">Foto</th>
                <th className="px-3 py-3 text-left font-bold text-gray-700">Barang Dipinjam</th>
                <th className="px-3 py-3 text-left font-bold text-gray-700 cursor-pointer hover:text-black" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'tanggal_peminjaman')}>Tgl Pinjam {sortConfigLending.column === 'tanggal_peminjaman' && <span className="text-xs">{sortConfigLending.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-3 text-left font-bold text-gray-700">Est. Kembali</th>
                <th className="px-3 py-3 text-left font-bold text-gray-700 cursor-pointer hover:text-black" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'tanggal_pengembalian')}>Tgl Kembali {sortConfigLending.column === 'tanggal_pengembalian' && <span className="text-xs">{sortConfigLending.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-3 text-center font-bold text-gray-700 cursor-pointer hover:text-black" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'status_peminjaman')}>Status {sortConfigLending.column === 'status_peminjaman' && <span className="text-xs">{sortConfigLending.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">Pengiriman</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedLendingRecords.map((l: PeminjamanBarang) => (
                <tr key={l.id_peminjaman} className={`border-l-4 ${l.status_peminjaman === 'aktif' ? 'border-l-orange-400' : l.status_peminjaman === 'partial' ? 'border-l-yellow-400' : 'border-l-green-500'} hover:bg-gray-50 transition-colors`}>
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-slate-800">{l.nama_peminjam}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{l.nomor_wa_peminjam}</p>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {l.kode_peminjaman
                      ? <span className="font-mono font-black text-sm text-indigo-700 tracking-widest bg-indigo-50 px-2 py-1 rounded">{l.kode_peminjaman}</span>
                      : <span className="text-gray-300 text-[11px]">—</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {l.link_ktp_peminjam ? (
                      <button type="button" onClick={() => openImageViewer(l.link_ktp_peminjam as string)} className="text-blue-600 hover:underline text-[11px] font-bold">🪪 KTP</button>
                    ) : <span className="text-gray-400 text-[11px] italic">-</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1 items-center">
                      {Array.isArray(l.foto_penerimaan) && (l.foto_penerimaan as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {(l.foto_penerimaan as string[]).slice(0, 3).map((url, fi) => {
                            const src = proxyImg(url) || url;
                            return (
                              // eslint-disable-next-line @next/next/no-img-element
                              <button key={fi} type="button" onClick={() => openImageViewer(url)} title="Foto Penerimaan">
                                <img src={src} alt="" className="w-8 h-8 object-cover rounded border border-orange-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              </button>
                            );
                          })}
                          {(l.foto_penerimaan as string[]).length > 3 && <span className="text-[9px] text-gray-400">+{(l.foto_penerimaan as string[]).length - 3}</span>}
                        </div>
                      )}
                      {Array.isArray(l.foto_pengembalian) && (l.foto_pengembalian as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {(l.foto_pengembalian as string[]).slice(0, 3).map((url, fi) => {
                            const src = proxyImg(url) || url;
                            return (
                              // eslint-disable-next-line @next/next/no-img-element
                              <button key={fi} type="button" onClick={() => openImageViewer(url)} title="Foto Pengembalian">
                                <img src={src} alt="" className="w-8 h-8 object-cover rounded border border-green-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              </button>
                            );
                          })}
                          {(l.foto_pengembalian as string[]).length > 3 && <span className="text-[9px] text-gray-400">+{(l.foto_pengembalian as string[]).length - 3}</span>}
                        </div>
                      )}
                      {!Array.isArray(l.foto_penerimaan) && !Array.isArray(l.foto_pengembalian) && <span className="text-gray-300 text-[11px]">-</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <ul className="space-y-1.5">
                      {l.items_dipinjam.map((item, idx) => {
                        const accs = [item.accs1,item.accs2,item.accs3,item.accs4,item.accs5,item.accs6,item.accs7].filter(Boolean);
                        return (
                          <li key={idx} className={`${item.status_pengembalian === 'dikembalikan' ? 'text-green-600' : 'text-slate-800'}`}>
                            <div className={`flex items-start gap-1 ${item.status_pengembalian === 'dikembalikan' ? 'line-through' : ''}`}>
                              <span className="font-bold shrink-0">{idx + 1}.</span>
                              <span>{item.nama_barang} <span className="font-mono text-gray-500">(SN: {item.nomor_seri})</span></span>
                              {item.status_pengembalian === 'dikembalikan' && <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1 rounded font-bold shrink-0">✓</span>}
                            </div>
                            {accs.length > 0 && (
                              <div className="pl-4 mt-0.5 text-[10px] text-gray-500 space-y-0.5">
                                {accs.map((a, ai) => <div key={ai}>• {a}</div>)}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{l.tanggal_peminjaman ? new Date(l.tanggal_peminjaman).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                    {l.tanggal_estimasi_pengembalian ? (
                      <><p className="text-gray-700">{new Date(l.tanggal_estimasi_pengembalian).toLocaleDateString('id-ID')}</p>
                      {l.reminder_sent_at && <p className="text-[10px] text-green-600 font-bold">✓ Reminder terkirim</p>}</>
                    ) : <span className="text-gray-400 italic">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{l.tanggal_pengembalian ? new Date(l.tanggal_pengembalian).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-extrabold ${l.status_peminjaman === 'aktif' ? 'bg-orange-100 text-orange-800' : l.status_peminjaman === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{l.status_peminjaman.toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {(() => {
                      const sp = l.status_pengiriman || 'menunggu';
                      const cfg: Record<string, { cls: string; label: string }> = {
                        menunggu: { cls: 'bg-gray-100 text-gray-600', label: 'Menunggu' },
                        dikirim:  { cls: 'bg-blue-100 text-blue-700', label: 'Dikirim' },
                        terkirim: { cls: 'bg-green-100 text-green-700', label: 'Terkirim' },
                      };
                      const c = cfg[sp] || cfg.menunggu;
                      return <span className={`px-2 py-1 rounded text-[10px] font-bold ${c.cls}`}>{c.label}</span>;
                    })()}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1.5 min-w-[80px]">
                      <div className="flex gap-1.5">
                        {(l.status_peminjaman === 'aktif' || l.status_peminjaman === 'partial') && <GradientActionBtn onClick={() => openModal('return', 'lending', l)} label="Kembali" gradientFrom="#3B82F6" gradientTo="#06B6D4" icon={IconEdit} />}
                        <GradientActionBtn onClick={() => handlePrintPeminjamanPDF(l)} label="PDF" gradientFrom="#8B5CF6" gradientTo="#A78BFA" icon={IconPrint} />
                      </div>
                      <div className="flex gap-1.5 pt-0.5 border-t border-gray-100">
                        <GradientActionBtn onClick={() => openModal('edit', 'lending', l)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                        <GradientActionBtn onClick={() => handleDelete('lending', l.id_peminjaman!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
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
          {sortedLendingRecords.map((l: PeminjamanBarang) => (
            <div key={l.id_peminjaman} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
              <div className="border-b border-gray-100 pb-3 mb-3">
                <h3 className="font-bold text-base text-slate-800">{l.nama_peminjam}</h3>
                <p className="text-xs text-gray-500">{l.nomor_wa_peminjam}</p>
                <span className={`mt-2 inline-block px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${l.status_peminjaman === 'aktif' ? 'bg-orange-100 text-orange-800' : l.status_peminjaman === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{l.status_peminjaman.toUpperCase()}</span>
              </div>
              <div className="space-y-2 text-xs flex-1">
                <p><span className="font-bold w-24 inline-block">Tgl Pinjam:</span> {l.tanggal_peminjaman ? new Date(l.tanggal_peminjaman).toLocaleDateString('id-ID') : '-'}</p>
                <p><span className="font-bold w-24 inline-block">Tgl Kembali:</span> {l.tanggal_pengembalian ? new Date(l.tanggal_pengembalian).toLocaleDateString('id-ID') : '-'}</p>
                <div className="font-bold mt-2">Barang:</div>
                <ul className="pl-2 space-y-1.5">
                  {l.items_dipinjam.map((item, idx) => {
                    const accs = [item.accs1,item.accs2,item.accs3,item.accs4,item.accs5,item.accs6,item.accs7].filter(Boolean) as string[];
                    return (
                      <li key={idx} className={`${item.status_pengembalian === 'dikembalikan' ? 'text-green-600' : 'text-slate-800'}`}>
                        <span className={item.status_pengembalian === 'dikembalikan' ? 'line-through' : ''}>• {item.nama_barang} (SN: {item.nomor_seri})</span>
                        {accs.length > 0 && (
                          <div className="pl-3 mt-0.5 text-[10px] space-y-0.5">
                            {accs.map((a, ai) => {
                              const accsReturned = item.accs_returned ?? [];
                              const isAccReturned = item.status_pengembalian === 'dikembalikan' && (accsReturned.length === 0 || accsReturned.includes(a));
                              return (
                                <div key={ai} className={isAccReturned ? 'text-green-600 line-through' : 'text-gray-500'}>– {a}</div>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end flex-wrap">
                {(l.status_peminjaman === 'aktif' || l.status_peminjaman === 'partial') && <GradientActionBtn onClick={() => openModal('return', 'lending', l)} label="Kembali" gradientFrom="#3B82F6" gradientTo="#06B6D4" icon={IconEdit} />}
                <GradientActionBtn onClick={() => handlePrintPeminjamanPDF(l)} label="PDF" gradientFrom="#8B5CF6" gradientTo="#A78BFA" icon={IconPrint} />
                <GradientActionBtn onClick={() => openModal('edit', 'lending', l)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                <GradientActionBtn onClick={() => handleDelete('lending', l.id_peminjaman!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
