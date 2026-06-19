'use client';
import React, { useState, useMemo } from 'react';
import type { PeminjamanBarang } from '@/app/index';
import { MobileHeader, MobileSearch, ChipsRow, MobileEmpty, IconBtn, FAB } from '../MobileShell';

interface PeminjamanScreenProps {
  onDrawerOpen: () => void;
  lendingRecords: PeminjamanBarang[];
  setLendingRecords: React.Dispatch<React.SetStateAction<PeminjamanBarang[]>>;
  openModal: (mode: string, type: string, data?: unknown) => void;
  handleDelete: (type: string, id: string) => void;
  handlePrintPeminjamanPDF?: (l: PeminjamanBarang) => void;
}

const STATUS_META = {
  aktif:   { label: 'AKTIF',   fg: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', accent: '#F97316' },
  partial: { label: 'PARTIAL', fg: '#CA8A04', bg: '#FEFCE8', border: '#FDE68A', accent: '#EAB308' },
  selesai: { label: 'SELESAI', fg: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', accent: '#22C55E' },
};
const KIRIM_META = {
  menunggu: { label: 'Menunggu', color: '#9aa0a6' },
  dikirim:  { label: 'Dikirim',  color: '#2563EB' },
  terkirim: { label: 'Terkirim', color: '#15803D' },
};

function Icon({ name, size = 20, color = '#5f6368' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function PeminjamanScreen({
  onDrawerOpen, lendingRecords, setLendingRecords,
  openModal, handleDelete, handlePrintPeminjamanPDF,
}: PeminjamanScreenProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('semua');

  const chips = useMemo(() => {
    const counts = { semua: lendingRecords.length, aktif: 0, partial: 0, selesai: 0 };
    lendingRecords.forEach(l => { if (l.status_peminjaman in counts) counts[l.status_peminjaman as keyof typeof counts]++; });
    return (['semua', 'aktif', 'partial', 'selesai'] as const).map(key => {
      const active = filter === key;
      const m = STATUS_META[key as keyof typeof STATUS_META];
      return {
        label: `${key === 'semua' ? 'Semua' : m?.label} ${counts[key]}`,
        active,
        color:  active ? (key === 'semua' ? '#fff' : m?.fg)    : '#5f6368',
        bg:     active ? (key === 'semua' ? '#1A1A1A' : m?.bg)  : '#F3F4F6',
        border: active ? (key === 'semua' ? '#1A1A1A' : m?.border) : 'transparent',
        onClick: () => setFilter(key),
      };
    });
  }, [lendingRecords, filter]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return lendingRecords.filter(l => {
      const statusOk = filter === 'semua' || l.status_peminjaman === filter;
      const itemsText = l.items_dipinjam.map(i => `${i.nama_barang} ${i.nomor_seri}`).join(' ').toLowerCase();
      const searchOk = !q || l.nama_peminjam.toLowerCase().includes(q) ||
        l.nomor_wa_peminjam.includes(q) ||
        (l.kode_peminjaman || '').toLowerCase().includes(q) ||
        itemsText.includes(q);
      return statusOk && searchOk;
    });
  }, [lendingRecords, filter, query]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader
        title="Peminjaman Aset"
        subtitle="Kelola barang pinjaman"
        onMenuOpen={onDrawerOpen}
        rightSlot={<span style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>{lendingRecords.length} data</span>}
      />
      <MobileSearch value={query} onChange={setQuery} placeholder="Cari nama, WA, barang, kode…" />
      <ChipsRow chips={chips} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && <MobileEmpty icon="inventory_2" title="Tidak ditemukan" subtitle="Coba kata kunci atau filter lain" />}
        {filtered.map(l => {
          const m  = STATUS_META[l.status_peminjaman] || STATUS_META.aktif;
          const km = KIRIM_META[l.status_pengiriman || 'menunggu'];
          const estDate = l.tanggal_estimasi_pengembalian ? new Date(l.tanggal_estimasi_pengembalian) : null;
          const overdue = estDate && !l.tanggal_pengembalian && estDate < new Date();
          const returnedCount = l.items_dipinjam.filter(i => i.status_pengembalian === 'dikembalikan').length;
          return (
            <div key={l.id_peminjaman} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #EEF0F2', borderLeft: `4px solid ${overdue ? '#EF4444' : m.accent}` }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{l.nama_peminjam}</div>
                    {l.kode_peminjaman && (
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#6366F1', background: '#EEF2FF', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', letterSpacing: 2 }}>
                        {l.kode_peminjaman}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#9aa0a6', fontFamily: 'monospace', marginTop: 2 }}>{l.nomor_wa_peminjam}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: m.bg, color: m.fg, border: `1px solid ${m.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {m.label}
                </span>
              </div>
              {/* Items */}
              <div style={{ marginTop: 12, background: '#F8F9FA', borderRadius: 10, padding: '11px 13px' }}>
                <div style={{ fontSize: 10, color: '#9aa0a6', fontWeight: 600, marginBottom: 7 }}>
                  BARANG DIPINJAM ({l.items_dipinjam.length}) — {returnedCount} dikembalikan
                </div>
                {l.items_dipinjam.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < l.items_dipinjam.length - 1 ? 6 : 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: it.status_pengembalian === 'dikembalikan' ? '#22C55E' : '#F97316', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{it.nama_barang}</span>
                    <span style={{ fontSize: 11, color: '#9aa0a6', fontFamily: 'monospace' }}>{it.nomor_seri}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: it.status_pengembalian === 'dikembalikan' ? '#15803D' : '#EA580C' }}>
                      {it.status_pengembalian === 'dikembalikan' ? 'Kembali' : 'Dipinjam'}
                    </span>
                  </div>
                ))}
              </div>
              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 2 }}>Tgl Pinjam</div><div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{fmtDate(l.tanggal_peminjaman)}</div></div>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 2 }}>Est. Kembali</div><div style={{ fontSize: 12, fontWeight: 700, color: overdue ? '#DC2626' : '#1A1A1A' }}>{fmtDate(l.tanggal_estimasi_pengembalian)}</div></div>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 2 }}>Pengiriman</div><div style={{ fontSize: 12, fontWeight: 700, color: km.color }}>{km.label}</div></div>
              </div>
              {/* Actions */}
              <div style={{ height: 1, background: '#EEF0F2', margin: '13px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IconBtn icon="edit"              color="#2563EB" border="#BFDBFE" onClick={() => openModal('edit', 'lending', l)} />
                  <IconBtn icon="print"             color="#7C3AED" border="#E9D5FF" onClick={() => handlePrintPeminjamanPDF?.(l)} />
                  <IconBtn icon="assignment_return" label="Kembalikan" color="#15803D" border="#BBF7D0" onClick={() => openModal('return', 'lending', l)} />
                </div>
                <IconBtn icon="delete" color="#DC2626" border="#FECACA" onClick={() => handleDelete('lending', l.id_peminjaman!)} />
              </div>
            </div>
          );
        })}
      </div>
      <FAB label="Pinjam Barang" onClick={() => openModal('create', 'lending')} />
    </div>
  );
}
