'use client';
import React from 'react';
import type { MobileScreen, DrawerItem, BottomTab } from './types';

// ── Material Symbols icon helper ─────────────────────────────────────────────
function Icon({ name, size = 24, color = 'inherit', style = {} }: {
  name: string; size?: number; color?: string; style?: React.CSSProperties;
}) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, color, lineHeight: 1, userSelect: 'none', ...style }}
    >
      {name}
    </span>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const DRAWER_ITEMS: DrawerItem[] = [
  // Utama
  { label: 'Dashboard',      icon: 'dashboard',      screen: 'dashboard',   group: 'Utama' },
  { label: 'Pesan',          icon: 'chat',           screen: 'pesan',       group: 'Utama' },
  { label: 'Konsumen',       icon: 'people',         screen: 'konsumen',    group: 'Utama' },
  // Operasional
  { label: 'Klaim Promo',    icon: 'fact_check',     screen: 'klaim',       group: 'Operasional' },
  { label: 'E-Garansi',      icon: 'verified_user',  screen: 'garansi',     group: 'Operasional' },
  { label: 'Service',        icon: 'build',          screen: 'service',     group: 'Operasional' },
  { label: 'Promo',          icon: 'sell',           screen: 'promo',       group: 'Operasional' },
  { label: 'Peminjaman Aset',icon: 'inventory_2',    screen: 'peminjaman',  group: 'Operasional' },
  // Event & Keuangan
  { label: 'Validasi Bayar', icon: 'payments',       screen: 'bayar',       group: 'Event & Keuangan' },
  // Sistem
  { label: 'Absensi QR',    icon: 'qr_code_scanner', screen: 'absensi',    group: 'Sistem' },
  { label: 'Infrastruktur', icon: 'monitor_heart',   screen: 'infra',      group: 'Sistem' },
];

const BOTTOM_TABS: BottomTab[] = [
  { label: 'Dashboard', icon: 'dashboard',     screen: 'dashboard' },
  { label: 'Pesan',     icon: 'chat',          screen: 'pesan' },
  { label: 'Klaim',     icon: 'fact_check',    screen: 'klaim' },
  { label: 'Garansi',   icon: 'verified_user', screen: 'garansi' },
  { label: 'More',      icon: 'apps',          screen: 'service' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

/** Fixed status bar mimic (32px) */
function StatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{
      height: 32, background: '#1A1A1A', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{time}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Icon name="signal_cellular_alt" size={14} color="#fff" />
        <Icon name="wifi"               size={14} color="#fff" />
        <Icon name="battery_full"       size={14} color="#fff" />
      </div>
    </div>
  );
}

/** Page header */
export function MobileHeader({
  title, subtitle, onMenuOpen, rightSlot,
}: {
  title: string;
  subtitle?: string;
  onMenuOpen: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      height: 56, background: '#1A1A1A', padding: '0 12px', flexShrink: 0,
    }}>
      <button onClick={onMenuOpen} style={{ lineHeight: 0 }}>
        <Icon name="menu" size={26} color="#FFE500" />
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>{title}</div>
        {subtitle && <div style={{ color: '#FFE500', fontSize: 9 }}>{subtitle}</div>}
      </div>
      {rightSlot}
    </div>
  );
}

/** Search bar */
export function MobileSearch({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ padding: '11px 12px 0', background: '#fff', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#F1F3F4', borderRadius: 22, padding: '9px 14px',
      }}>
        <Icon name="search" size={20} color="#9aa0a6" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Cari…'}
          style={{ flex: 1, border: 'none', background: 'none', fontSize: 13, outline: 'none' }}
        />
        {value && (
          <button onClick={() => onChange('')} style={{ lineHeight: 0 }}>
            <Icon name="close" size={18} color="#9aa0a6" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Horizontal filter chips row */
export function ChipsRow({ chips }: {
  chips: Array<{ label: string; active: boolean; color: string; bg: string; border: string; onClick: () => void }>;
}) {
  return (
    <div style={{
      flexShrink: 0, display: 'flex', gap: 7, padding: '11px 12px',
      overflowX: 'auto', background: '#fff', borderBottom: '1px solid #EEF0F2',
    }}>
      {chips.map(ch => (
        <button
          key={ch.label}
          onClick={ch.onClick}
          style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '6px 12px',
            borderRadius: 18, background: ch.bg, color: ch.color,
            border: `1.5px solid ${ch.border}`, whiteSpace: 'nowrap',
          }}
        >
          {ch.label}
        </button>
      ))}
    </div>
  );
}

