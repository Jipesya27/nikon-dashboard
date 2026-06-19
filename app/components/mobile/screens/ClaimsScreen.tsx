'use client';
import React, { useState, useMemo } from 'react';
import type { ClaimPromo } from '@/app/index';
import { MobileHeader, MobileSearch, ChipsRow, MobileEmpty, IconBtn, FAB } from '../MobileShell';

interface ClaimsScreenProps {
  onDrawerOpen: () => void;
  claims: ClaimPromo[];
  setClaims: React.Dispatch<React.SetStateAction<ClaimPromo[]>>;
  consumers: Record<string, string>;
  getClaimStatusColor: (c: ClaimPromo) => string;
  getBadgeLabel: (color: string) => string;
  formatTglBeli: (val?: string) => string;
  formatSubmitDate: (createdAt?: string) => string;
  handleKirimStatusClaim: (c: ClaimPromo) => void;
  handlePrintLabelPengiriman: (c: ClaimPromo, n?: number) => void;
  openModal: (mode: string, type: string, data?: unknown) => void;
  handleDelete: (type: string, id: string) => void;
  openImageViewer: (urlOrFile: string | File) => void;
  isGoogleDriveLink: (url: string) => boolean;
  currentUser: { role: string } | null;
}

const WARNA_META: Record<string, { label: string; fg: string; bg: string; border: string; accent: string }> = {
  Semua:  { label: 'Semua',         fg: '#fff',    bg: '#374151', border: '#374151',  accent: '#374151' },
  Putih:  { label: 'Belum Di Cek',  fg: '#4B5563', bg: '#F3F4F6', border: '#D1D5DB',  accent: '#9CA3AF' },
  Merah:  { label: 'Tidak Valid',   fg: '#DC2626', bg: '#FEF2F2', border: '#FECACA',  accent: '#EF4444' },
  Orange: { label: 'Hold',          fg: '#EA580C', bg: '#FFF7ED', border: '#FED7AA',  accent: '#F97316' },
  Biru:   { label: 'Tunggu FA',     fg: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',  accent: '#3B82F6' },
  Pink:   { label: 'Tunggu Resi',   fg: '#DB2777', bg: '#FDF4FF', border: '#F9A8D4',  accent: '#EC4899' },
  Hijau:  { label: 'Selesai',       fg: '#15803D', bg: '#F0FDF4', border: '#BBF7D0',  accent: '#22C55E' },
  Teal:   { label: 'Resi Terkirim', fg: '#0F766E', bg: '#F0FDFA', border: '#99F6E4',  accent: '#14B8A6' },
};

function Icon({ name, size = 20, color = '#5f6368' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

export default function ClaimsScreen({
  onDrawerOpen, claims, setClaims, consumers,
  getClaimStatusColor, getBadgeLabel, formatTglBeli, formatSubmitDate,
  handleKirimStatusClaim, handlePrintLabelPengiriman, openModal, handleDelete,
  openImageViewer, isGoogleDriveLink, currentUser,
}: ClaimsScreenProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const warnaKeys = Object.keys(WARNA_META);

  const chips = useMemo(() => warnaKeys.map(key => {
    const cnt = key === 'Semua' ? claims.length : claims.filter(c => getClaimStatusColor(c) === key).length;
    const active = filter === key;
    const m = WARNA_META[key];
    return {
      label: `${m.label} ${cnt}`,
      active,
      color: active ? m.fg : '#5f6368',
      bg: active ? m.bg : '#F3F4F6',
      border: active ? m.border : 'transparent',
      onClick: () => setFilter(key),
    };
  }), [claims, filter, getClaimStatusColor]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return claims.filter(c => {
      const statusOk = filter === 'Semua' || getClaimStatusColor(c) === filter;
      const name = consumers[c.nomor_wa] || c.nomor_wa;
      const searchOk = !q || name.toLowerCase().includes(q) ||
        (c.nomor_seri || '').includes(q) ||
        (c.nama_toko || '').toLowerCase().includes(q) ||
        (c.tipe_barang || '').toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [claims, filter, query, consumers, getClaimStatusColor]);

  const selectedClaim = selectedId ? claims.find(c => c.id_claim === selectedId) : null;

  // ── Detail view ───────────────────────────────────────────────────────────
  if (selectedClaim) {
    const warna = getClaimStatusColor(selectedClaim);
    const m = WARNA_META[warna] || WARNA_META.Putih;
    const name = consumers[selectedClaim.nomor_wa] || selectedClaim.nomor_wa;
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56, background: '#1A1A1A', padding: '0 12px', flexShrink: 0 }}>
          <button onClick={() => setSelectedId(null)}><Icon name="arrow_back" size={24} color="#FFE500" /></button>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{name}</div>
            <div style={{ color: '#9aa0a6', fontSize: 11 }}>{selectedClaim.nomor_wa}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: m.bg, color: m.fg, border: `1px solid ${m.border}` }}>
            {m.label}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px' }}>
          {/* Fields */}
          {[
            { k: 'Tipe Barang',    v: selectedClaim.tipe_barang },
            { k: 'Nomor Seri',     v: selectedClaim.nomor_seri },
            { k: 'Jenis Promo',    v: selectedClaim.jenis_promosi || '—' },
            { k: 'Nama Toko',      v: selectedClaim.nama_toko || '—' },
            { k: 'Tgl Pembelian',  v: formatTglBeli(selectedClaim.tanggal_pembelian) },
            { k: 'Tgl Submit',     v: formatSubmitDate(selectedClaim.created_at) },
            { k: 'Validasi MKT',   v: selectedClaim.validasi_by_mkt || '—' },
            { k: 'Validasi FA',    v: selectedClaim.validasi_by_fa || '—' },
            { k: 'Catatan MKT',    v: selectedClaim.catatan_mkt || '—' },
            { k: 'Resi',           v: selectedClaim.nomor_resi ? `${selectedClaim.nama_jasa_pengiriman || ''} ${selectedClaim.nomor_resi}` : '—' },
          ].map(row => (
            <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 13, color: '#9aa0a6', fontWeight: 600 }}>{row.k}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', textAlign: 'right', maxWidth: '60%' }}>{row.v}</span>
            </div>
          ))}
          {/* Dokumen */}
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            {selectedClaim.link_nota_pembelian && (
              <button onClick={() => openImageViewer(selectedClaim.link_nota_pembelian as string)}
                style={{ flex: 1, padding: '12px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE', fontSize: 13, fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Icon name="receipt_long" size={18} color="#2563EB" /> Nota
              </button>
            )}
            {selectedClaim.link_kartu_garansi && (
              <button onClick={() => openImageViewer(selectedClaim.link_kartu_garansi as string)}
                style={{ flex: 1, padding: '12px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', fontSize: 13, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Icon name="verified_user" size={18} color="#16A34A" /> Garansi
              </button>
            )}
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button onClick={() => { handleKirimStatusClaim(selectedClaim); }}
              style={{ padding: '14px', background: '#FFE500', borderRadius: 12, fontSize: 15, fontWeight: 800, color: '#1A1A1A', border: 'none' }}>
              Kirim Status ke Konsumen
            </button>
            <button onClick={() => handlePrintLabelPengiriman(selectedClaim)}
              style={{ padding: '14px', background: '#EFF6FF', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#2563EB', border: '1px solid #BFDBFE' }}>
              Cetak Label Pengiriman
            </button>
            {currentUser?.role !== 'Finance' && (
              <button onClick={() => openModal('edit', 'claim', selectedClaim)}
                style={{ padding: '14px', background: '#F3F4F6', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#1A1A1A', border: '1px solid #E5E7EB' }}>
                Edit Data Klaim
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader
        title="Klaim Promo"
        subtitle="Validasi & kelola klaim"
        onMenuOpen={onDrawerOpen}
        rightSlot={<span style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 600 }}>{filtered.length}/{claims.length}</span>}
      />
      <MobileSearch value={query} onChange={setQuery} placeholder="Cari nama, serial, toko…" />
      <ChipsRow chips={chips} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && <MobileEmpty icon="fact_check" title="Tidak ditemukan" subtitle="Coba kata kunci atau filter lain" />}
        {filtered.map(c => {
          const warna = getClaimStatusColor(c);
          const m = WARNA_META[warna] || WARNA_META.Putih;
          const name = consumers[c.nomor_wa] || c.nomor_wa;
          return (
            <div key={c.id_claim} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #EEF0F2', borderLeft: `4px solid ${m.accent}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <button onClick={() => setSelectedId(c.id_claim!)} style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{name}</div>
                  <div style={{ fontSize: 11, color: '#9aa0a6', fontFamily: 'monospace', marginTop: 2 }}>{c.nomor_wa} · SN: {c.nomor_seri}</div>
                </button>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: m.bg, color: m.fg, border: `1px solid ${m.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {m.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: '#5f6368', fontSize: 12 }}>
                <Icon name="inventory_2" size={15} color="#9aa0a6" />
                <span style={{ fontWeight: 600 }}>{c.tipe_barang}</span>
                <span style={{ color: '#d0d4d8' }}>·</span>
                <span>{c.jenis_promosi || '—'}</span>
              </div>
              <div style={{ height: 1, background: '#EEF0F2', margin: '12px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IconBtn icon="receipt_long" color="#2563EB" border="#BFDBFE" onClick={() => c.link_nota_pembelian && openImageViewer(c.link_nota_pembelian as string)} />
                  <IconBtn icon="send" color="#16A34A" border="#BBF7D0" onClick={() => handleKirimStatusClaim(c)} />
                  <IconBtn icon="label" color="#7C3AED" border="#DDD6FE" onClick={() => handlePrintLabelPengiriman(c)} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IconBtn icon="edit" color="#2563EB" border="#BFDBFE" onClick={() => openModal('edit', 'claim', c)} />
                  <IconBtn icon="delete" color="#DC2626" border="#FECACA" onClick={() => handleDelete('claim', c.id_claim!)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <FAB label="Tambah Klaim" onClick={() => openModal('create', 'claim')} />
    </div>
  );
}
