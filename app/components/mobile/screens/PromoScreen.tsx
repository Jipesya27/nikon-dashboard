'use client';
import React, { useState, useMemo } from 'react';
import type { Promosi } from '@/app/index';
import { MobileHeader, MobileSearch, ChipsRow, MobileEmpty, IconBtn, FAB } from '../MobileShell';

interface PromoScreenProps {
  onDrawerOpen: () => void;
  promos: Promosi[];
  setPromos: React.Dispatch<React.SetStateAction<Promosi[]>>;
  openModal: (mode: string, type: string, data?: unknown) => void;
  handleDelete: (type: string, id: string) => void;
  currentUser: { role: string } | null;
}

function Icon({ name, size = 20, color = '#5f6368' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}-${m}-${y.slice(2)}`;
}

export default function PromoScreen({
  onDrawerOpen, promos, setPromos, openModal, handleDelete, currentUser,
}: PromoScreenProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Semua');

  const chips = useMemo(() => {
    const counts = { Semua: promos.length, Aktif: 0, Nonaktif: 0 };
    promos.forEach(p => { if (p.status_aktif) counts.Aktif++; else counts.Nonaktif++; });
    return (['Semua', 'Aktif', 'Nonaktif'] as const).map(f => ({
      label: `${f} ${counts[f]}`,
      active: filter === f,
      color: filter === f ? '#1A1A1A' : '#5f6368',
      bg: filter === f ? '#FFE500' : '#F3F4F6',
      border: filter === f ? '#FFE500' : 'transparent',
      onClick: () => setFilter(f),
    }));
  }, [promos, filter]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return promos.filter(p => {
      const statusOk = filter === 'Semua' || (filter === 'Aktif' ? p.status_aktif : !p.status_aktif);
      const searchOk = !q || p.nama_promo.toLowerCase().includes(q) ||
        p.tipe_produk.some(tp => tp.nama_produk.toLowerCase().includes(q));
      return statusOk && searchOk;
    });
  }, [promos, filter, query]);

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader
        title="Promo"
        subtitle="Daftar promo aktif"
        onMenuOpen={onDrawerOpen}
        rightSlot={<span style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>{promos.length} promo</span>}
      />
      <MobileSearch value={query} onChange={setQuery} placeholder="Cari nama promo atau produk…" />
      <ChipsRow chips={chips} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && <MobileEmpty icon="sell" title="Belum ada promo" subtitle="Tidak ada promo pada filter ini" />}
        {filtered.map(p => (
          <div key={p.id_promo} style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #EEF0F2' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.3 }}>{p.nama_promo}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: p.status_aktif ? '#DCFCE7' : '#F1F3F4', color: p.status_aktif ? '#16A34A' : '#9aa0a6', flexShrink: 0, border: `1px solid ${p.status_aktif ? '#BBF7D0' : '#E5E7EB'}` }}>
                {p.status_aktif ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </div>
            {/* Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9, color: '#3c4043', fontSize: 13, fontWeight: 600 }}>
              <Icon name="calendar_month" size={17} color="#80868b" />
              {fmtDate(p.tanggal_mulai)} s/d {fmtDate(p.tanggal_selesai)}
            </div>
            {/* Products */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '14px 0 8px' }}>
              Tipe Produk ({p.tipe_produk.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {p.tipe_produk.map(tp => (
                <div key={tp.nama_produk} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F3F4F6', borderRadius: 9, padding: '10px 12px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{tp.nama_produk}</span>
                </div>
              ))}
            </div>
            {/* Actions */}
            {canEdit && (
              <>
                <div style={{ height: 1, background: '#EEF0F2', margin: '14px 0 12px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setPromos(prev => prev.map(x => x.id_promo === p.id_promo ? { ...x, status_aktif: !x.status_aktif } : x))}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: p.status_aktif ? '#16A34A' : '#9aa0a6', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Icon name={p.status_aktif ? 'toggle_on' : 'toggle_off'} size={22} color={p.status_aktif ? '#16A34A' : '#9aa0a6'} />
                    {p.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <IconBtn icon="edit"   color="#2563EB" border="#BFDBFE" onClick={() => openModal('edit', 'promo', p)} />
                    <IconBtn icon="delete" color="#DC2626" border="#FECACA" onClick={() => handleDelete('promo', p.id_promo!)} />
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {canEdit && <FAB label="Promo Baru" onClick={() => openModal('create', 'promo')} />}
    </div>
  );
}