/** Empty state */
export function MobileEmpty({ icon, title, subtitle }: {
  icon: string; title: string; subtitle?: string;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '50px 20px', textAlign: 'center',
    }}>
      <Icon name={icon} size={48} color="#d0d4d8" />
      <div style={{ fontSize: 13, color: '#80868b', fontWeight: 600, marginTop: 10 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#b0b4b8', marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

/** Round icon button */
export function IconBtn({
  icon, color, border, onClick, label,
}: {
  icon: string; color: string; border: string; onClick: () => void; label?: string;
}) {
  if (label) {
    return (
      <button
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '0 12px', height: 36, borderRadius: 18,
          border: `1.5px solid ${border}`, background: '#fff',
          fontSize: 12, fontWeight: 700, color,
        }}
      >
        <Icon name={icon} size={17} color={color} />
        {label}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `1.5px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff',
      }}
    >
      <Icon name={icon} size={19} color={color} />
    </button>
  );
}

/** FAB (Floating Action Button) */
export function FAB({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute', right: 16, bottom: 88, zIndex: 25,
        height: 50, padding: '0 18px', borderRadius: 25,
        background: '#FFE500', display: 'flex', alignItems: 'center', gap: 7,
        boxShadow: '0 8px 22px rgba(255,229,0,.45)', border: 'none', cursor: 'pointer',
      }}
    >
      <Icon name="add" size={24} color="#1A1A1A" />
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{label}</span>
    </button>
  );
}

// ── Drawer ───────────────────────────────────────────────────────────────────
function Drawer({
  open, onClose, currentScreen, onNavigate, currentUser, onLogout,
}: {
  open: boolean;
  onClose: () => void;
  currentScreen: MobileScreen;
  onNavigate: (s: MobileScreen) => void;
  currentUser: { nama_karyawan: string; role: string } | null;
  onLogout: () => void;
}) {
  const groups = Array.from(new Set(DRAWER_ITEMS.map(i => i.group)));

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            zIndex: 40, backdropFilter: 'blur(2px)',
          }}
        />
      )}
      {/* Drawer panel */}
      <div style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 280,
        background: '#1A1A1A', zIndex: 50, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Header */}
        <div style={{ padding: '44px 20px 20px', borderBottom: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#FFE500',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>
                {(currentUser?.nama_karyawan || 'A')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                {currentUser?.nama_karyawan || 'Admin'}
              </div>
              <div style={{
                fontSize: 11, color: '#FFE500', fontWeight: 600,
                background: 'rgba(255,229,0,.12)', padding: '2px 8px',
                borderRadius: 4, marginTop: 3, display: 'inline-block',
              }}>
                {currentUser?.role || 'Staff'}
              </div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {groups.map(group => (
            <div key={group}>
              <div style={{
                padding: '10px 20px 4px',
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                color: '#5f6368', textTransform: 'uppercase',
              }}>
                {group}
              </div>
              {DRAWER_ITEMS.filter(i => i.group === group).map(item => {
                const active = currentScreen === item.screen;
                return (
                  <button
                    key={item.screen}
                    onClick={() => { onNavigate(item.screen); onClose(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 20px', background: active ? 'rgba(255,229,0,.12)' : 'transparent',
                      borderLeft: active ? '3px solid #FFE500' : '3px solid transparent',
                      cursor: 'pointer', border: 'none', textAlign: 'left',
                    }}
                  >
                    <Icon name={item.icon} size={22} color={active ? '#FFE500' : '#9aa0a6'} />
                    <span style={{
                      fontSize: 14, fontWeight: active ? 700 : 500,
                      color: active ? '#FFE500' : '#e0e0e0',
                    }}>
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span style={{
                        marginLeft: 'auto', background: '#EF4444', color: '#fff',
                        fontSize: 10, fontWeight: 700, borderRadius: 10,
                        padding: '2px 7px', minWidth: 20, textAlign: 'center',
                      }}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div style={{ borderTop: '1px solid #2a2a2a', padding: 16 }}>
          <button
            onClick={onLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,.12)', border: 'none', cursor: 'pointer',
            }}
          >
            <Icon name="logout" size={20} color="#EF4444" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>Keluar</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ── Bottom Navigation ─────────────────────────────────────────────────────────
function BottomNav({
  current, onNavigate,
}: {
  current: MobileScreen;
  onNavigate: (s: MobileScreen) => void;
}) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 64, background: '#fff', borderTop: '1px solid #EEF0F2',
      display: 'flex', alignItems: 'stretch', zIndex: 30,
    }}>
      {BOTTOM_TABS.map(tab => {
        const active = current === tab.screen;
        return (
          <button
            key={tab.screen}
            onClick={() => onNavigate(tab.screen)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              border: 'none', background: 'transparent', cursor: 'pointer',
            }}
          >
            <Icon
              name={tab.icon}
              size={24}
              color={active ? '#FFE500' : '#9aa0a6'}
              style={active ? { filter: 'drop-shadow(0 0 4px rgba(255,229,0,.6))' } : {}}
            />
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? '#1A1A1A' : '#9aa0a6',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Shell export ─────────────────────────────────────────────────────────
export interface MobileShellProps {
  screen: MobileScreen;
  drawerOpen: boolean;
  onDrawerOpen: () => void;
  onDrawerClose: () => void;
  onNavigate: (s: MobileScreen) => void;
  currentUser: { nama_karyawan: string; role: string } | null;
  onLogout: () => void;
  showBottomNav?: boolean;
  children: React.ReactNode;
}

export default function MobileShell({
  screen, drawerOpen, onDrawerOpen, onDrawerClose,
  onNavigate, currentUser, onLogout,
  showBottomNav = true, children,
}: MobileShellProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F5F5F5',
      display: 'flex', flexDirection: 'column', maxWidth: 430,
      margin: '0 auto', overflow: 'hidden', fontFamily: 'system-ui, sans-serif',
    }}>
      <StatusBar />
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {children}
        {showBottomNav && <BottomNav current={screen} onNavigate={onNavigate} />}
      </div>
      <Drawer
        open={drawerOpen}
        onClose={onDrawerClose}
        currentScreen={screen}
        onNavigate={onNavigate}
        currentUser={currentUser}
        onLogout={onLogout}
      />
    </div>
  );
}
