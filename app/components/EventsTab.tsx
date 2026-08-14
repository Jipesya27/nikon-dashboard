'use client';

import React from 'react';
import { EventData, Karyawan } from '@/app/index';
import { GradientActionBtn, IconEdit, IconTrash } from '@/app/components/GradientActionBtn';
import { SortConfig, handleSort, driveImgSrc } from '@/app/lib/uiHelpers';

export interface EventsTabProps {
  events: EventData[];
  sortedEvents: EventData[];
  searchEvent: string;
  setSearchEvent: (v: string) => void;
  viewMode: 'table' | 'card';
  sortConfigEvents: SortConfig;
  setSortConfigEvents: React.Dispatch<React.SetStateAction<SortConfig>>;
  eventNumberMap: Map<string, number>;
  eventRegistrationsCount: Record<string, number>;
  getEventClosedStatus: (
    evt: { status: string; stock: number; date: string; registration_close_date?: string | null },
    regCount: number,
  ) => { closed: boolean; reason: string };
  currentUser: Karyawan | null;
  openModal: (action: 'create' | 'edit', type: 'event', item?: EventData) => void;
  handleDelete: (type: 'events', id: string) => unknown;
}

export default function EventsTab({
  events,
  sortedEvents,
  searchEvent,
  setSearchEvent,
  viewMode,
  sortConfigEvents,
  setSortConfigEvents,
  eventNumberMap,
  eventRegistrationsCount,
  getEventClosedStatus,
  currentUser,
  openModal,
  handleDelete,
}: EventsTabProps) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  const aktifEvents = events.filter(e => {
    const { closed } = getEventClosedStatus(e, eventRegistrationsCount[e.title] || 0);
    return !closed;
  }).length;
  const totalPeserta = Object.values(eventRegistrationsCount).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { label: 'Total Event', count: events.length, color: 'text-gray-900', bar: 'bg-gray-400' },
          { label: 'Aktif / Open', count: aktifEvents, color: 'text-green-700', bar: 'bg-green-500' },
          { label: 'Total Peserta', count: totalPeserta, color: 'text-blue-700', bar: 'bg-blue-500' },
        ] as { label: string; count: number; color: string; bar: string }[]).map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border-2 border-gray-200 shadow-sm">
            <div className={`w-full h-1 rounded-md mb-2 ${s.bar}`}></div>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick links event */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([
          { href: '/events/register', label: 'Daftar Event', sub: 'Halaman publik', bg: 'bg-yellow-50', ic: 'bg-yellow-100', svg: <svg className="w-4 h-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg> },
          { href: '/nikon/upload-lomba', label: 'Upload Foto Lomba', sub: 'Halaman publik', bg: 'bg-blue-50', ic: 'bg-blue-100', svg: <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { href: '/admin/events', label: 'Validasi Pembayaran', sub: 'Admin panel', bg: 'bg-green-50', ic: 'bg-green-100', svg: <svg className="w-4 h-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { href: '/admin/events/attendance', label: 'Absensi Event', sub: 'Scan QR', bg: 'bg-purple-50', ic: 'bg-purple-100', svg: <svg className="w-4 h-4 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg> },
        ] as { href: string; label: string; sub: string; bg: string; ic: string; svg: React.ReactNode }[]).map(link => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2.5 ${link.bg} border border-transparent hover:border-[#FFE500] hover:shadow-sm rounded-xl px-3 py-2.5 transition-all group`}>
            <div className={`${link.ic} w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}>{link.svg}</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 group-hover:text-black truncate leading-tight">{link.label}</p>
              <p className="text-[10px] text-gray-400 truncate">{link.sub}</p>
            </div>
          </a>
        ))}
      </div>

      <input type="text" title="Cari Event" aria-label="Cari Event" placeholder="🔍 Cari Judul Event..." value={searchEvent} onChange={e => setSearchEvent(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />

      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">No</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Poster</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigEvents, setSortConfigEvents, 'title')}>Judul Event {sortConfigEvents.column === 'title' && <span className="text-xs">{sortConfigEvents.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigEvents, setSortConfigEvents, 'date')}>Tanggal {sortConfigEvents.column === 'date' && <span className="text-xs">{sortConfigEvents.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                <th className="px-3 py-3 text-left font-bold text-gray-700">Detail</th>
                <th className="px-3 py-3 text-left font-bold text-gray-700">Harga</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Pendaftaran</th>
                <th className="px-3 py-3 text-center font-bold text-gray-700">Kuota / Status</th>
                <th className="px-3 py-3 text-center font-bold text-gray-700">Peserta</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedEvents.map((evt: EventData) => {
                const { closed, reason } = getEventClosedStatus(evt, eventRegistrationsCount[evt.title] || 0);
                return (
                  <tr key={evt.id} className={`border-l-4 ${closed ? 'border-l-red-400' : 'border-l-green-500'} hover:bg-gray-50 transition-colors`}>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-500 text-xs">{eventNumberMap.get(evt.id!)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={driveImgSrc(evt.image)} alt="poster" className="w-10 h-14 object-cover rounded shadow-sm mx-auto" />
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">{evt.title}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{evt.date}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{evt.detail_acara || '-'}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-gray-800 whitespace-nowrap">{evt.price}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {(() => {
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const todayStr = today.toISOString().slice(0, 10);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const ef = evt as any;
                        const display = ef.display_start_date ? new Date(ef.display_start_date) : null;
                        const open = ef.registration_open_date ? new Date(ef.registration_open_date) : null;
                        const close = ef.registration_close_date ? new Date(ef.registration_close_date) : null;
                        const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
                        const bannerVisible = (!display || display <= today) && (!close || close >= today);
                        const regOpen = bannerVisible && (!open || todayStr >= ef.registration_open_date);
                        return (
                          <div className="space-y-0.5">
                            {display && <p className="text-gray-500"><span className="font-semibold text-gray-700">Tampil:</span> {fmt(display)}</p>}
                            {open && <p className="text-gray-500"><span className="font-semibold text-gray-700">Daftar:</span> {fmt(open)}</p>}
                            {close && <p className="text-gray-500"><span className="font-semibold text-gray-700">Tutup:</span> {fmt(close)}</p>}
                            {!display && !open && !close && <span className="text-gray-400 italic">Tidak diatur</span>}
                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${bannerVisible ? (regOpen ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700') : 'bg-gray-100 text-gray-500'}`}>
                              {bannerVisible ? (regOpen ? '✓ Daftar Terbuka' : '⏳ Segera Daftar') : '✗ Tersembunyi'}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <p className="font-bold text-gray-700 text-xs">{eventRegistrationsCount[evt.title] || 0}/{evt.stock} slot</p>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${closed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{reason}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-600 text-sm">{eventRegistrationsCount[evt.title] || 0}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <GradientActionBtn onClick={() => openModal('edit', 'event', evt)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                        {isAdmin && (
                          <GradientActionBtn onClick={() => handleDelete('events', evt.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                        )}
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
          {sortedEvents.map((evt: EventData) => {
            const detailPreview = evt.detail_acara ? (evt.detail_acara.length > 100 ? evt.detail_acara.substring(0, 100) + '...' : evt.detail_acara) : '-';
            const { closed: evtClosed, reason: evtReason } = getEventClosedStatus(evt, eventRegistrationsCount[evt.title] || 0);
            return (
              <div key={evt.id} className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] hover:shadow-md transition overflow-hidden">
                {/* Full-width poster image */}
                <div className="relative w-full h-52 bg-gray-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={driveImgSrc(evt.image)} alt="poster" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 font-bold text-sm text-gray-700 bg-white/90 rounded-md w-7 h-7 flex items-center justify-center shadow-sm">{eventNumberMap.get(evt.id!)}</span>
                  <span className={`absolute top-2 right-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${evtClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{evtClosed ? evtReason : 'Aktif'}</span>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="border-b border-gray-100 pb-2 mb-3">
                    <h3 className="font-bold text-base text-slate-800 leading-tight">{evt.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{evt.date}</p>
                  </div>
                  <div className="space-y-2 text-xs flex-1">
                    <p><span className="font-bold w-20 inline-block">Detail:</span> {detailPreview}</p>
                    <p><span className="font-bold w-20 inline-block">Harga:</span> {evt.price}</p>
                    <p><span className="font-bold w-20 inline-block">Kuota:</span> {eventRegistrationsCount[evt.title] || 0}/{evt.stock} slot</p>
                    <p><span className="font-bold w-20 inline-block">Peserta:</span> {eventRegistrationsCount[evt.title] || 0} orang</p>
                    {evt.bank_info && <p className="bg-blue-50 border border-blue-100 rounded p-2 mt-2"><span className="font-bold">Rekening:</span> {evt.bank_info}</p>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                    <GradientActionBtn onClick={() => openModal('edit', 'event', evt)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                    {isAdmin && (
                      <GradientActionBtn onClick={() => handleDelete('events', evt.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                    )}
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
