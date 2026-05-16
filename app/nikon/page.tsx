'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
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
            <a href={WA_LINK}
              className="hidden sm:flex items-center gap-2 bg-[#25D366]/90 hover:bg-[#25D366] text-white text-sm font-semibold px-4 py-2 rounded-full transition-all">
              <IconWA /><span>WhatsApp</span>
            </a>
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
            <div className="px-3 py-4">
              <a href={WA_LINK} className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white px-6 py-3 font-bold uppercase tracking-wider text-sm">
                <IconWA /> Chat WhatsApp
              </a>
            </div>
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
          src="https://images.unsplash.com/photo-1516961642265-531546e84af2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
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
            <a href={WA_CLAIM}
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
      desc: 'Pantau seluruh riwayat klaim garansi atau servis Anda. Sistem kami akan mengirimkan notifikasi otomatis ke WhatsApp Anda saat status berubah.',
      cta: 'Cek Status via WA',
      href: WA_SERVICE,
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
        <a href={WA_LINK}
          className="inline-flex items-center gap-3 font-bold px-10 py-5 text-lg transition-all hover:bg-[#20bb58] text-white bg-[#25D366]"
          style={{ boxShadow: '0 8px 32px rgba(37,211,102,0.3)' }}>
          <IconWA /> Mulai Chat WhatsApp
        </a>
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
            <a href={WA_LINK}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#25D366] hover:text-green-300 transition-colors">
              <IconWA /> Chat WhatsApp
            </a>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-sm">Layanan</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href={WA_GARANSI} className="hover:text-[#ffe000] transition-colors">Registrasi Garansi</a></li>
              <li><a href={WA_CLAIM} className="hover:text-[#ffe000] transition-colors">Klaim Promo</a></li>
              <li><a href={WA_SERVICE} className="hover:text-[#ffe000] transition-colors">Cek Status Servis</a></li>
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
          <ServicesSection />
          <EventsSection />
          <WACTASection />
        </main>
        <Footer />
        <div className="fixed bottom-5 right-5 z-50">
          <Link href="/admin/homepage"
            className="text-xs font-bold px-3 py-2 shadow-lg transition opacity-40 hover:opacity-100 text-white bg-zinc-900/80 backdrop-blur-sm border border-zinc-700">
            ✏️ Edit
          </Link>
        </div>
      </div>
    </SiteContext.Provider>
  );
}
