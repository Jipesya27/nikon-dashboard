'use client';

import React from 'react';
import { EventRegistration, Karyawan } from '@/app/index';
import { GradientActionBtn, IconTrash, IconSend, IconCheck } from '@/app/components/GradientActionBtn';

export interface EventRegistrationsTabProps {
  eventRegistrations: EventRegistration[];
  filterRegEventName: string;
  setFilterRegEventName: (v: string) => void;
  searchRegistration: string;
  setSearchRegistration: (v: string) => void;
  viewMode: 'table' | 'card';
  currentUser: Karyawan | null;
  handleMarkAttendance: (id: string) => Promise<void> | void;
  handleSendEventSuccessWA: (reg: EventRegistration) => Promise<void> | void;
  handleDelete: (type: 'eventregistration', id: string) => unknown;
}

export default function EventRegistrationsTab({
  eventRegistrations,
  filterRegEventName,
  setFilterRegEventName,
  searchRegistration,
  setSearchRegistration,
  viewMode,
  currentUser,
  handleMarkAttendance,
  handleSendEventSuccessWA,
  handleDelete,
}: EventRegistrationsTabProps) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  const eventCounts: Record<string, number> = {};
  eventRegistrations.forEach(r => {
    const n = r.event_name || '-';
    eventCounts[n] = (eventCounts[n] || 0) + 1;
  });
  const eventNames = Object.keys(eventCounts).sort();

  const filtered = eventRegistrations.filter(r => {
    const matchEvent = filterRegEventName === 'Semua' || r.event_name === filterRegEventName;
    const q = searchRegistration.toLowerCase();
    const matchSearch = !q || (r.full_name || r.nama_lengkap || '').toLowerCase().includes(q) || (r.event_name || '').toLowerCase().includes(q);
    return matchEvent && matchSearch;
  });
  const confirmed = filtered.filter(r => r.status_pendaftaran === 'terdaftar').length;
  const pending = filtered.filter(r => r.status_pendaftaran === 'menunggu_validasi').length;
  const hadir = filtered.filter(r => r.is_attended).length;

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      {/* Filter dropdown + pills */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterRegEventName}
          onChange={e => setFilterRegEventName(e.target.value)}
          aria-label="Filter nama event"
          className="py-2 px-3 border border-gray-200 bg-white text-gray-700 rounded-lg outline-none focus:border-[#FFE500] text-xs font-medium max-w-xs"
        >
          <option value="Semua">Semua Event ({eventRegistrations.length})</option>
          {eventNames.map(n => (
            <option key={n} value={n}>{n} ({eventCounts[n]})</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {eventNames.map(n => (
            <button key={n}
              onClick={() => setFilterRegEventName(filterRegEventName === n ? 'Semua' : n)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition whitespace-nowrap ${filterRegEventName === n ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
            >
              {n} <span className="font-bold">{eventCounts[n]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards — reflect filtered data */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { label: 'Total Peserta', count: filtered.length, accent: '#6b7280' },
          { label: 'Terdaftar', count: confirmed, accent: '#10b981' },
          { label: 'Menunggu', count: pending, accent: '#f59e0b' },
          { label: 'Hadir', count: hadir, accent: '#3b82f6' },
        ] as { label: string; count: number; accent: string }[]).map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm" style={{ borderTop: `3px solid ${s.accent}` }}>
            <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" title="Cari Peserta" aria-label="Cari Peserta" placeholder="Cari nama peserta..." value={searchRegistration} onChange={e => setSearchRegistration(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 bg-white text-gray-800 rounded-lg outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-xs" />
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left font-bold text-gray-700">Nama Lengkap</th>
                <th className="px-3 py-3 text-left font-bold text-gray-700">Kontak</th>
                <th className="px-3 py-3 text-left font-bold text-gray-700">Event</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Kehadiran</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Bukti TF</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((reg: EventRegistration) => {
                const isConfirmed = reg.status_pendaftaran === 'terdaftar' || reg.status === 'Confirmed';
                const isCancelled = reg.status_pendaftaran === 'ditolak' || reg.status === 'Cancelled';
                return (
                  <tr key={reg.id} className={`border-l-4 ${isConfirmed ? 'border-l-green-500' : isCancelled ? 'border-l-red-400' : 'border-l-orange-400'} hover:bg-gray-50 transition-colors`}>
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-slate-800">{reg.full_name || reg.nama_lengkap || '-'}</p>
                      <p className="text-[10px] text-gray-500">{reg.camera_model || reg.tipe_kamera || '-'}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-mono">{reg.wa_number || reg.nomor_wa || '-'}</p>
                      <p className="text-[10px] text-gray-500">{reg.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-amber-700">{reg.event_name}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${isConfirmed ? 'bg-green-100 text-green-700' : isCancelled ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {reg.status_pendaftaran || reg.status || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {reg.is_attended
                        ? <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-1 rounded">HADIR ✅</span>
                        : <GradientActionBtn onClick={() => handleMarkAttendance(reg.id!)} label="Hadir" gradientFrom="#10B981" gradientTo="#34D399" icon={IconCheck} />}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {reg.bukti_transfer_url
                        ? <a href={reg.bukti_transfer_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[11px] font-bold">📎 Lihat</a>
                        : <span className="text-gray-400 text-[11px]">-</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                          {isConfirmed && <GradientActionBtn onClick={() => handleSendEventSuccessWA(reg)} label="Kirim WA" gradientFrom="#25D366" gradientTo="#128C7E" icon={IconSend} />}
                          {isAdmin && (
                            <GradientActionBtn onClick={() => handleDelete('eventregistration', reg.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (<div></div>)}
    </div>
  );
}
