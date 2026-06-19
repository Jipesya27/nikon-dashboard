'use client';
import React, { useState, useMemo } from 'react';
import type { StatusService } from '@/app/index';
import { STATUS_SERVICE_OPTIONS } from '@/app/enums';
import { MobileHeader, MobileSearch, ChipsRow, MobileEmpty, IconBtn, FAB } from '../MobileShell';

interface ServiceScreenProps {
  onDrawerOpen: () => void;
  services: StatusService[];
  setServices: React.Dispatch<React.SetStateAction<StatusService[]>>;
  openModal: (mode: string, type: string, data?: unknown) => void;
  handleDelete: (type: string, id: string) => void;
}

const STATUS_FLOW = ['Diterima','Pengecekan oleh Teknisi','Menunggu Sparepart','Dalam Pengerjaan','Quality Check','Siap Diambil','Selesai'];
const TERMINAL    = ['Tidak Bisa Diperbaiki','Dibatalkan'];

const STATUS_META: Record<string, { fg: string; bg: string; border: string; accent: string }> = {
  'Diterima':                  { fg: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', accent: '#3B82F6' },
  'Pengecekan oleh Teknisi':   { fg: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', accent: '#8B5CF6' },
  'Menunggu Sparepart':        { fg: '#B45309', bg: '#FFFBEB', border: '#FDE68A', accent: '#F59E0B' },
  'Dalam Pengerjaan':          { fg: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', accent: '#0EA5E9' },
  'Quality Check':             { fg: '#6B21A8', bg: '#FAF5FF', border: '#E9D5FF', accent: '#A855F7' },
  'Siap Diambil':              { fg: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', accent: '#22C55E' },
  'Selesai':                   { fg: '#0F766E', bg: '#F0FDFA', border: '#99F6E4', accent: '#14B8A6' },
  'Tidak Bisa Diperbaiki':     { fg: '#DC2626', bg: '#FEF2F2', border: '#FECACA', accent: '#EF4444' },
  'Dibatalkan':                { fg: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', accent: '#9CA3AF' },
};

function Icon({ name, size = 20, color = '#5f6368' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

export default function ServiceScreen({
  onDrawerOpen, services, setServices, openModal, handleDelete,
}: ServiceScreenProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Semua');

  const allStatuses = ['Semua', ...STATUS_SERVICE_OPTIONS.map(o => o.value)];

  const chips = useMemo(() => allStatuses.map(key => {
    const cnt = key === 'Semua' ? services.length : services.filter(s => s.status_service === key).length;
    const active = filter === key;
    const m = STATUS_META[key] || { fg: '#fff', bg: '#1A1A1A', border: '#1A1A1A', accent: '#1A1A1A' };
    const shortLabel: Record<string, string> = {
      'Pengecekan oleh Teknisi': 'Pengecekan', 'Menunggu Sparepart': 'Tg Sparepart',
      'Dalam Pengerjaan': 'Dikerjakan', 'Tidak Bisa Diperbaiki': 'Tdk Bisa',
    };
    return {
      label: `${shortLabel[key] || key} ${cnt}`,
      active,
      color: active ? (key === 'Semua' ? '#fff' : m.fg) : '#5f6368',
      bg: active ? (key === 'Semua' ? '#1A1A1A' : m.bg) : '#F3F4F6',
      border: active ? (key === 'Semua' ? '#1A1A1A' : m.border) : 'transparent',
      onClick: () => setFilter(key),
    };
  }), [services, filter]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return services.filter(s => {
      const statusOk = filter === 'Semua' || s.status_service === filter;
      const searchOk = !q || s.nomor_tanda_terima.toLowerCase().includes(q) || s.nomor_seri.includes(q) || s.status_service.toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [services, filter, query]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader
        title="Service"
        subtitle="Status perbaikan produk"
        onMenuOpen={onDrawerOpen}
        rightSlot={<span style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>{services.length} unit</span>}
      />
      <MobileSearch value={query} onChange={setQuery} placeholder="Cari no tanda terima, serial, status…" />
      <ChipsRow chips={chips} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && <MobileEmpty icon="build_circle" title="Tidak ditemukan" subtitle="Coba kata kunci atau filter lain" />}
        {filtered.map(s => {
          const m = STATUS_META[s.status_service] || STATUS_META['Diterima'];
          const curIdx    = STATUS_FLOW.indexOf(s.status_service);
          const isTerminal = TERMINAL.includes(s.status_service);
          const tgl = s.created_at ? new Date(s.created_at) : null;
          const tglStr = tgl ? tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
          const days = tgl ? Math.floor((Date.now() - tgl.getTime()) / 86400000) : 0;
          const durasiColor = days > 7 ? '#DC2626' : days > 3 ? '#D97706' : '#15803D';
          return (
            <div key={s.id_service} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #EEF0F2', borderLeft: `4px solid ${isTerminal ? m.accent : (curIdx >= 0 ? m.accent : '#E5E7EB')}` }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1A1A', fontFamily: 'monospace', letterSpacing: .5 }}>{s.nomor_tanda_terima}</div>
                  <div style={{ fontSize: 12, color: '#9aa0a6', fontFamily: 'monospace', marginTop: 2 }}>SN: {s.nomor_seri}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: m.bg, color: m.fg, border: `1px solid ${m.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {s.status_service}
                </span>
              </div>
              {/* Flow dots */}
              <div style={{ marginTop: 12, background: '#F8F9FA', borderRadius: 10, padding: '11px 13px' }}>
                <div style={{ fontSize: 10, color: '#9aa0a6', fontWeight: 600, marginBottom: 7 }}>ALUR STATUS</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {STATUS_FLOW.map((step, i) => (
                    <React.Fragment key={step}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isTerminal ? '#FECACA' : i < curIdx ? '#22C55E' : i === curIdx ? m.accent : '#E5E7EB', flexShrink: 0 }} />
                      {i < STATUS_FLOW.length - 1 && <div style={{ flex: 1, height: 2, background: isTerminal ? '#FECACA' : i < curIdx ? '#22C55E' : '#E5E7EB' }} />}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: m.fg, marginTop: 6 }}>
                  {isTerminal ? s.status_service : curIdx >= 0 ? `Langkah ${curIdx + 1}/${STATUS_FLOW.length} — ${s.status_service}` : s.status_service}
                </div>
              </div>
              {/* Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 12 }}>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 2 }}>Tgl Masuk</div><div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{tglStr}</div></div>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 2 }}>Durasi</div><div style={{ fontSize: 13, fontWeight: 700, color: durasiColor }}>{days === 0 ? 'Hari ini' : `${days} hari`}</div></div>
              </div>
              {/* Actions */}
              <div style={{ height: 1, background: '#EEF0F2', margin: '13px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IconBtn icon="edit" color="#2563EB" border="#BFDBFE" onClick={() => openModal('edit', 'service', s)} />
                  <IconBtn icon="send" color="#16A34A" border="#BBF7D0" onClick={() => alert(`Kirim status ke konsumen — ${s.nomor_tanda_terima}`)} />
                </div>
                <IconBtn icon="delete" color="#DC2626" border="#FECACA" onClick={() => handleDelete('service', s.id_service!)} />
              </div>
            </div>
          );
        })}
      </div>
      <FAB label="Tambah Service" onClick={() => openModal('create', 'service')} />
    </div>
  );
}
