'use client';
import React, { useState, useMemo } from 'react';
import type { KonsumenData } from '@/app/index';
import { MobileHeader, MobileSearch, MobileEmpty } from '../MobileShell';

interface KonsumenScreenProps {
  onDrawerOpen: () => void;
  consumersList: KonsumenData[];
  openModal: (mode: string, type: string, data?: unknown) => void;
}

function Icon({ name, size = 20, color = '#5f6368' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#1D4ED8','#7C3AED','#0F766E','#EA580C','#BE185D','#15803D'];

export default function KonsumenScreen({ onDrawerOpen, consumersList, openModal }: KonsumenScreenProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return consumersList.filter(k =>
      k.nama_lengkap.toLowerCase().includes(q) ||
      k.nomor_wa.includes(q) ||
      (k.provinsi || '').toLowerCase().includes(q)
    );
  }, [consumersList, query]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader
        title="Konsumen"
        subtitle="Database pelanggan"
        onMenuOpen={onDrawerOpen}
        rightSlot={<span style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>{consumersList.length} total</span>}
      />
      <MobileSearch value={query} onChange={setQuery} placeholder="Cari nama atau nomor WA…" />
      <div style={{ height: 1, background: '#EEF0F2', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 80px' }}>
        {filtered.length === 0 && <MobileEmpty icon="people" title="Tidak ditemukan" />}
        {filtered.map((k, i) => {
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <button
              key={k.id_konsumen}
              onClick={() => openModal('edit', 'konsumen', k)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid #F3F4F6', background: 'none', textAlign: 'left' }}
            >
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{initials(k.nama_lengkap)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.nama_lengkap}</div>
                <div style={{ fontSize: 12, color: '#9aa0a6', fontFamily: 'monospace', marginTop: 1 }}>{k.nomor_wa}</div>
                {k.provinsi && <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 1 }}>{k.kabupaten_kotamadya || ''}{k.kabupaten_kotamadya && k.provinsi ? ', ' : ''}{k.provinsi}</div>}
              </div>
              <Icon name="chevron_right" size={20} color="#d0d4d8" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
