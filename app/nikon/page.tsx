'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Konfigurasi ──────────────────────────────────────────────────
const WA_NUMBER = '62';
const WA_LINK   = `https://wa.me/${WA_NUMBER}`;
const WA_CLAIM  = `${WA_LINK}?text=Halo%2C%20saya%20ingin%20claim%20promo%20Nikon`;
const WA_GARANSI = `${WA_LINK}?text=Halo%2C%20saya%20ingin%20registrasi%20garansi%20Nikon`;
const WA_SERVICE = `${WA_LINK}?text=Halo%2C%20saya%20ingin%20cek%20status%20service`;

// ── Palette warna soft ───────────────────────────────────────────
// hero bg   : #1e293b  (slate-800, tidak hitam pekat)
// accent    : #d4a017  (gold muted)
// surface   : #f8fafc  (slate-50, off-white)
// text utama: #0f172a  (slate-900)
// text soft : #64748b  (slate-500)
// border    : #e2e8f0  (slate-200)

// ── Tipe ─────────────────────────────────────────────────────────
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

// ── Parse tanggal Indonesia ───────────────────────────────────────
const ID_MONTHS: Record<string, number> = {
  januari:0, februari:1, maret:2, april:3, mei:4, juni:5,
  juli:6, agustus:7, september:8, oktober:9, november:10, desember:11,
};
function parseIdDate(str: string): Date | null {
  if (!str) return null;
  const p = str.trim().toLowerCase().split(/\s+/);
  if (p.length < 3) return null;
  const d = parseInt(p[0]), m = ID_MONTHS[p[1]], y = parseInt(p[2]);
  return (isNaN(d) || m === undefined || isNaN(y)) ? null : new Date(y, m, d);
}
function daysUntil(dateStr: string): number | null {
  const d = parseIdDate(dateStr);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

// ── SVG Icons ────────────────────────────────────────────────────
function IconWA() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
function IconChevron({ className = 'w-3 h-3' }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
}

// ── Navbar ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Kamera',   href: '#', children: ['Mirrorless', 'DSLR', 'Kamera Pocket'] },
  { label: 'Lensa',    href: '#', children: ['Lensa Nikkor Z', 'Lensa Nikkor F'] },
  { label: 'Aksesori', href: '#', children: ['Flash', 'Baterai & Charger', 'Tas Kamera'] },
  { label: 'Layanan',  href: '#layanan', children: ['Claim Promo', 'Registrasi Garansi', 'Status Service'] },
  { label: 'Event',    href: '#event' },
  { label: 'Kontak',   href: '#kontak' },
];

