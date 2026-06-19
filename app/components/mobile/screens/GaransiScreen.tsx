'use client';
import React, { useState, useMemo } from 'react';
import type { Garansi } from '@/app/index';
import { STATUS_VALIDASI_GARANSI_OPTIONS, JENIS_GARANSI_OPTIONS, LAMA_GARANSI_OPTIONS } from '@/app/enums';
import { MobileHeader, MobileSearch, ChipsRow, MobileEmpty, IconBtn, FAB } from '../MobileShell';

interface GaransiScreenProps {
  onDrawerOpen: () => void;
  warranties: Garansi[];
  setWarranties: React.Dispatch<React.SetStateAction<Garansi[]>>;
  openModal: (mode: string, type: string, data?: unknown) => void;
  handleDelete: (type: string, id: string) => void;
  openImageViewer: (urlOrFile: string | File) => void;
}

const STATUS_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  'Menunggu':        { fg: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  'Proses Validasi': { fg: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'Valid':           { fg: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  'Tidak Valid':     { fg: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

function Icon({ name, size = 20, color = '#5f6368' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

export default function GaransiScreen({
  onDrawerOpen, warranties, setWarranties, openModal, handleDelete, openImageViewer,
}: GaransiScreenProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Semua');

  const statusKeys = ['Semua', ...STATUS_VALIDASI_GARANSI_OPTIONS.map(o => o.value)];

  const chips = useMemo(() => statusKeys.map(key => {
    const cnt = key === 'Semua' ? warranties.length : warranties.filter(w => w.status_validasi === key).length;
    const active = filter === key;
    const c = STATUS_COLORS[key] || { fg: '#fff', bg: '#1A1A1A', border: '#1A1A1A' };
    return {
      label: `${key} ${cnt}`,
      active,
      color: active ? (key === 'Semua' ? '#fff' : c.fg) : '#5f6368',
      bg: active ? (key === 'Semua' ? '#1A1A1A' : c.bg) : '#F3F4F6',
      border: active ? (key === 'Semua' ? '#1A1A1A' : c.border) : 'transparent',
      onClick: () => setFilter(key),
    };
  }), [warranties, filter]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return warranties.filter(w => {
      const statusOk = filter === 'Semua' || w.status_validasi === filter;
      const searchOk = !q ||
        (w.nomor_seri || '').toLowerCase().includes(q) ||
        (w.tipe_barang || '').toLowerCase().includes(q) ||
        (w.nama_pendaftar || '').toLowerCase().includes(q) ||
        (w.nama_toko || '').toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [warranties, filter, query]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader
        title="E-Garansi"
        subtitle="Data garansi produk"
        onMenuOpen={onDrawerOpen}
        rightSlot={<span style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>{warranties.length} data</span>}
      />
      <MobileSearch value={query} onChange={setQuery} placeholder="Cari nama, serial, toko, produk…" />
      <ChipsRow chips={chips} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && <MobileEmpty icon="verified_user" title="Tidak ditemukan" subtitle="Coba kata kunci atau filter lain" />}
        {filtered.map(w => {
          const sc = STATUS_COLORS[w.status_validasi] || { fg: '#5f6368', bg: '#F3F4F6', border: '#E5E7EB' };
          const jenisColor = w.jenis_garansi === 'Jasa 30%' ? '#D97706' : '#1A1A1A';
          const sisaColor  = w.lama_garansi === '0 Tahun' ? '#DC2626' : '#15803D';
          return (
            <div key={w.id_garansi} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #EEF0F2' }}>
              {/* Top */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{w.nama_pendaftar || '—'}</div>
                  <div style={{ fontSize: 12, color: '#9aa0a6', fontFamily: 'monospace', marginTop: 2 }}>{w.nomor_wa}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {w.status_validasi}
                </span>
              </div>
              {/* Serial + product */}
              <div style={{ background: '#F8F9FA', borderRadius: 10, padding: '11px 13px', marginTop: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', letterSpacing: .5 }}>{w.nomor_seri}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F766E', marginTop: 3 }}>{w.tipe_barang}</div>
              </div>
              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px', marginTop: 13 }}>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 3 }}>Tgl Beli</div><div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{w.tanggal_pembelian || '—'}</div></div>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 3 }}>Toko</div><div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{w.nama_toko || '—'}</div></div>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 3 }}>Jenis</div><div style={{ fontSize: 13, fontWeight: 700, color: jenisColor }}>{w.jenis_garansi || '—'}</div></div>
                <div><div style={{ fontSize: 10, color: '#9aa0a6', marginBottom: 3 }}>Lama</div><div style={{ fontSize: 13, fontWeight: 700, color: sisaColor }}>{w.lama_garansi || '—'}</div></div>
              </div>
              {/* Actions */}
              <div style={{ height: 1, background: '#EEF0F2', margin: '13px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {w.link_nota_pembelian && <IconBtn icon="receipt_long" color="#5f6368" border="#E5E7EB" onClick={() => openImageViewer(w.link_nota_pembelian as string)} />}
                  {w.link_kartu_garansi && <IconBtn icon="verified_user" color="#5f6368" border="#E5E7EB" onClick={() => openImageViewer(w.link_kartu_garansi as string)} />}
                  <IconBtn icon="edit" color="#2563EB" border="#BFDBFE" onClick={() => openModal('edit', 'warranty', w)} />
                  <IconBtn icon="send" color="#16A34A" border="#BBF7D0" onClick={() => alert(`Kirim info garansi ke ${w.nama_pendaftar}`)} />
                  <IconBtn icon="report_problem" label="Masalah" color="#D97706" border="#FDE68A" onClick={() => alert(`Tandai masalah — ${w.nomor_seri}`)} />
                </div>
                <IconBtn icon="delete" color="#DC2626" border="#FECACA" onClick={() => handleDelete('warranty', w.id_garansi!)} />
              </div>
            </div>
          );
        })}
      </div>
      <FAB label="Tambah Garansi" onClick={() => openModal('create', 'warranty')} />
    </div>
  );
}
