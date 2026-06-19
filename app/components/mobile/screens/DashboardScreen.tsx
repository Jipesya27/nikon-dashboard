'use client';
import React from 'react';
import type { ClaimPromo, Garansi, StatusService, PeminjamanBarang, KonsumenData } from '@/app/index';
import { MobileHeader } from '../MobileShell';
import type { MobileScreen } from '../types';

interface DashboardScreenProps {
  onDrawerOpen: () => void;
  onNavigate: (s: MobileScreen) => void;
  claims: ClaimPromo[];
  warranties: Garansi[];
  services: StatusService[];
  lendingRecords: PeminjamanBarang[];
  consumersList: KonsumenData[];
  messages: { length: number };
  currentUser: { nama_karyawan: string; role: string } | null;
  getClaimStatusColor: (c: ClaimPromo) => string;
}

function Icon({ name, size = 24, color = 'inherit' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

function KpiCard({ label, value, icon, bg, fg, onClick }: {
  label: string; value: string | number; icon: string;
  bg: string; fg: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      background: '#fff', borderRadius: 14, padding: '14px 16px',
      border: '1px solid #EEF0F2', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left',
      width: '100%', cursor: 'pointer',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={fg} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#1A1A1A' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9aa0a6', fontWeight: 600 }}>{label}</div>
    </button>
  );
}

function ReminderCard({ icon, color, bg, title, sub, onClick }: {
  icon: string; color: string; bg: string;
  title: string; sub: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      background: '#fff', borderRadius: 12, padding: '13px 14px',
      border: '1px solid #EEF0F2', display: 'flex', alignItems: 'center',
      gap: 12, width: '100%', textAlign: 'left',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={20} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 2 }}>{sub}</div>
      </div>
      <Icon name="chevron_right" size={20} color="#d0d4d8" />
    </button>
  );
}

export default function DashboardScreen({
  onDrawerOpen, onNavigate, claims, warranties,
  services, lendingRecords, consumersList, messages, getClaimStatusColor,
}: DashboardScreenProps) {
  const pendingClaims   = claims.filter(c => getClaimStatusColor(c) === 'Putih').length;
  const aktifLending    = lendingRecords.filter(l => l.status_peminjaman === 'aktif').length;
  const serviceAktif    = services.filter(s => !['Selesai','Tidak Bisa Diperbaiki','Dibatalkan'].includes(s.status_service)).length;
  const garansiBelum    = warranties.filter(w => w.status_validasi === 'Menunggu').length;

  const kpis: { label: string; value: number; icon: string; bg: string; fg: string; screen: MobileScreen }[] = [
    { label: 'Total Konsumen',  value: consumersList.length, icon: 'group',         bg: '#FFF9D6', fg: '#A88600', screen: 'konsumen' },
    { label: 'Total Klaim',     value: claims.length,        icon: 'fact_check',    bg: '#FCE4EC', fg: '#C2185B', screen: 'klaim' },
    { label: 'Total Garansi',   value: warranties.length,    icon: 'verified_user', bg: '#E8F5E9', fg: '#16A34A', screen: 'garansi' },
    { label: 'Total Chat',      value: messages.length,      icon: 'forum',         bg: '#E3F2FD', fg: '#1976D2', screen: 'pesan' },
  ];

  const reminders = ([
    { icon: 'pending_actions',    color: '#3B82F6', bg: '#EFF6FF', title: `${pendingClaims} klaim belum divalidasi`,   sub: 'Perlu tinjauan marketing',          screen: 'klaim' as MobileScreen },
    { icon: 'verified_user',      color: '#16A34A', bg: '#F0FDF4', title: `${garansiBelum} garansi menunggu`,          sub: 'Verifikasi pendaftaran garansi',    screen: 'garansi' as MobileScreen },
    { icon: 'build_circle',       color: '#7C3AED', bg: '#F5F3FF', title: `${serviceAktif} unit dalam service`,        sub: 'Cek status perbaikan produk',       screen: 'service' as MobileScreen },
    { icon: 'inventory_2',        color: '#EA580C', bg: '#FFF7ED', title: `${aktifLending} peminjaman aktif`,           sub: 'Barang aset yang sedang dipinjam',  screen: 'peminjaman' as MobileScreen },
  ] as const).filter(r => {
    const n = parseInt(r.title);
    return !isNaN(n) && n > 0;
  });

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader
        title="Dashboard"
        subtitle="Alta Nikindo Indonesia"
        onMenuOpen={onDrawerOpen}
        rightSlot={
          <div style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>
            {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px' }}>
        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {kpis.map(k => (
            <KpiCard key={k.label} {...k} onClick={() => onNavigate(k.screen)} />
          ))}
        </div>

        {/* Reminders */}
        {reminders.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
              Perlu Perhatian
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reminders.map(r => (
                <ReminderCard key={r.screen} {...r} onClick={() => onNavigate(r.screen)} />
              ))}
            </div>
          </>
        )}

        {/* Quick links */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '16px 0 8px' }}>Menu Cepat</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {([
            { icon: 'sell',       label: 'Promo',      screen: 'promo' as MobileScreen,      color: '#A88600' },
            { icon: 'build',      label: 'Service',    screen: 'service' as MobileScreen,    color: '#7C3AED' },
            { icon: 'payments',   label: 'Bayar',      screen: 'bayar' as MobileScreen,      color: '#1976D2' },
            { icon: 'qr_code_scanner', label: 'Absensi', screen: 'absensi' as MobileScreen, color: '#0F766E' },
            { icon: 'monitor_heart',   label: 'Infra',    screen: 'infra' as MobileScreen,    color: '#DC2626' },
            { icon: 'inventory_2',label: 'Pinjam',     screen: 'peminjaman' as MobileScreen, color: '#EA580C' },
          ] as const).map(q => (
            <button key={q.screen} onClick={() => onNavigate(q.screen)} style={{
              background: '#fff', borderRadius: 12, padding: '14px 8px',
              border: '1px solid #EEF0F2', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6,
            }}>
              <Icon name={q.icon} size={22} color={q.color} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#5f6368' }}>{q.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
