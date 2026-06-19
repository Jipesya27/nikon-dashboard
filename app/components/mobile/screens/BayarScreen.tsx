'use client';
import React from 'react';
import { MobileHeader, MobileEmpty } from '../MobileShell';

interface BayarScreenProps {
  onDrawerOpen: () => void;
  // Pass in your payments/event registrations that need validation
  pendingPayments?: Array<{
    id: string; nama: string; event: string; nominal: string;
    tipe: 'deposit' | 'regular'; buktiUrl?: string;
  }>;
  onTerima?: (id: string) => void;
  onTolak?: (id: string) => void;
}

function Icon({ name, size = 20, color = '#5f6368' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

export default function BayarScreen({ onDrawerOpen, pendingPayments = [], onTerima, onTolak }: BayarScreenProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader title="Validasi Pembayaran" subtitle="Konfirmasi transfer event" onMenuOpen={onDrawerOpen} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px' }}>
        {pendingPayments.length === 0 && (
          <MobileEmpty icon="payments" title="Tidak ada pembayaran menunggu" subtitle="Semua sudah divalidasi" />
        )}
        {pendingPayments.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, border: '1px solid #EEF0F2', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{p.nama}</div>
                <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 2 }}>{p.event}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: p.tipe === 'deposit' ? '#FEF3C7' : '#E0E7FF', color: p.tipe === 'deposit' ? '#B45309' : '#3730A3', whiteSpace: 'nowrap' }}>
                {p.tipe === 'deposit' ? 'Deposit' : 'Regular'}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', margin: '10px 0 4px' }}>{p.nominal}</div>
            {p.buktiUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16A34A', fontWeight: 600, marginBottom: 12 }}>
                <Icon name="attachment" size={16} color="#16A34A" /> Bukti transfer terlampir
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => onTolak?.(p.id)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #FECACA', background: '#fff', fontSize: 14, fontWeight: 700, color: '#DC2626' }}>Tolak</button>
              <button onClick={() => onTerima?.(p.id)} style={{ flex: 2, padding: '11px', borderRadius: 10, background: '#FFE500', border: 'none', fontSize: 14, fontWeight: 800, color: '#1A1A1A' }}>Terima Pembayaran</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
