'use client';

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import { DEFAULT_NIKON_CONFIG, NikonPageConfig } from '@/app/lib/homepageTypes';

function buildWaLinks(waNumber: string) {
  const base = `https://wa.me/${waNumber}`;
  return {
    WA_LINK:    base,
    WA_CLAIM:   `${base}?text=Halo%2C%20saya%20ingin%20claim%20promo%20Nikon`,
    WA_GARANSI: `${base}?text=Halo%2C%20saya%20ingin%20registrasi%20garansi%20Nikon`,
    WA_SERVICE: `${base}?text=Halo%2C%20saya%20ingin%20cek%20status%20service`,
  };
}

interface SiteCtx {
  cfg: NikonPageConfig;
  WA_LINK: string; WA_CLAIM: string; WA_GARANSI: string; WA_SERVICE: string;
}
const SiteContext = createContext<SiteCtx>({
  cfg: DEFAULT_NIKON_CONFIG,
  ...buildWaLinks(DEFAULT_NIKON_CONFIG.wa_number),
});
const useSite = () => useContext(SiteContext);

interface EventItem {
  id: string;
  event_title: string;
  event_date: string;
  event_price: string;
  event_image?: string;
  event_description?: string;
  event_speaker?: string;
  event_speaker_genre?: string;
  event_payment_tipe: 'regular' | 'deposit';
  event_partisipant_stock: number;
  registered_count: number;
  status?: string;
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
function IconCamera({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconCalendar({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
function IconMenu() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  );
}
function IconCheckCircle() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
function IconGift() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect width="20" height="5" x="2" y="7"/>
      <line x1="12" x2="12" y1="22" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  );
}
function IconWA() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}
function IconTag() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>
      <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}
function IconStore() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>
      <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
    </svg>
  );
}
function IconFileText() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
    </svg>
  );
}

// ── Cek Status Modal ──────────────────────────────────────────────────────────
type ModalType = 'claim' | 'garansi';
interface CekResult {
  id: string; produk: string; nomor_seri: string;
  tgl_beli: string; tgl_daftar: string; label: string; color: string;
  promosi?: string; penerima?: string;
}

