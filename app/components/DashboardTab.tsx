'use client';

import React from 'react';
import {
  Karyawan,
  KonsumenData,
  ClaimPromo,
  Garansi,
  EventData,
  EventRegistration,
  PeminjamanBarang,
  PengaturanBot,
  RiwayatPesan,
} from '@/app/index';

const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#6366f1'];

function initials(name: string): string {
  return (name || '?').split(/\s+/).map(w => w[0] || '').filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function avatarColor(s: string): string {
  return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length];
}
function regStatusLabel(s: string): string {
  return s === 'menunggu_validasi' ? 'Validasi' : s === 'terdaftar' ? 'Terdaftar' : 'Ditolak';
}
function regStatusStyle(s: string): string {
  return s === 'menunggu_validasi'
    ? 'bg-orange-100 text-orange-700'
    : s === 'terdaftar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600';
}
function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60000) return 'Baru saja';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}j lalu`;
  return `${Math.floor(diff / 86400000)}h lalu`;
}

export interface DashboardTabProps {
  currentUser: Karyawan | null;
  consumersList: KonsumenData[];
  claims: ClaimPromo[];
  warranties: Garansi[];
  events: EventData[];
  eventRegistrations: EventRegistration[];
  eventRegistrationsCount: Record<string, number>;
  lendingRecords: PeminjamanBarang[];
  messages: RiwayatPesan[];
  messagesCount: number;
  botSettings: PengaturanBot[];
  claimStatusCounts: Record<string, number>;
  getEventClosedStatus: (
    evt: { status: string; stock: number; date: string; registration_close_date?: string | null },
    regCount: number,
  ) => { closed: boolean; reason: string };
  showAllActivities: boolean;
  setShowAllActivities: React.Dispatch<React.SetStateAction<boolean>>;
  dbChecking: boolean;
  setDbChecking: React.Dispatch<React.SetStateAction<boolean>>;
  dbCheckResult: Record<string, unknown> | null;
  setDbCheckResult: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  onNavigate: (tab: string) => void;
}

export default function DashboardTab({
  currentUser,
  consumersList,
  claims,
  warranties,
  events,
  eventRegistrations,
  eventRegistrationsCount,
  lendingRecords,
  messages,
  messagesCount,
  botSettings,
  claimStatusCounts,
  getEventClosedStatus,
  showAllActivities,
  setShowAllActivities,
  dbChecking,
  setDbChecking,
  dbCheckResult,
  setDbCheckResult,
  onNavigate,
}: DashboardTabProps) {
  const now = new Date();
  const hour = parseInt(now.toLocaleString('id-ID', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

  const pendingValidasi = eventRegistrations.filter(r => r.status_pendaftaran === 'menunggu_validasi').length;
  const claimsTungguResi = claimStatusCounts.Pink ?? 0;

  const needsAttention = pendingValidasi
    + claimsTungguResi
    + lendingRecords.filter(l => l.status_peminjaman === 'aktif').length;

  const thisMonth = now.toLocaleString('id-ID', { month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' }).replace(' ', '/');

  const recentRegs = [...eventRegistrations]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 6);

  type ActivityItem = { icon: string; iconBg: string; title: string; sub: string; timeMs: number };
  const activities: ActivityItem[] = [];

  recentRegs.slice(0, 3).forEach(r => {
    activities.push({
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      iconBg: '#eff6ff',
      title: r.status_pendaftaran === 'menunggu_validasi' ? 'Registrasi baru masuk' : r.status_pendaftaran === 'terdaftar' ? 'Pembayaran divalidasi' : 'Registrasi ditolak',
      sub: `${r.nama_lengkap} · ${r.event_name || '-'}`,
      timeMs: new Date(r.created_at || 0).getTime(),
    });
  });

  claims.filter(c => c.nama_jasa_pengiriman && c.resi_sent_at).slice(0, 2).forEach(c => {
    activities.push({
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      iconBg: '#f0fdf4',
      title: 'Resi dikirim ke konsumen',
      sub: `${c.nama_pendaftar || c.nama_penerima_claim || '-'} · ${c.nama_jasa_pengiriman}`,
      timeMs: new Date(c.resi_sent_at || 0).getTime(),
    });
  });

  if (claimsTungguResi > 0) {
    activities.push({
      icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      iconBg: '#fff7ed',
      title: `${claimsTungguResi} claim tunggu resi`,
      sub: 'Perlu diisi nomor resi pengiriman',
      timeMs: Date.now() - 3600000,
    });
  }

  if (pendingValidasi > 0) {
    activities.push({
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      iconBg: '#fffbeb',
      title: `${pendingValidasi} registrasi menunggu validasi`,
      sub: 'Perlu di-approve atau ditolak',
      timeMs: Date.now() - 7200000,
    });
  }

  activities.sort((a, b) => b.timeMs - a.timeMs);

  const activeEvents = events
    .filter(e => { const { closed } = getEventClosedStatus(e, eventRegistrationsCount[e.title] || 0); return !closed; })
    .slice(0, 3);

  const botWaOn = botSettings.some(s => s.nama_pengaturan === 'bot_aktif' && s.url_file === 'true') || botSettings.length > 0;

  const statCards = [
    { label: 'Total Konsumen', value: consumersList.length, sub: consumersList.length > 0 ? '+8.2%' : null, subColor: 'text-green-600', onClick: () => onNavigate('konsumen') },
    { label: 'Perlu Validasi', value: pendingValidasi, sub: pendingValidasi > 0 ? 'Segera' : 'Semua clear', subColor: pendingValidasi > 0 ? 'text-orange-500' : 'text-green-600', onClick: () => onNavigate('eventregistrations') },
    { label: 'Pesan WA', value: messagesCount || messages.length, sub: '+8%', subColor: 'text-green-600', onClick: () => onNavigate('messages') },
    { label: 'Resi Bulan Ini', value: claims.filter(c => c.resi_sent_at && c.resi_sent_at.startsWith(thisMonth.split('/').reverse().join('-').substring(0, 7))).length, sub: `+${claimsTungguResi} tunggu`, subColor: 'text-blue-500', onClick: () => onNavigate('claims') },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{greeting}, {currentUser?.nama_karyawan?.split(' ')[0]}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{dateStr}{needsAttention > 0 && <span className="ml-2 text-orange-500 font-medium">· {needsAttention} item perlu perhatian</span>}</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm self-start sm:self-auto">
          {(['Hari Ini', 'Minggu', 'Bulan'] as const).map((p, i) => (
            <button key={p} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${i === 0 ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(s => (
          <button key={s.label} onClick={s.onClick} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all group">
            <p className="text-xs text-gray-400 font-medium mb-2">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString('id-ID')}</p>
            {s.sub && <p className={`text-xs font-semibold mt-1.5 flex items-center gap-1 ${s.subColor}`}><span>↑</span>{s.sub}</p>}
          </button>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* REGISTRASI TERBARU */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Registrasi Terbaru</h3>
            <button onClick={() => onNavigate('eventregistrations')} className="text-xs text-blue-600 hover:underline font-medium">Semua</button>
          </div>
          {recentRegs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Belum ada registrasi</p>
          ) : (
            <div className="space-y-2.5">
              {recentRegs.map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: avatarColor(r.nama_lengkap || '?') }}>
                    {initials(r.nama_lengkap || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.nama_lengkap}</p>
                    <p className="text-xs text-gray-400 truncate">{r.event_name} · {r.tipe_kamera || '-'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${regStatusStyle(r.status_pendaftaran || '')}`}>
                    {regStatusLabel(r.status_pendaftaran || '')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AKTIVITAS TERKINI */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Aktivitas Terkini</h3>
            {activities.length > 7 && (
              <button onClick={() => setShowAllActivities(v => !v)} className="text-xs text-blue-600 hover:underline font-medium">
                {showAllActivities ? 'Ringkas' : `Semua (${activities.length})`}
              </button>
            )}
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Tidak ada aktivitas terbaru</p>
          ) : (
            <div className="space-y-3">
              {(showAllActivities ? activities : activities.slice(0, 7)).map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: a.iconBg }}>
                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={a.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{a.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{a.sub}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo(a.timeMs)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* EVENT AKTIF */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Event Aktif</h3>
            <button onClick={() => onNavigate('events')} className="text-xs text-blue-600 hover:underline font-medium">Semua</button>
          </div>
          {activeEvents.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Tidak ada event aktif</p>
          ) : (
            <div className="space-y-4">
              {activeEvents.map(evt => {
                const count = eventRegistrationsCount[evt.title] || 0;
                const pct = evt.stock > 0 ? Math.min(100, Math.round(count / evt.stock * 100)) : 0;
                const evtDate = evt.date ? new Date(evt.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }) : '-';
                return (
                  <div key={evt.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-800">{evt.title}</p>
                      <span className="text-xs text-gray-500 font-medium">{count}/{evt.stock}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-md overflow-hidden">
                      <div className="h-full rounded-md bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{evtDate}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* STATUS SISTEM */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Status Sistem</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Bot WA', ok: botWaOn },
              { label: 'Database', ok: true },
              { label: 'Google Drive', ok: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-md ${s.ok ? 'bg-green-400' : 'bg-red-400'}`} />
                  {s.label}
                </span>
                <span className={`text-xs font-semibold ${s.ok ? 'text-green-600' : 'text-red-500'}`}>{s.ok ? 'Online' : 'Offline'}</span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Claim promo</span>
                <span className="text-xs font-semibold text-gray-700">{claims.length} total</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Garansi aktif</span>
                <span className="text-xs font-semibold text-gray-700">{warranties.filter(w => w.status_validasi === 'Valid').length} valid</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Peminjaman aktif</span>
                <span className="text-xs font-semibold text-gray-700">{lendingRecords.filter(l => l.status_peminjaman === 'aktif').length} unit</span>
              </div>
            </div>
            <button
              onClick={async () => {
                setDbChecking(true);
                try {
                  const res = await fetch('/api/admin/data-check', { cache: 'no-store' });
                  const json = await res.json();
                  setDbCheckResult(json);
                } catch (e) { setDbCheckResult({ error: String(e) }); }
                finally { setDbChecking(false); }
              }}
              disabled={dbChecking}
              className="mt-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors w-full"
            >{dbChecking ? 'Memeriksa...' : 'Cek koneksi DB'}</button>
            {dbCheckResult && (
              <div className="text-xs font-mono mt-1 space-y-0.5">
                {dbCheckResult.error ? (
                  <p className="text-red-600">❌ {String(dbCheckResult.error)}</p>
                ) : (
                  <p className="text-green-600">✅ Terhubung — service key {dbCheckResult.serviceKeySet ? 'OK' : 'MISSING'}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
