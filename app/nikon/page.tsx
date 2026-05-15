'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Konfigurasi — isi nomor WA chatbot (tanpa +) ─────────────────
const WA_NUMBER = '62';
const WA_LINK = `https://wa.me/${WA_NUMBER}`;
const WA_CLAIM = `${WA_LINK}?text=Halo%2C%20saya%20ingin%20claim%20promo%20Nikon`;
const WA_GARANSI = `${WA_LINK}?text=Halo%2C%20saya%20ingin%20registrasi%20garansi%20Nikon`;
const WA_SERVICE = `${WA_LINK}?text=Halo%2C%20saya%20ingin%20cek%20status%20service`;

// ── Tipe ─────────────────────────────────────────────────────────
interface NavItem { label: string; href: string; children?: { label: string; href: string }[] }

// ── Data navigasi ────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { label: 'Kamera', href: '#kamera', children: [
    { label: 'Mirrorless', href: '#' },
    { label: 'DSLR', href: '#' },
    { label: 'Kamera Pocket', href: '#' },
  ]},
  { label: 'Lensa', href: '#lensa', children: [
    { label: 'Lensa Nikkor Z', href: '#' },
    { label: 'Lensa Nikkor F', href: '#' },
  ]},
  { label: 'Aksesori', href: '#aksesori', children: [
    { label: 'Flash', href: '#' },
    { label: 'Baterai & Charger', href: '#' },
    { label: 'Tas Kamera', href: '#' },
  ]},
  { label: 'Layanan', href: '#layanan', children: [
    { label: 'Claim Promo', href: WA_CLAIM },
    { label: 'Registrasi Garansi', href: WA_GARANSI },
    { label: 'Status Service', href: WA_SERVICE },
  ]},
  { label: 'Hubungi Kami', href: '#kontak' },
];