const COLOR_MAP: Record<string, string> = {
  green:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  red:    'bg-red-500/15 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  blue:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

function CekStatusModal({ type, onClose }: { type: ModalType; onClose: () => void }) {
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<CekResult[] | null>(null);
  const [errMsg, setErrMsg]     = useState('');
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
    // Close on Escape
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  async function handleCek(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.replace(/[^0-9]/g, '');
    if (p.length < 8) { setErrMsg('Nomor WA minimal 8 digit.'); return; }
    setLoading(true); setErrMsg(''); setResults(null); setNotFound(false);
    try {
      const res  = await fetch(`/api/cek-status?phone=${encodeURIComponent(p)}&type=${type}`);
      const data = await res.json();
      if (!res.ok || data.error) { setErrMsg(data.error || 'Gagal mengambil data.'); return; }
      if (!data.found) { setNotFound(true); return; }
      setResults(data.data);
    } catch {
      setErrMsg('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  function fmtDate(iso: string) {
    if (!iso || iso === '-') return '-';
    try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }

  const title = type === 'claim' ? 'Cek Status Claim' : 'Cek Status Garansi';
  const icon  = type === 'claim'
    ? <IconSearch />
    : <IconShield />;
  const iconColor = type === 'claim' ? 'text-blue-400' : 'text-purple-400';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${type === 'claim' ? 'bg-blue-500/10' : 'bg-purple-500/10'} ${iconColor}`}>
              {icon}
            </div>
            <h3 className="text-white font-bold text-lg">{title}</h3>
          </div>
          <button onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-zinc-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <p className="text-zinc-400 text-sm mb-5">
            Masukkan nomor WhatsApp yang digunakan saat mendaftar.
          </p>

          {/* Input form */}
          <form onSubmit={handleCek} className="flex gap-2 mb-5">
            <div className="flex-1 flex items-center bg-zinc-950 border border-zinc-700 focus-within:border-[#ffe000] transition-colors">
              <span className="px-3 text-zinc-500 text-sm font-mono shrink-0">+62</span>
              <div className="w-px h-6 bg-zinc-700 shrink-0" />
              <input
                ref={inputRef}
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setErrMsg(''); }}
                placeholder="81234567890"
                className="flex-1 bg-transparent text-white text-sm px-3 py-3 outline-none placeholder-zinc-600"
              />
            </div>
            <button type="submit" disabled={loading}
              className="px-5 py-3 bg-[#ffe000] text-black font-bold text-sm uppercase tracking-wider disabled:opacity-50 hover:bg-yellow-400 transition-colors shrink-0 flex items-center gap-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : <IconSearch />}
              {loading ? '' : 'Cek'}
            </button>
          </form>

          {/* Error */}
          {errMsg && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
              </svg>
              {errMsg}
            </div>
          )}

          {/* Not Found */}
          {notFound && (
            <div className="text-center py-8 text-zinc-500">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold text-white mb-1">Data tidak ditemukan</p>
              <p className="text-sm">Nomor ini belum memiliki data {type === 'claim' ? 'claim' : 'garansi'} terdaftar.</p>
            </div>
          )}

          {/* Results */}
          {results && results.length > 0 && (
            <div className="space-y-3">
              <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">
                {results.length} data ditemukan
              </p>
              {results.map((r, i) => (
                <div key={i} className="bg-zinc-950 border border-zinc-800 p-4">
                  {/* Status badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-white font-bold text-sm">{r.produk || '-'}</p>
                      <p className="text-zinc-500 text-xs font-mono mt-0.5">{r.nomor_seri || '-'}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border ${COLOR_MAP[r.color] || COLOR_MAP.yellow}`}>
                      {r.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span>Tgl. Beli: <span className="text-zinc-400">{fmtDate(r.tgl_beli)}</span></span>
                    <span>Tgl. Daftar: <span className="text-zinc-400">{fmtDate(r.tgl_daftar)}</span></span>
                    {r.promosi && r.promosi !== '-' && (
                      <span className="col-span-2">Promo: <span className="text-zinc-400">{r.promosi}</span></span>
                    )}
                    {r.penerima && r.penerima !== '-' && (
                      <span className="col-span-2">Penerima: <span className="text-zinc-400">{r.penerima}</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 shrink-0 flex items-center justify-between">
          <p className="text-zinc-600 text-xs">ID Klaim / Garansi ditampilkan untuk referensi.</p>
          <button onClick={onClose}
            className="text-sm text-zinc-400 hover:text-white transition-colors font-medium">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Consumer Quick Access Section ─────────────────────────────────────────────
function ConsumerAccessSection() {
  const { cfg } = useSite();
  const base    = `https://wa.me/${cfg.wa_number}`;
  const [modalType, setModalType] = useState<ModalType | null>(null);

  // Promo & Dealer: pakai URL dari config, fallback ke WA jika kosong
  const promoHref  = cfg.promo_url  || `${base}?text=Halo%2C%20saya%20ingin%20cek%20promo%20Nikon%20terbaru`;
  const dealerHref = cfg.dealer_url || `${base}?text=Halo%2C%20saya%20ingin%20cek%20dealer%20resmi%20Nikon%20terdekat`;

  const actions = [
    {
      key: 'claim-promo',
      icon: <IconGift />,
      iconColor: 'text-[#ffe000]',
      iconBg: 'bg-[#ffe000]/10 border-[#ffe000]/20',
      badge: 'Ajukan', badgeColor: 'bg-[#ffe000] text-black',
      title: 'Claim Promo',
      desc: 'Ajukan klaim hadiah, cashback, atau aksesori gratis dari pembelian produk Nikon Anda.',
      cta: 'Ajukan Klaim',
      href: '/claim', external: false, modal: null as ModalType | null,
    },
    {
      key: 'form-garansi',
      icon: <IconFileText />,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-400/10 border-emerald-400/20',
      badge: 'Daftar', badgeColor: 'bg-emerald-500 text-white',
      title: 'Isi Form Garansi',
      desc: 'Daftarkan garansi resmi produk Nikon Anda secara online. OCR AI membaca nota otomatis.',
      cta: 'Isi Formulir',
      href: '/garansi', external: false, modal: null as ModalType | null,
    },
    {
      key: 'cek-promo',
      icon: <IconTag />,
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-400/10 border-orange-400/20',
      badge: 'Info', badgeColor: 'bg-orange-500 text-white',
      title: 'Cek Link Promo',
      desc: 'Lihat langsung daftar promo yang sedang berjalan dan link pendaftaran resminya.',
      cta: 'Lihat Promo',
      href: promoHref, external: true, modal: null as ModalType | null,
    },
    {
      key: 'cek-claim',
      icon: <IconSearch />,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-400/10 border-blue-400/20',
      badge: 'Status', badgeColor: 'bg-blue-500 text-white',
      title: 'Cek Status Claim',
      desc: 'Pantau perkembangan klaim promo Anda secara real-time langsung di halaman ini.',
      cta: 'Cek Sekarang',
      href: null, external: false, modal: 'claim' as ModalType,
    },
    {
      key: 'cek-garansi',
      icon: <IconShield />,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-400/10 border-purple-400/20',
      badge: 'Status', badgeColor: 'bg-purple-500 text-white',
      title: 'Cek Status Garansi',
      desc: 'Verifikasi dan pantau status garansi produk Nikon yang sudah Anda daftarkan.',
      cta: 'Cek Sekarang',
      href: null, external: false, modal: 'garansi' as ModalType,
    },
    {
      key: 'cek-dealer',
      icon: <IconStore />,
      iconColor: 'text-teal-400',
      iconBg: 'bg-teal-400/10 border-teal-400/20',
      badge: 'Lokasi', badgeColor: 'bg-teal-500 text-white',
      title: 'Cek Dealer Resmi',
      desc: 'Temukan dealer dan toko resmi Nikon terdekat untuk pembelian produk original bersertifikat.',
      cta: 'Cari Dealer',
      href: dealerHref, external: true, modal: null as ModalType | null,
    },
  ];

  return (
    <>
      {/* Modal */}
      {modalType && (
        <CekStatusModal type={modalType} onClose={() => setModalType(null)} />
      )}

      <section className="py-16 bg-zinc-950 border-b border-zinc-800 relative">
        {/* Yellow top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ffe000] via-[#ffe000]/60 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[#ffe000] text-xs font-bold uppercase tracking-widest px-3 py-1 border border-[#ffe000]/30 bg-[#ffe000]/5">
                Layanan Konsumen
              </span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white text-center">
              Akses Cepat Semua Layanan
            </h2>
          </div>

          {/* 6 cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {actions.map(action => {
              const inner = (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${action.iconBg} ${action.iconColor}`}>
                      {action.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-sm ${action.badgeColor}`}>
                      {action.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#ffe000] transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed flex-grow mb-5">
                    {action.desc}
                  </p>
                  <div className={`flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider group-hover:translate-x-1.5 transition-transform mt-auto ${action.iconColor}`}>
                    {action.cta}
                    <IconChevronRight />
                  </div>
                </>
              );

              const cardClass = 'group flex flex-col bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:-translate-y-1 transition-all duration-200 p-6 min-h-[200px] cursor-pointer text-left w-full';

              if (action.modal) {
                return (
                  <button key={action.key} onClick={() => setModalType(action.modal!)} className={cardClass}>
                    {inner}
                  </button>
                );
              }
              return (
                <a key={action.key} href={action.href!}
                  target={action.external ? '_blank' : undefined}
                  rel={action.external ? 'noopener noreferrer' : undefined}
                  className={cardClass}>
                  {inner}
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

// ── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const { WA_LINK } = useSite();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/nikon" className="flex-shrink-0 flex items-center cursor-pointer">
            <span className="text-3xl font-black tracking-tighter text-white">
              Nikon<span className="text-[#ffe000]">.</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-sm font-semibold text-zinc-300 hover:text-[#ffe000] transition-colors uppercase tracking-wider">Produk</a>
            <a href="#services" className="text-sm font-semibold text-zinc-300 hover:text-[#ffe000] transition-colors uppercase tracking-wider">Layanan & Klaim</a>
            <a href="#events" className="text-sm font-semibold text-zinc-300 hover:text-[#ffe000] transition-colors uppercase tracking-wider">Nikon School</a>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMenuOpen(v => !v)} className="text-zinc-300 hover:text-white p-2">
              <IconMenu />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-800 absolute w-full">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#" className="block px-3 py-4 text-base font-medium text-zinc-300 hover:text-[#ffe000] border-b border-zinc-900">Produk</a>
            <a href="#services" className="block px-3 py-4 text-base font-medium text-zinc-300 hover:text-[#ffe000] border-b border-zinc-900">Layanan & Klaim</a>
            <a href="#events" className="block px-3 py-4 text-base font-medium text-zinc-300 hover:text-[#ffe000] border-b border-zinc-900">Nikon School</a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  const { cfg, WA_CLAIM } = useSite();
  return (
    <section className="relative pt-20 pb-32 flex items-center min-h-[95vh]">
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-nikon.jpg"
          alt="Hero Background"
          className="w-full h-full object-cover opacity-50 grayscale mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-12 md:mt-0">
        <div className="max-w-2xl">
          <span className="inline-block py-1 px-3 border border-[#ffe000] text-[#ffe000] text-xs font-bold uppercase tracking-widest mb-6 bg-zinc-950/50 backdrop-blur-sm">
            Sistem CRM Pintar Terbaru
          </span>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[1.1] mb-6 text-white">
            {cfg.hero_title_1 || 'Unstoppable'}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
              {cfg.hero_title_2 || 'Performance.'}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-lg leading-relaxed">
            {cfg.hero_subtitle || 'Jelajahi batas baru fotografi dan videografi. Daftarkan garansi produk Anda lebih mudah dengan teknologi pemindai AI dari Nikon Indonesia.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="/claim"
              className="bg-[#ffe000] text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 group">
              Claim Promo <span className="group-hover:translate-x-1 transition-transform"><IconChevronRight /></span>
            </a>
            <a href="#services"
              className="bg-transparent border border-zinc-600 text-white px-8 py-4 font-bold uppercase tracking-wider hover:bg-zinc-800 transition-all text-center">
              Layanan Purnajual
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Services Section ──────────────────────────────────────────────────────────
function ServicesSection() {
  const { WA_SERVICE } = useSite();
  const cards = [
    {
      icon: <IconShield />,
      bg: <IconCamera size={120} />,
      title: 'Registrasi Garansi Online',
      desc: 'Daftarkan kamera Z series atau lensa Nikkor Anda. Sistem OCR otomatis membaca Nomor Seri dan tanggal pembelian dari foto struk toko Anda.',
      cta: 'Mulai Registrasi',
      href: '/garansi',
    },
    {
      icon: <IconGift />,
      bg: null,
      title: 'Klaim Promo & Merchandise',
      desc: 'Ajukan klaim hadiah eksklusif langsung dari form online ini. Status pengiriman hadiah diperbarui secara real-time oleh tim kami.',
      cta: 'Ajukan Klaim Sekarang',
      href: '/claim',
    },
    {
      icon: <IconCheckCircle />,
      bg: null,
      title: 'Lacak Status Klaim',
      desc: 'Pantau seluruh riwayat klaim garansi atau servis Anda. Sistem kami akan mengirimkan notifikasi otomatis saat status berubah.',
      cta: 'Cek Status Claim',
      href: '/claim',
    },
  ];

  return (
    <section id="services" className="py-24 bg-zinc-900 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-white">
            Layanan Cerdas Nikon
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Kami mendesain ulang cara Anda mendaftarkan garansi dan klaim promosi. Cukup unggah foto nota Anda, sistem OCR AI kami akan memproses sisanya secara otomatis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map(card => (
            <a key={card.title} href={card.href}
              className="bg-zinc-950 p-8 border border-zinc-800 hover:border-[#ffe000] hover:-translate-y-2 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col h-full">
              {card.bg && (
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-white">
                  {card.bg}
                </div>
              )}
              <div className="text-[#ffe000] mb-6 bg-zinc-900/50 w-14 h-14 flex items-center justify-center rounded-full">
                {card.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{card.title}</h3>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed flex-grow">{card.desc}</p>
              <div className="flex items-center text-[#ffe000] text-sm font-bold uppercase tracking-wider group-hover:translate-x-2 transition-transform mt-auto">
                {card.cta} <IconChevronRight />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Events Section ────────────────────────────────────────────────────────────
function EventsSection() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events/register')
      .then(r => r.json())
      .then(d => setEvents((d.events || []).filter((e: EventItem) => e.status !== 'close' && e.status !== 'Out of stock')))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="events" className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-zinc-800 pb-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-3 text-white">
              Nikon School & Event
            </h2>
            <p className="text-zinc-400 text-lg">Tingkatkan skill fotografi Anda dan bergabunglah dengan komunitas.</p>
          </div>
          <a href="/events/register"
            className="hidden md:block border border-zinc-600 text-white px-6 py-3 font-bold uppercase tracking-wider text-sm hover:bg-zinc-800 transition-colors">
            Lihat Semua Jadwal
          </a>
        </div>

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[1, 2].map(i => (
              <div key={i} className="bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800 animate-pulse flex flex-col md:flex-row">
                <div className="md:w-2/5 h-64 md:h-auto bg-zinc-800" />
                <div className="p-6 md:w-3/5 space-y-3">
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  <div className="h-6 bg-zinc-800 rounded w-3/4" />
                  <div className="h-4 bg-zinc-800 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              {
                badge: 'Masterclass',
                badgeBg: 'bg-[#ffe000] text-black',
                img: 'https://images.unsplash.com/photo-1552168324-d612d77725e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                date: '24 Mei 2026 • Jakarta',
                title: 'Wildlife Photography Expedition',
                desc: 'Eksplorasi teknik menangkap momen satwa liar dengan ketajaman tingkat tinggi menggunakan ekosistem lensa Nikkor Z.',
                cta: 'Dapatkan Tiket (QR Code)',
              },
              {
                badge: 'Photo Walk',
                badgeBg: 'bg-white text-black',
                img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                date: '02 Juni 2026 • Bandung',
                title: 'Urban Street dengan Nikon Zfc',
                desc: 'Jelajahi sudut kota dengan gaya klasik modern. Hands-on langsung kamera Zfc terbaru bersama komunitas.',
                cta: 'Daftar Sekarang',
              },
            ].map(ev => (
              <div key={ev.title}
                className="group cursor-pointer bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors flex flex-col md:flex-row">
                <div className="relative md:w-2/5 h-64 md:h-auto overflow-hidden">
                  <span className={`absolute top-4 left-4 ${ev.badgeBg} text-[10px] font-bold px-3 py-1 z-10 uppercase tracking-widest`}>
                    {ev.badge}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ev.img} alt={ev.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 grayscale hover:grayscale-0" />
                </div>
                <div className="p-6 md:w-3/5 flex flex-col justify-center">
                  <div className="flex items-center text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 gap-2">
                    <IconCalendar size={14} /> {ev.date}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 leading-tight group-hover:text-[#ffe000] transition-colors text-white">
                    {ev.title}
                  </h3>
                  <p className="text-zinc-400 text-sm mb-6 line-clamp-2">{ev.desc}</p>
                  <span className="text-[#ffe000] font-bold text-sm uppercase tracking-wider flex items-center gap-1 mt-auto">
                    {ev.cta} <IconChevronRight />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {events.slice(0, 4).map(ev => {
              const slots = ev.event_partisipant_stock - (ev.registered_count || 0);
              const isFull = slots <= 0;
              return (
                <a key={ev.id} href="/events/register"
                  className="group cursor-pointer bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors flex flex-col md:flex-row">
                  <div className="relative md:w-2/5 h-64 md:h-auto overflow-hidden">
                    <span className="absolute top-4 left-4 bg-[#ffe000] text-black text-[10px] font-bold px-3 py-1 z-10 uppercase tracking-widest">
                      {ev.event_speaker_genre || 'Event'}
                    </span>
                    {ev.event_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.event_image} alt={ev.event_title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 grayscale hover:grayscale-0" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <span className="text-5xl">📸</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6 md:w-3/5 flex flex-col justify-center">
                    <div className="flex items-center text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 gap-2">
                      <IconCalendar size={14} /> {ev.event_date}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 leading-tight group-hover:text-[#ffe000] transition-colors text-white line-clamp-2">
                      {ev.event_title}
                    </h3>
                    {ev.event_description && (
                      <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{ev.event_description}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[#ffe000] font-bold text-sm uppercase tracking-wider flex items-center gap-1">
                        {isFull ? 'Kuota Penuh' : 'Daftar Sekarang'} <IconChevronRight />
                      </span>
                      {!isFull && (
                        <span className="text-xs text-zinc-500">{slots} tempat tersisa</span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <a href="/events/register"
          className="md:hidden w-full mt-8 border border-zinc-600 text-white px-6 py-4 font-bold uppercase tracking-wider text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center">
          Lihat Semua Jadwal
        </a>
      </div>
    </section>
  );
}

// ── WA CTA ────────────────────────────────────────────────────────────────────
function WACTASection() {
  const { WA_LINK } = useSite();
  return (
    <section className="py-20 px-6 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4 uppercase tracking-tighter">
          Semua Layanan Tersedia<br />
          <span className="text-[#ffe000]">via WhatsApp</span>
        </h2>
        <p className="text-zinc-400 text-base max-w-xl mx-auto mb-10 leading-relaxed">
          Chatbot kami siap membantu kapan saja. Tidak perlu download aplikasi — cukup kirim pesan dan ikuti panduan dari bot.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['Claim Promo', 'Registrasi Garansi', 'Cek Status Service', 'Tanya CS'].map(f => (
            <div key={f}
              className="flex items-center gap-2 rounded-sm px-5 py-2 text-sm font-medium border border-zinc-700 bg-zinc-950 text-zinc-300">
              <span className="text-[#ffe000]">✓</span> {f}
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const btn = document.querySelector<HTMLButtonElement>('button[aria-label="Chat layanan Nikon"]');
            btn?.click();
          }}
          className="inline-flex items-center gap-3 font-bold px-10 py-5 text-lg transition-all hover:bg-yellow-400 text-black bg-[#ffe000]">
          Mulai Chat di Website
        </button>
        <p className="text-zinc-600 text-xs mt-4">CS tersedia Senin–Jumat 10.00–16.00 · Sabtu 10.00–12.00 WIB</p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const { WA_LINK, WA_CLAIM, WA_GARANSI, WA_SERVICE } = useSite();
  return (
    <footer className="bg-black pt-16 pb-8 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="text-3xl font-black tracking-tighter mb-4 text-white">
              Nikon<span className="text-[#ffe000]">.</span>
            </div>
            <p className="text-zinc-500 text-sm max-w-sm mb-6 leading-relaxed">
              Mendukung para kreator, fotografer, dan videografer profesional dengan teknologi optik revolusioner. Distributor resmi Nikon Indonesia.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-sm">Layanan</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="/garansi" className="hover:text-[#ffe000] transition-colors">Registrasi Garansi</a></li>
              <li><a href="/claim" className="hover:text-[#ffe000] transition-colors">Klaim Promo</a></li>
              <li><a href="/claim" className="hover:text-[#ffe000] transition-colors">Cek Status Servis</a></li>
              <li><a href="/events/register" className="hover:text-[#ffe000] transition-colors">Jadwal Event</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-sm">Perusahaan</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-[#ffe000] transition-colors">Tentang Kami</a></li>
              <li><a href="#" className="hover:text-[#ffe000] transition-colors">Hubungi Kami</a></li>
              <li><a href="#" className="hover:text-[#ffe000] transition-colors">Syarat & Ketentuan</a></li>
              <li><a href="#" className="hover:text-[#ffe000] transition-colors">Kebijakan Privasi</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-zinc-600 font-medium">
          <p>© 2026 PT. Alta Nikindo. Seluruh merek dagang Nikon adalah milik Nikon Corporation.</p>
          <p className="mt-2 md:mt-0">Sistem CRM Terintegrasi dengan OCR AI</p>
        </div>
      </div>
    </footer>
  );
}

// ── Web Chat Widget ───────────────────────────────────────────────────────────
interface ChatMsg { role: 'user' | 'bot'; text: string; ts: number }

function formatBotText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*[^*]+\*|https?:\/\/[^\s]+)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <strong key={j}>{part.slice(1, -1)}</strong>;
      }
      if (part.startsWith('http')) {
        return (
          <a key={j} href={part} target="_blank" rel="noopener noreferrer"
            className="text-[#ffe000] underline break-all">
            {part}
          </a>
        );
      }
      return part;
    });
    return <span key={i}>{rendered}{i < lines.length - 1 && <br />}</span>;
  });
}

function WebChatWidget() {
  const { WA_LINK } = useSite();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const welcomeSent = useRef(false);

  useEffect(() => {
    let sid = sessionStorage.getItem('nikon_chat_sid');
    if (!sid) {
      sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      sessionStorage.setItem('nikon_chat_sid', sid);
    }
    setSessionId(sid);
    const saved = sessionStorage.getItem('nikon_chat_msgs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) { setMessages(parsed); welcomeSent.current = true; }
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) {
      sessionStorage.setItem('nikon_chat_msgs', JSON.stringify(messages.slice(-60)));
    }
  }, [messages]);

  useEffect(() => {
    if (open && sessionId && !welcomeSent.current) {
      welcomeSent.current = true;
      doSend('MENU', false);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  async function doSend(text: string, showUser: boolean) {
    if (showUser) setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
    setTyping(true);
    try {
      const res = await fetch('/api/chat-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.reply || 'Ketik MENU untuk memulai.', ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Koneksi bermasalah. Silakan coba lagi atau gunakan WhatsApp.', ts: Date.now() }]);
    } finally {
      setTyping(false);
    }
  }

  function send(text: string) {
    const t = text.trim();
    if (!t || typing || !sessionId) return;
    setInput('');
    doSend(t, true);
  }

  const quickReplies = [
    { label: '🏠 Menu', value: 'MENU' },
    { label: 'Claim Promo', value: '1' },
    { label: 'Cek Claim', value: '2' },
    { label: 'Daftar Garansi', value: '3' },
    { label: 'Cek Garansi', value: '4' },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] max-w-[22rem] bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '32rem' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#ffe000] flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <div className="text-white text-sm font-bold leading-none">Nikon CS</div>
                <div className="text-zinc-400 text-xs flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/> Bot Online
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
            {messages.length === 0 && !typing && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 bg-[#ffe000] flex items-center justify-center mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-white text-sm font-semibold mb-1">Halo! Ada yang bisa kami bantu?</p>
                <p className="text-zinc-500 text-xs">Ketik pesan atau pilih menu di bawah</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#ffe000] text-black font-medium rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
                }`}>
                  {msg.role === 'bot' ? formatBotText(msg.text) : msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 px-4 py-3 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick reply chips */}
          <div className="px-3 py-2 border-t border-zinc-800/50 flex gap-1.5 overflow-x-auto shrink-0"
            style={{ scrollbarWidth: 'none' }}>
            {quickReplies.map(q => (
              <button key={q.value} onClick={() => send(q.value)} disabled={typing}
                className="flex-shrink-0 text-xs px-2.5 py-1 border border-zinc-700 text-zinc-400 hover:border-[#ffe000] hover:text-[#ffe000] disabled:opacity-40 transition-colors whitespace-nowrap">
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={e => { e.preventDefault(); send(input); }}
            className="px-3 py-3 border-t border-zinc-800 flex gap-2 shrink-0">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ketik pesan atau nomor menu..."
              className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2 outline-none focus:border-[#ffe000] placeholder-zinc-600 min-w-0"
              disabled={typing}/>
            <button type="submit" disabled={typing || !input.trim()}
              className="px-3 py-2 bg-[#ffe000] text-black disabled:opacity-40 hover:bg-yellow-400 transition-colors shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating toggle button */}
      <button onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-4 sm:right-6 z-[60] w-14 h-14 bg-[#ffe000] text-black flex items-center justify-center shadow-lg hover:bg-yellow-400 transition-all hover:scale-105 active:scale-95"
        aria-label="Chat layanan Nikon">
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NikonPage() {
  const [cfg, setCfg] = useState<NikonPageConfig>(DEFAULT_NIKON_CONFIG);

  useEffect(() => {
    fetch('/api/nikon-config')
      .then(r => r.json())
      .then(d => { if (d.config) setCfg(d.config); })
      .catch(() => {});
  }, []);

  const waLinks = buildWaLinks(cfg.wa_number);
  const ctxValue: SiteCtx = { cfg, ...waLinks };

  return (
    <SiteContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-zinc-950 text-white font-sans antialiased" style={{ scrollbarColor: '#3f3f46 #09090b' }}>
        <Navbar />
        <main>
          <HeroSection />
          <ConsumerAccessSection />
          <ServicesSection />
          <EventsSection />
          <WACTASection />
        </main>
        <Footer />
        <WebChatWidget />
      </div>
    </SiteContext.Provider>
  );
}