function Navbar() {
  const [mobile, setMobile] = useState(false);
  const [drop, setDrop]     = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900 shadow-lg shadow-black/10' : 'bg-slate-900/95 backdrop-blur-md'}`}>
      <div className="max-w-7xl mx-auto px-5 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/nikon" className="flex items-center gap-3 flex-shrink-0">
          <div className="bg-[#d4a017] px-3 py-1 rounded-sm">
            <span className="text-white font-black text-lg tracking-widest">NIKON</span>
          </div>
          <span className="text-slate-400 text-sm hidden sm:block font-medium">Alta Nikindo</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center">
          {NAV_ITEMS.map(item => (
            <div key={item.label} className="relative"
              onMouseEnter={() => setDrop(item.label)}
              onMouseLeave={() => setDrop(null)}>
              <a href={item.href}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors rounded-md hover:bg-white/5">
                {item.label}
                {item.children && <IconChevron />}
              </a>
              {item.children && drop === item.label && (
                <div className="absolute top-full left-0 w-52 bg-white rounded-b-xl shadow-xl shadow-black/10 border-t-2 border-[#d4a017] overflow-hidden">
                  {item.children.map(c => (
                    <a key={c} href="#"
                      className="block px-5 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                      {c}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* WA + hamburger */}
        <div className="flex items-center gap-3">
          <a href={WA_LINK}
            className="hidden sm:flex items-center gap-2 bg-[#25D366]/90 hover:bg-[#25D366] text-white text-sm font-semibold px-4 py-2 rounded-full transition-all">
            <IconWA /><span className="hidden md:block">WhatsApp</span>
          </a>
          <button onClick={() => setMobile(v => !v)} className="lg:hidden text-slate-300 hover:text-white p-2 rounded-md hover:bg-white/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {mobile
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobile && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-700/50">
          {NAV_ITEMS.map(item => (
            <div key={item.label}>
              <a href={item.href} className="block px-6 py-3 text-slate-300 hover:text-white text-sm font-medium transition-colors">{item.label}</a>
              {item.children?.map(c => (
                <a key={c} href="#" className="block pl-10 pr-6 py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">{c}</a>
              ))}
            </div>
          ))}
          <div className="px-6 py-4 border-t border-slate-700/50">
            <a href={WA_LINK} className="flex items-center gap-2 text-[#25D366] text-sm font-semibold"><IconWA /> Chat WhatsApp</a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #1e1b4b 100%)' }}>
      {/* Soft glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #d4a017, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
      </div>
      {/* Garis dekoratif halus */}
      <div className="absolute left-0 top-0 h-full w-0.5 opacity-40"
        style={{ background: 'linear-gradient(to bottom, transparent, #d4a017, transparent)' }} />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 pt-28 pb-20 w-full">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
            style={{ background: 'rgba(212,160,23,0.1)', borderColor: 'rgba(212,160,23,0.3)' }}>
            <div className="w-2 h-2 rounded-full bg-[#d4a017] animate-pulse" />
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#d4a017' }}>Mitra Resmi Nikon Indonesia</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-6 text-white">
            Abadikan Setiap
            <span className="block" style={{ color: '#d4a017' }}>Momen Terbaik</span>
            <span className="block text-slate-300">Anda.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed mb-10">
            Alta Nikindo — distributor resmi Nikon Indonesia. Produk orisinal, garansi resmi,
            dan layanan purna jual terpercaya untuk fotografer profesional hingga pemula.
          </p>

          <div className="flex flex-wrap gap-4">
            <a href={WA_CLAIM}
              className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-base transition-all hover:scale-105 text-slate-900 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #d4a017, #f0c040)', boxShadow: '0 8px 24px rgba(212,160,23,0.3)' }}>
              Claim Promo Sekarang
            </a>
            <a href="#layanan"
              className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:bg-white/5">
              Lihat Layanan ↓
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-10 mt-16 pt-10 border-t border-slate-700/50">
            {[
              { value: '10+', label: 'Tahun Pengalaman' },
              { value: '50K+', label: 'Kamera Terjual' },
              { value: '100%', label: 'Produk Orisinal' },
              { value: '24/7', label: 'Layanan Chatbot' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl font-black" style={{ color: '#d4a017' }}>{s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-slate-600 to-transparent" />
      </div>
    </section>
  );
}

// ── Announcement ─────────────────────────────────────────────────
function AnnouncementBar() {
  return (
    <div style={{ background: 'linear-gradient(90deg, #1e293b, #0f172a)' }} className="py-3 px-4 border-b border-slate-700/50">
      <p className="text-center text-sm" style={{ color: '#94a3b8' }}>
        🤖 <span className="text-white font-medium">Chatbot WhatsApp aktif</span> — Claim promo, garansi & cek service via WA.{' '}
        <a href={WA_LINK} className="underline font-semibold hover:no-underline" style={{ color: '#d4a017' }}>Chat sekarang →</a>
      </p>
    </div>
  );
}

// ── Layanan ──────────────────────────────────────────────────────
function LayananSection() {
  const cards = [
    { icon: '🎁', title: 'Claim Promo', desc: 'Ajukan klaim cashback, aksesori gratis, atau voucher untuk pembelian kamera Nikon Anda. Proses mudah dan transparan.', cta: 'Ajukan Claim', href: WA_CLAIM },
    { icon: '🛡️', title: 'Registrasi Garansi', desc: 'Daftarkan garansi resmi produk Nikon Anda dan nikmati layanan purna jual dari Nikon Pusat Service Jakarta.', cta: 'Daftar Garansi', href: WA_GARANSI },
    { icon: '🔧', title: 'Status Service', desc: 'Pantau perkembangan service kamera Nikon Anda secara real-time. Kirim nomor tanda terima via WhatsApp.', cta: 'Cek Status', href: WA_SERVICE },
  ];

  return (
    <section id="layanan" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.3em] uppercase px-3 py-1 rounded-full"
            style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017' }}>
            Layanan Kami
          </span>
          <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-3" style={{ color: '#0f172a' }}>
            Semua Kebutuhan Nikon Anda
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">Dalam satu tempat, mudah, dan cepat lewat WhatsApp.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((c, i) => (
            <div key={c.title}
              className="group rounded-2xl p-8 border border-slate-100 hover:border-[#d4a017]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#d4a017]/5 bg-white relative overflow-hidden">
              {/* Accent strip */}
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(90deg, #d4a017, #f0c040)' }} />
              {/* Nomor dekoratif */}
              <div className="absolute top-4 right-6 text-8xl font-black select-none"
                style={{ color: 'rgba(212,160,23,0.06)' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="text-5xl mb-5">{c.icon}</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#0f172a' }}>{c.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">{c.desc}</p>
              <a href={c.href}
                className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full transition-all"
                style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'linear-gradient(135deg,#d4a017,#f0c040)'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(212,160,23,0.1)'; (e.currentTarget as HTMLAnchorElement).style.color = '#d4a017'; }}>
                {c.cta} →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Event Section ─────────────────────────────────────────────────
function EventSection() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events/register')
      .then(r => r.json())
      .then(d => setEvents((d.events || []).filter((e: EventItem) => e.status !== 'close' && e.status !== 'Out of stock')))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && events.length === 0) return null;

  return (
    <section id="event" className="py-24 px-6" style={{ background: '#f8fafc' }}>
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
          <div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase px-3 py-1 rounded-full"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
              Event &amp; Workshop
            </span>
            <h2 className="text-4xl sm:text-5xl font-black mt-4" style={{ color: '#0f172a' }}>
              Event Mendatang
            </h2>
            <p className="text-slate-500 mt-2">Workshop, seminar, dan acara fotografi bersama Nikon.</p>
          </div>
          <a href="/events/register"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full border transition-all hover:bg-slate-900 hover:text-white flex-shrink-0"
            style={{ borderColor: '#1e293b', color: '#1e293b' }}>
            Semua Event →
          </a>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-200" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.slice(0, 6).map(ev => {
              const days  = daysUntil(ev.event_date);
              const slots = ev.event_partisipant_stock - (ev.registered_count || 0);
              const isFull = slots <= 0;
              const isDeposit = ev.event_payment_tipe === 'deposit';

              return (
                <div key={ev.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                  {/* Image / placeholder */}
                  <div className="relative h-48 overflow-hidden">
                    {ev.event_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.event_image} alt={ev.event_title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #1e1b4b)' }}>
                        <span className="text-5xl">📸</span>
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                      {isDeposit && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 text-indigo-600">Deposit</span>
                      )}
                      {days !== null && days >= 0 && days <= 7 && !isFull && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500 text-white">
                          {days === 0 ? 'Hari ini!' : `${days}h lagi`}
                        </span>
                      )}
                      {isFull && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800/80 text-white">Penuh</span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    {/* Genre & speaker */}
                    {(ev.event_speaker_genre || ev.event_speaker) && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {ev.event_speaker_genre && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                            {ev.event_speaker_genre}
                          </span>
                        )}
                        {ev.event_speaker && (
                          <span className="text-xs text-slate-400">oleh {ev.event_speaker}</span>
                        )}
                      </div>
                    )}

                    <h3 className="font-bold text-lg leading-snug mb-2 line-clamp-2" style={{ color: '#0f172a' }}>
                      {ev.event_title}
                    </h3>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                      <span>📅</span> {ev.event_date}
                    </div>

                    {/* Slot */}
                    <div className="flex items-center gap-1.5 text-sm mb-4" style={{ color: isFull ? '#ef4444' : '#22c55e' }}>
                      <span>{isFull ? '🔴' : '🟢'}</span>
                      <span>{isFull ? 'Kuota penuh' : `${slots} tempat tersisa`}</span>
                    </div>

                    {/* Description */}
                    {ev.event_description && (
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-5 flex-1">
                        {ev.event_description}
                      </p>
                    )}

                    {/* Price + CTA */}
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">{isDeposit ? 'Deposit' : 'Harga'}</p>
                        <p className="font-black text-base" style={{ color: '#d4a017' }}>
                          {ev.event_price === '0' || ev.event_price === '' ? 'Gratis' : `Rp ${parseInt(ev.event_price || '0').toLocaleString('id-ID')}`}
                        </p>
                      </div>
                      <a href="/events/register"
                        className={`text-sm font-bold px-5 py-2.5 rounded-full transition-all ${
                          isFull
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'text-white hover:scale-105'
                        }`}
                        style={isFull ? {} : { background: 'linear-gradient(135deg, #1e293b, #1e1b4b)', boxShadow: '0 4px 14px rgba(30,41,59,0.3)' }}
                        onClick={isFull ? e => e.preventDefault() : undefined}>
                        {isFull ? 'Penuh' : 'Daftar'}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA lihat semua */}
        {!loading && events.length > 3 && (
          <div className="text-center mt-12">
            <a href="/events/register"
              className="inline-flex items-center gap-2 font-bold text-sm px-8 py-4 rounded-full border-2 transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900"
              style={{ borderColor: '#1e293b', color: '#1e293b' }}>
              Lihat Semua Event ({events.length}) →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Feature Section ───────────────────────────────────────────────
function FeatureSection({ tag, title, subtitle, body, cta, href, visual, reverse }: {
  tag: string; title: string; subtitle: string; body: string; cta: string; href: string;
  visual: React.ReactNode; reverse?: boolean;
}) {
  return (
    <section className="py-24 px-6 bg-white">
      <div className={`max-w-7xl mx-auto flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}>
        <div className="flex-1 max-w-xl">
          <span className="text-xs font-bold tracking-[0.3em] uppercase px-3 py-1 rounded-full mb-6 inline-block"
            style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017' }}>
            {tag}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-3" style={{ color: '#0f172a' }}>{title}</h2>
          <h3 className="text-lg font-medium mb-6" style={{ color: '#64748b' }}>{subtitle}</h3>
          <p className="leading-relaxed mb-8 text-slate-500">{body}</p>
          <a href={href}
            className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm transition-all hover:scale-105 text-white"
            style={{ background: 'linear-gradient(135deg, #1e293b, #1e1b4b)', boxShadow: '0 8px 24px rgba(30,41,59,0.2)' }}>
            {cta} →
          </a>
        </div>
        <div className="flex-1 w-full">{visual}</div>
      </div>
    </section>
  );
}

function FeatureVisual({ label, gradient }: { label: string; gradient: string }) {
  return (
    <div className={`relative rounded-3xl overflow-hidden aspect-[4/3] flex items-end p-8 shadow-xl ${gradient}`}>
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.4), transparent 60%)' }} />
      <div className="relative z-10">
        <p className="text-white/60 text-xs font-mono uppercase tracking-widest mb-1">Alta Nikindo</p>
        <p className="text-white font-black text-2xl">{label}</p>
      </div>
    </div>
  );
}

// ── WA CTA ───────────────────────────────────────────────────────
function WACTASection() {
  return (
    <section style={{ background: 'linear-gradient(135deg, #1e293b 0%, #1e1b4b 100%)' }} className="py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-5xl mb-5">💬</div>
        <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
          Semua Layanan Tersedia<br />
          <span style={{ color: '#d4a017' }}>via WhatsApp</span>
        </h2>
        <p className="text-slate-400 text-base max-w-xl mx-auto mb-10 leading-relaxed">
          Chatbot kami siap membantu kapan saja. Tidak perlu download aplikasi — cukup kirim pesan dan ikuti panduan dari bot.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['Claim Promo', 'Registrasi Garansi', 'Cek Status Service', 'Tanya CS'].map(f => (
            <div key={f}
              className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium border"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
              <span style={{ color: '#22c55e' }}>✓</span> {f}
            </div>
          ))}
        </div>
        <a href={WA_LINK}
          className="inline-flex items-center gap-3 font-bold px-10 py-5 rounded-full text-lg transition-all hover:scale-105 text-white"
          style={{ background: '#25D366', boxShadow: '0 8px 32px rgba(37,211,102,0.3)' }}>
          <IconWA /> Mulai Chat WhatsApp
        </a>
        <p className="text-slate-600 text-xs mt-4">CS tersedia Senin–Jumat 10.00–16.00 · Sabtu 10.00–12.00 WIB</p>
      </div>
    </section>
  );
}

// ── Service Center ────────────────────────────────────────────────
function ServiceCenterSection() {
  return (
    <section id="kontak" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase px-3 py-1 rounded-full mb-6 inline-block"
              style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017' }}>
              Service Center
            </span>
            <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-8" style={{ color: '#0f172a' }}>
              Nikon Pusat<br />Service Jakarta
            </h2>
            <div className="space-y-5 mb-8">
              {[
                { icon: '📍', title: 'Alamat', body: 'Komplek Mangga Dua Square Blok H, No.1-2\nJl. Layang, Ancol, Kec. Pademangan\nJakarta Utara, DKI Jakarta 14430' },
                { icon: '🕐', title: 'Jam Operasional', body: 'Senin – Jumat: 10.00 – 16.00 WIB\nSabtu: 10.00 – 12.00 WIB' },
              ].map(item => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: 'rgba(212,160,23,0.1)' }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-0.5" style={{ color: '#0f172a' }}>{item.title}</p>
                    <p className="text-slate-500 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="https://maps.app.goo.gl/ysK9hvkm37bxoYGY9" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-full border-2 transition-all hover:-translate-y-0.5"
                style={{ borderColor: '#1e293b', color: '#1e293b' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#1e293b'; el.style.color = '#fff'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = ''; el.style.color = '#1e293b'; }}>
                📍 Google Maps
              </a>
              <a href={WA_LINK}
                className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-full text-white transition-all hover:-translate-y-0.5"
                style={{ background: '#25D366' }}>
                <IconWA /> WhatsApp
              </a>
            </div>
          </div>

          {/* Map placeholder */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] border border-slate-100 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg bg-white">📍</div>
              <p className="font-bold" style={{ color: '#0f172a' }}>Mangga Dua Square</p>
              <p className="text-slate-400 text-sm text-center px-8">Jakarta Utara, DKI Jakarta</p>
              <a href="https://maps.app.goo.gl/ysK9hvkm37bxoYGY9" target="_blank" rel="noopener noreferrer"
                className="text-white text-xs font-bold px-5 py-2 rounded-full transition hover:-translate-y-0.5"
                style={{ background: '#1e293b' }}>
                Buka Peta
              </a>
            </div>
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'linear-gradient(#64748b 1px,transparent 1px),linear-gradient(90deg,#64748b 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────
function Footer() {
  const sections = [
    { title: 'Tentang Kami', links: [{ l: 'Profil Alta Nikindo', h: '#' }, { l: 'Mitra Resmi Nikon', h: '#' }, { l: 'Dealer Resmi', h: '#' }] },
    { title: 'Layanan',      links: [{ l: 'Claim Promo', h: WA_CLAIM }, { l: 'Registrasi Garansi', h: WA_GARANSI }, { l: 'Status Service', h: WA_SERVICE }, { l: 'Chat CS', h: WA_LINK }] },
    { title: 'Event',        links: [{ l: 'Jadwal Event', h: '/events/register' }, { l: 'Daftar Workshop', h: '/events/register' }] },
    { title: 'Informasi',    links: [{ l: 'Kebijakan Garansi', h: '#' }, { l: 'Cara Claim', h: '#' }, { l: 'FAQ', h: '#' }] },
  ];

  return (
    <footer style={{ background: '#0f172a' }} className="pt-16 pb-8 px-6 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="inline-block px-3 py-1 rounded-sm mb-4" style={{ background: '#d4a017' }}>
              <span className="text-white font-black text-lg tracking-widest">NIKON</span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#475569' }}>
              Alta Nikindo — distributor dan mitra resmi Nikon Indonesia.
            </p>
            <a href={WA_LINK} className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-green-300" style={{ color: '#4ade80' }}>
              <IconWA /> Chat WhatsApp
            </a>
          </div>
          {sections.map(sec => (
            <div key={sec.title}>
              <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: '#475569' }}>{sec.title}</h4>
              <ul className="space-y-2.5">
                {sec.links.map(l => (
                  <li key={l.l}>
                    <a href={l.h} className="text-sm transition-colors hover:text-white" style={{ color: '#64748b' }}>{l.l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: '#1e293b' }}>
          <p className="text-xs" style={{ color: '#334155' }}>
            © 2026 PT. Alta Nikindo. Seluruh merek dagang Nikon adalah milik Nikon Corporation.
          </p>
          <div className="flex gap-6">
            {['Kebijakan Privasi', 'Syarat & Ketentuan'].map(t => (
              <a key={t} href="#" className="text-xs transition-colors hover:text-slate-300" style={{ color: '#334155' }}>{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function NikonPage() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <Navbar />
      <main>
        <HeroSection />
        <AnnouncementBar />
        <LayananSection />
        <EventSection />
        <FeatureSection
          tag="Claim Promo"
          title="Dapatkan Hadiah dari Pembelian Nikon Anda"
          subtitle="Cashback, aksesori gratis & lebih banyak lagi"
          body="Setiap pembelian kamera atau lensa Nikon resmi di toko rekanan Alta Nikindo berhak mendapatkan promo eksklusif. Siapkan nota pembelian dan kartu garansi, lalu chat via WhatsApp."
          cta="Ajukan Claim via WhatsApp"
          href={WA_CLAIM}
          visual={<FeatureVisual label="Claim Promo Nikon" gradient="bg-gradient-to-br from-slate-700 to-slate-900" />}
        />
        <FeatureSection
          tag="Garansi Resmi"
          title="Lindungi Investasi Fotografi Anda"
          subtitle="Garansi resmi Nikon Indonesia"
          body="Registrasikan produk Nikon Anda untuk mendapatkan garansi resmi dan prioritas layanan di Nikon Pusat Service. Cukup satu kali daftar, produk Anda terlindungi penuh."
          cta="Daftar Garansi Sekarang"
          href={WA_GARANSI}
          reverse
          visual={<FeatureVisual label="Garansi Nikon" gradient="bg-gradient-to-br from-amber-800 to-amber-900" />}
        />
        <WACTASection />
        <ServiceCenterSection />
      </main>
      <Footer />
      <div className="fixed bottom-5 right-5 z-50">
        <Link href="/admin/homepage"
          className="text-xs font-bold px-3 py-2 rounded-lg shadow-lg transition opacity-40 hover:opacity-100 backdrop-blur-sm text-white"
          style={{ background: 'rgba(15,23,42,0.8)' }}>
          ✏️ Edit
        </Link>
      </div>
    </div>
  );
}