// ── Icon SVG kecil ───────────────────────────────────────────────
function IconWA() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
function IconChevron() {
  return (
    <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ── Komponen Navbar ──────────────────────────────────────────────
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black shadow-lg' : 'bg-black/90 backdrop-blur-sm'}`}>
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/nikon" className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-[#FFE500] px-3 py-1 rounded">
              <span className="text-black font-black text-xl tracking-wider">NIKON</span>
            </div>
            <span className="text-white/60 text-sm hidden sm:block">Alta Nikindo</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <a
                  href={item.href}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  {item.label}
                  {item.children && <IconChevron />}
                </a>
                {item.children && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-0 w-52 bg-white shadow-xl rounded-b-lg overflow-hidden border-t-2 border-[#FFE500]">
                    {item.children.map(child => (
                      <a
                        key={child.label}
                        href={child.href}
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors border-b border-gray-100 last:border-0"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <a
              href={WA_LINK}
              className="hidden sm:flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <IconWA /><span className="hidden md:block">WhatsApp</span>
            </a>
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden text-white p-2 hover:bg-white/10 rounded"
            >
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-black border-t border-white/10">
          {NAV_ITEMS.map(item => (
            <div key={item.label}>
              <a href={item.href} className="block px-6 py-3 text-white/80 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">
                {item.label}
              </a>
              {item.children?.map(child => (
                <a key={child.label} href={child.href} className="block pl-10 pr-6 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
                  {child.label}
                </a>
              ))}
            </div>
          ))}
          <div className="px-6 py-4 border-t border-white/10">
            <a href={WA_LINK} className="flex items-center gap-2 text-[#25D366] text-sm font-semibold">
              <IconWA /> Chat via WhatsApp
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero Section ─────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center bg-black overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #FFE500 0%, transparent 50%), radial-gradient(circle at 75% 80%, #ffffff 0%, transparent 40%)' }}
      />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)' }}
      />
      {/* Dekoratif garis kuning */}
      <div className="absolute left-0 top-0 h-full w-1 bg-[#FFE500]" />
      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #FFE500, transparent)' }}
      />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 pt-24 pb-16 w-full">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FFE500]/10 border border-[#FFE500]/30 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#FFE500] animate-pulse" />
            <span className="text-[#FFE500] text-xs font-semibold tracking-widest uppercase">Mitra Resmi Nikon Indonesia</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
            Abadikan Setiap
            <span className="block text-[#FFE500]">Momen Terbaik</span>
            <span className="block">Anda.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-xl leading-relaxed mb-10">
            Alta Nikindo — distributor resmi Nikon Indonesia. Produk orisinal, garansi resmi,
            dan layanan purna jual terpercaya untuk fotografer profesional hingga pemula.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href={WA_CLAIM}
              className="inline-flex items-center gap-2 bg-[#FFE500] hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-full text-base transition-all hover:scale-105 shadow-lg shadow-yellow-500/20"
            >
              Claim Promo Sekarang
            </a>
            <a
              href="#layanan"
              className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white text-white font-semibold px-8 py-4 rounded-full text-base transition-all hover:bg-white/5"
            >
              Lihat Layanan ↓
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-10 mt-16 pt-10 border-t border-white/10">
            {[
              { value: '10+', label: 'Tahun Pengalaman' },
              { value: '50K+', label: 'Kamera Terjual' },
              { value: '100%', label: 'Produk Orisinal' },
              { value: '24/7', label: 'Layanan Chatbot' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl font-black text-[#FFE500]">{s.value}</div>
                <div className="text-sm text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
      </div>
    </section>
  );
}

// ── Announcement bar ─────────────────────────────────────────────
function AnnouncementBar() {
  return (
    <div className="bg-[#FFE500] py-3 px-4">
      <p className="text-center text-black text-sm font-medium">
        🤖 <strong>Chatbot WhatsApp aktif</strong> — Claim promo, registrasi garansi & cek status service kini lebih mudah.{' '}
        <a href={WA_LINK} className="underline font-bold hover:no-underline">Chat sekarang →</a>
      </p>
    </div>
  );
}

// ── Layanan Section ──────────────────────────────────────────────
function LayananSection() {
  const cards = [
    {
      icon: '🎁',
      title: 'Claim Promo',
      desc: 'Ajukan klaim cashback, aksesori gratis, atau voucher belanja untuk pembelian kamera Nikon Anda. Proses cepat dan transparan.',
      cta: 'Ajukan Claim',
      href: WA_CLAIM,
      accent: '#FFE500',
    },
    {
      icon: '🛡️',
      title: 'Registrasi Garansi',
      desc: 'Daftarkan garansi resmi produk Nikon Anda dan nikmati layanan purna jual penuh dari Nikon Pusat Service Jakarta.',
      cta: 'Daftar Garansi',
      href: WA_GARANSI,
      accent: '#FFE500',
    },
    {
      icon: '🔧',
      title: 'Status Service',
      desc: 'Pantau perkembangan service kamera Nikon Anda secara real-time. Kirim nomor tanda terima via WhatsApp, dapatkan update instan.',
      cta: 'Cek Status',
      href: WA_SERVICE,
      accent: '#FFE500',
    },
  ];

  return (
    <section id="layanan" className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-[#FFE500] bg-black inline-block px-3 py-1 mb-4">Layanan Kami</p>
          <h2 className="text-4xl sm:text-5xl font-black text-black leading-tight">
            Semua Kebutuhan Nikon Anda<br />
            <span className="text-gray-400">Dalam Satu Tempat</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="group relative bg-black rounded-2xl overflow-hidden hover:-translate-y-2 transition-all duration-300 shadow-xl hover:shadow-2xl"
            >
              {/* Top accent bar */}
              <div className="h-1 bg-[#FFE500]" />
              <div className="p-8">
                <div className="text-5xl mb-6">{card.icon}</div>
                <h3 className="text-2xl font-black text-white mb-4">{card.title}</h3>
                <p className="text-white/60 leading-relaxed mb-8 text-sm">{card.desc}</p>
                <a
                  href={card.href}
                  className="inline-flex items-center gap-2 bg-[#FFE500] hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-full text-sm transition-all group-hover:scale-105"
                >
                  {card.cta} →
                </a>
              </div>
              {/* Nomor dekoratif */}
              <div className="absolute top-4 right-6 text-white/5 text-8xl font-black select-none">
                {String(i + 1).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Feature Section: split panel ─────────────────────────────────
interface FeatureProps {
  tag: string;
  title: string;
  subtitle: string;
  body: string;
  cta: string;
  href: string;
  imageSlot: React.ReactNode;
  reverse?: boolean;
  dark?: boolean;
}

function FeatureSection({ tag, title, subtitle, body, cta, href, imageSlot, reverse, dark }: FeatureProps) {
  return (
    <section className={`py-24 px-6 ${dark ? 'bg-black' : 'bg-gray-50'}`}>
      <div className={`max-w-7xl mx-auto flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}>
        {/* Text */}
        <div className="flex-1 max-w-xl">
          <span className={`text-xs font-bold tracking-[0.3em] uppercase px-3 py-1 mb-6 inline-block ${dark ? 'bg-[#FFE500] text-black' : 'bg-black text-[#FFE500]'}`}>
            {tag}
          </span>
          <h2 className={`text-4xl sm:text-5xl font-black leading-tight mb-3 ${dark ? 'text-white' : 'text-black'}`}>
            {title}
          </h2>
          <h3 className={`text-xl font-medium mb-6 ${dark ? 'text-[#FFE500]' : 'text-gray-500'}`}>{subtitle}</h3>
          <p className={`leading-relaxed mb-8 text-base ${dark ? 'text-white/60' : 'text-gray-600'}`}>{body}</p>
          <a
            href={href}
            className={`inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm transition-all hover:scale-105 ${
              dark
                ? 'bg-[#FFE500] text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {cta} →
          </a>
        </div>
        {/* Image */}
        <div className="flex-1 w-full">{imageSlot}</div>
      </div>
    </section>
  );
}

// ── Placeholder visual untuk feature section ─────────────────────
function FeatureVisual({ label, bg }: { label: string; bg: string }) {
  return (
    <div className={`relative rounded-3xl overflow-hidden aspect-[4/3] ${bg} flex items-end p-8 shadow-2xl`}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 30%, white, transparent)' }} />
      <div className="relative z-10">
        <p className="text-white/80 text-xs font-mono uppercase tracking-widest mb-2">Alta Nikindo</p>
        <p className="text-white font-black text-2xl">{label}</p>
      </div>
    </div>
  );
}

// ── WA Bot CTA Section ───────────────────────────────────────────
function WACTASection() {
  return (
    <section className="bg-[#FFE500] py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-6xl mb-6">💬</div>
        <h2 className="text-4xl sm:text-5xl font-black text-black leading-tight mb-4">
          Semua Layanan Tersedia<br />via WhatsApp
        </h2>
        <p className="text-black/70 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Chatbot kami siap membantu Anda kapan saja. Cukup kirim pesan dan ikuti panduan dari bot.
          Tidak perlu download aplikasi apapun.
        </p>
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          {['Claim Promo', 'Registrasi Garansi', 'Cek Status Service', 'Tanya CS'].map(f => (
            <div key={f} className="flex items-center gap-2 bg-black/10 rounded-full px-5 py-2.5 text-black text-sm font-semibold">
              <span className="text-green-700">✓</span> {f}
            </div>
          ))}
        </div>
        <a
          href={WA_LINK}
          className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white font-bold px-10 py-5 rounded-full text-lg transition-all hover:scale-105 shadow-xl"
        >
          <IconWA /> Mulai Chat WhatsApp
        </a>
        <p className="text-black/50 text-xs mt-4">
          CS tersedia Senin–Jumat 10.00–16.00 · Sabtu 10.00–12.00 WIB
        </p>
      </div>
    </section>
  );
}

// ── Service Center Section ───────────────────────────────────────
function ServiceCenterSection() {
  return (
    <section className="bg-white py-20 px-6" id="kontak">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase bg-black text-[#FFE500] px-3 py-1 mb-6 inline-block">Service Center</span>
            <h2 className="text-4xl sm:text-5xl font-black text-black leading-tight mb-6">
              Nikon Pusat<br />Service Jakarta
            </h2>
            <div className="space-y-4 mb-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FFE500] flex items-center justify-center flex-shrink-0 text-black font-black">📍</div>
                <div>
                  <p className="font-bold text-black">Alamat</p>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Komplek Mangga Dua Square Blok H, No.1-2<br />
                    Jl. Layang, Ancol, Kec. Pademangan<br />
                    Jakarta Utara, DKI Jakarta 14430
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FFE500] flex items-center justify-center flex-shrink-0 text-black font-black">🕐</div>
                <div>
                  <p className="font-bold text-black">Jam Operasional</p>
                  <p className="text-gray-500 text-sm">Senin – Jumat: 10.00 – 16.00 WIB</p>
                  <p className="text-gray-500 text-sm">Sabtu: 10.00 – 12.00 WIB</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FFE500] flex items-center justify-center flex-shrink-0 text-black font-black">💬</div>
                <div>
                  <p className="font-bold text-black">Chat WhatsApp</p>
                  <a href={WA_LINK} className="text-sm text-blue-600 hover:underline">Klik untuk chat sekarang →</a>
                </div>
              </div>
            </div>
            <a
              href="https://maps.app.goo.gl/ysK9hvkm37bxoYGY9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-black hover:bg-black hover:text-white text-black font-bold px-6 py-3 rounded-full text-sm transition-all"
            >
              📍 Buka di Google Maps
            </a>
          </div>

          {/* Map placeholder */}
          <div className="relative rounded-3xl overflow-hidden bg-gray-100 aspect-[4/3] shadow-2xl">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-2xl">📍</div>
              <p className="font-bold text-gray-700">Mangga Dua Square</p>
              <p className="text-gray-400 text-sm text-center px-8">Jakarta Utara, DKI Jakarta</p>
              <a
                href="https://maps.app.goo.gl/ysK9hvkm37bxoYGY9"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition"
              >
                Lihat Peta
              </a>
            </div>
            {/* Grid dekoratif */}
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────
function Footer() {
  const sections = [
    {
      title: 'Tentang Kami',
      links: [
        { label: 'Profil Alta Nikindo', href: '#' },
        { label: 'Mitra Resmi Nikon', href: '#' },
        { label: 'Dealer Resmi', href: '#' },
      ],
    },
    {
      title: 'Layanan',
      links: [
        { label: 'Claim Promo', href: WA_CLAIM },
        { label: 'Registrasi Garansi', href: WA_GARANSI },
        { label: 'Status Service', href: WA_SERVICE },
        { label: 'Chat CS', href: WA_LINK },
      ],
    },
    {
      title: 'Informasi',
      links: [
        { label: 'Kebijakan Garansi', href: '#' },
        { label: 'Cara Claim Promo', href: '#' },
        { label: 'FAQ', href: '#' },
      ],
    },
    {
      title: 'Ikuti Kami',
      links: [
        { label: 'Instagram', href: '#' },
        { label: 'Facebook', href: '#' },
        { label: 'YouTube', href: '#' },
      ],
    },
  ];

  return (
    <footer className="bg-black text-white pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="bg-[#FFE500] inline-block px-3 py-1 rounded mb-4">
              <span className="text-black font-black text-xl tracking-wider">NIKON</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Alta Nikindo — distributor dan mitra resmi Nikon Indonesia.
            </p>
            <a
              href={WA_LINK}
              className="mt-4 inline-flex items-center gap-2 text-[#25D366] text-sm font-semibold hover:text-green-400 transition-colors"
            >
              <IconWA /> Chat WhatsApp
            </a>
          </div>

          {/* Links */}
          {sections.map(sec => (
            <div key={sec.title}>
              <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-white/40 mb-4">{sec.title}</h4>
              <ul className="space-y-2.5">
                {sec.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-white/60 hover:text-white text-sm transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs">
            © 2026 PT. Alta Nikindo. Seluruh merek dagang Nikon adalah milik Nikon Corporation.
          </p>
          <div className="flex gap-6">
            {['Kebijakan Privasi', 'Syarat & Ketentuan'].map(t => (
              <a key={t} href="#" className="text-white/30 hover:text-white/60 text-xs transition-colors">{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Admin edit link ───────────────────────────────────────────────
function AdminEditLink() {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Link
        href="/admin/homepage"
        className="bg-black/80 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg transition opacity-50 hover:opacity-100 backdrop-blur-sm"
      >
        ✏️ Edit
      </Link>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function NikonPage() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <Navbar />

      <main>
        <HeroSection />
        <AnnouncementBar />
        <LayananSection />

        <FeatureSection
          tag="Claim Promo"
          title="Dapatkan Hadiah dari Pembelian Nikon Anda"
          subtitle="Cashback, aksesori gratis & lebih banyak lagi"
          body="Setiap pembelian kamera atau lensa Nikon resmi di toko rekanan Alta Nikindo berhak mendapatkan promo eksklusif. Proses pengajuan mudah, cukup siapkan nota pembelian dan kartu garansi, lalu chat via WhatsApp."
          cta="Ajukan Claim via WhatsApp"
          href={WA_CLAIM}
          dark
          imageSlot={<FeatureVisual label="Claim Promo Nikon" bg="bg-gradient-to-br from-gray-800 to-gray-900" />}
        />

        <FeatureSection
          tag="Garansi Resmi"
          title="Lindungi Investasi Fotografi Anda"
          subtitle="Garansi resmi Nikon Indonesia"
          body="Registrasikan produk Nikon Anda untuk mendapatkan garansi resmi dan prioritas layanan di Nikon Pusat Service. Cukup satu kali daftar, produk Anda terlindungi penuh."
          cta="Daftar Garansi Sekarang"
          href={WA_GARANSI}
          reverse
          imageSlot={<FeatureVisual label="Garansi Nikon" bg="bg-gradient-to-br from-yellow-900 to-yellow-700" />}
        />

        <WACTASection />
        <ServiceCenterSection />
      </main>

      <Footer />
      <AdminEditLink />
    </div>
  );
}
