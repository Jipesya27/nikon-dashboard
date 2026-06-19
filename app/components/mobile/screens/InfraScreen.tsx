'use client';
import React, { useState, useEffect } from 'react';
import { MobileHeader } from '../MobileShell';

interface InfraMetrics { cpu: number; ram: number; disk: number; uptime: string; }
interface InfraScreenProps {
  onDrawerOpen: () => void;
}

function Icon({ name, size = 20, color = '#5f6368' }: { name: string; size?: number; color?: string }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, color, lineHeight: 1 }}>{name}</span>;
}

function GaugeBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5f6368' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4, transition: 'width .6s' }} />
      </div>
    </div>
  );
}

export default function InfraScreen({ onDrawerOpen }: InfraScreenProps) {
  const [metrics, setMetrics] = useState<InfraMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/infrastruktur');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMetrics(); }, []);

  const cpuColor  = (metrics?.cpu || 0)  > 80 ? '#DC2626' : (metrics?.cpu || 0)  > 60 ? '#D97706' : '#16A34A';
  const ramColor  = (metrics?.ram || 0)  > 80 ? '#DC2626' : (metrics?.ram || 0)  > 60 ? '#D97706' : '#2563EB';
  const diskColor = (metrics?.disk || 0) > 80 ? '#DC2626' : (metrics?.disk || 0) > 60 ? '#D97706' : '#7C3AED';

  const services = [
    { name: 'Database', ok: true },
    { name: 'WhatsApp Bot', ok: true },
    { name: 'Google Drive', ok: true },
    { name: 'Supabase', ok: true },
    { name: 'Cloudflare Tunnel', ok: true },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader
        title="Infrastruktur"
        subtitle="Monitor server STB"
        onMenuOpen={onDrawerOpen}
        rightSlot={
          <button onClick={fetchMetrics} style={{ lineHeight: 0, background: 'none', border: 'none' }}>
            <Icon name="refresh" size={22} color={loading ? '#FFE500' : '#9aa0a6'} />
          </button>
        }
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Metrics card */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #EEF0F2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>Penggunaan Sistem</span>
            {lastUpdated && <span style={{ fontSize: 11, color: '#9aa0a6' }}>{lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
          {metrics ? (
            <>
              <GaugeBar label="CPU" value={metrics.cpu} color={cpuColor} />
              <GaugeBar label="RAM" value={metrics.ram} color={ramColor} />
              <GaugeBar label="Disk" value={metrics.disk} color={diskColor} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, padding: '10px 12px', background: '#F8F9FA', borderRadius: 10 }}>
                <Icon name="schedule" size={16} color="#9aa0a6" />
                <span style={{ fontSize: 13, color: '#5f6368', fontWeight: 600 }}>Uptime: {metrics.uptime}</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9aa0a6', fontSize: 13 }}>
              {loading ? 'Memuat data…' : 'Tidak dapat terhubung ke server'}
            </div>
          )}
        </div>
        {/* Services */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #EEF0F2' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 14 }}>Status Layanan</div>
          {services.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{s.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.ok ? '#22C55E' : '#EF4444' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: s.ok ? '#16A34A' : '#DC2626' }}>{s.ok ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
