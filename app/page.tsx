'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'Tentang Kami', href: '#tentang' },
  { label: 'Layanan', href: '#layanan' },
  { label: 'Produk', href: '/nikon' },
  { label: 'Event', href: '/events/register' },
  { label: 'Kontak', href: '#kontak' },
];

const LAYANAN = [
  {
    icon: '🛡️',
    title: 'Registrasi Garansi',
    desc: 'Daftarkan produk Nikon Anda untuk mendapatkan perlindungan garansi resmi dari Alta Nikindo.',
    href: '/garansi',
    cta: 'Daftar Garansi',
  },
  {
    icon: '🎁',
    title: 'Klaim Promo',
    desc: 'Dapatkan hadiah eksklusif dengan mengklaim promo pembelian produk Nikon Anda.',
    href: '/claim',
    cta: 'Klaim Sekarang',
  },
  {
    icon: '🎟️',
    title: 'Event & Workshop',
    desc: 'Ikuti workshop fotografi, launching produk, dan event eksklusif bersama komunitas Nikon.',
    href: '/events/register',
    cta: 'Lihat Event',
  },
  {
    icon: '💬',
    title: 'Layanan WhatsApp',
    desc: 'Hubungi tim kami langsung via WhatsApp untuk konsultasi produk, servis, dan informasi lainnya.',
    href: 'https://wa.me/6285178092162',
    cta: 'Chat Sekarang',
    external: true,
  },
];

const STATS = [
  { value: '20+', label: 'Tahun Pengalaman' },
  { value: '50K+', label: 'Pelanggan Setia' },
  { value: '100+', label: 'Produk Nikon' },
  { value: '24/7', label: 'Layanan Pelanggan' },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-gray-900 shadow-xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image src="/nikon-logo.svg" alt="Nikon" width={80} height={32} className="h-8 w-auto brightness-0 invert" />
              <span className="text-white font-black text-lg tracking-tight hidden sm:block">Alta Nikindo</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href} className="text-white/80 hover:text-[#FFE500] text-sm font-semibold transition-colors">
                  {l.label}
                </a>
              ))}
              <Link href="/dashboard" className="bg-[#FFE500] text-black text-sm font-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                Login Staff
              </Link>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(o => !o)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="block text-white/80 hover:text-[#FFE500] font-semibold py-1">
                {l.label}
              </a>
            ))}
            <Link href="/dashboard" className="block bg-[#FFE500] text-black text-center font-black px-4 py-2 rounded-lg mt-2">
              Login Staff
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative bg-gray-900 min-h-screen flex items-center overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#FFE500]/5 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#FFE500]/10 border border-[#FFE500]/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-[#FFE500] rounded-full animate-pulse" />
              <span className="text-[#FFE500] text-xs font-bold uppercase tracking-widest">Authorized Nikon Partner</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
              Alta<br />
              <span className="text-[#FFE500]">Nikindo</span>
            </h1>

            <p className="text-gray-300 text-lg sm:text-xl mb-8 max-w-xl leading-relaxed">
              Distributor resmi produk Nikon di Indonesia. Kami menghadirkan kamera, lensa, dan aksesoris terbaik dengan layanan purna jual yang terpercaya.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/nikon" className="bg-[#FFE500] text-black font-black px-8 py-3.5 rounded-xl text-base hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20">
                Jelajahi Produk
              </Link>
              <a href="#layanan" className="border border-white/20 text-white font-bold px-8 py-3.5 rounded-xl text-base hover:bg-white/10 transition-all">
                Lihat Layanan
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-20">
            {STATS.map(s => (
              <div key={s.label} className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur-sm">
                <div className="text-3xl font-black text-[#FFE500] mb-1">{s.value}</div>
                <div className="text-sm text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TENTANG */}
      <section id="tentang" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block bg-[#FFE500] text-black text-xs font-black uppercase tracking-widest px-3 py-1 rounded mb-4">
                Tentang Kami
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight">
                Mitra Resmi Nikon<br />Terpercaya di Indonesia
              </h2>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                PT Alta Nikindo adalah distributor resmi dan authorized dealer Nikon di Indonesia. Dengan pengalaman lebih dari dua dekade, kami berkomitmen menghadirkan produk fotografi berkualitas tinggi beserta layanan purna jual yang profesional.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Kami melayani kebutuhan fotografer profesional maupun penggemar fotografi dari seluruh Indonesia, dengan jaringan dealer yang luas dan tim servis berpengalaman.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-[#FFE500] rounded-full flex items-center justify-center text-xs">✓</span>
                  Garansi Resmi
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-[#FFE500] rounded-full flex items-center justify-center text-xs">✓</span>
                  Produk Original
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-[#FFE500] rounded-full flex items-center justify-center text-xs">✓</span>
                  Service Center Resmi
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-3xl p-10 flex items-center justify-center aspect-square">
              <Image src="/nikon-logo.svg" alt="Alta Nikindo" width={240} height={100} className="brightness-0 invert opacity-80 w-48" />
            </div>
          </div>
        </div>
      </section>

      {/* LAYANAN */}
      <section id="layanan" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#FFE500] text-black text-xs font-black uppercase tracking-widest px-3 py-1 rounded mb-4">
              Layanan
            </div>
            <h2 className="text-4xl font-black text-gray-900">Layanan Kami</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Kami hadir untuk memenuhi semua kebutuhan Anda seputar produk Nikon</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LAYANAN.map(l => (
              <div key={l.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all group">
                <div className="text-4xl mb-4">{l.icon}</div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{l.title}</h3>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">{l.desc}</p>
                {l.external ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-bold text-gray-900 border-b-2 border-[#FFE500] hover:text-[#b8a000] transition-colors">
                    {l.cta} →
                  </a>
                ) : (
                  <Link href={l.href}
                    className="inline-flex items-center gap-1 text-sm font-bold text-gray-900 border-b-2 border-[#FFE500] hover:text-[#b8a000] transition-colors">
                    {l.cta} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black text-white mb-4">
            Miliki Kamera Nikon<br /><span className="text-[#FFE500]">dengan Garansi Resmi</span>
          </h2>
          <p className="text-gray-400 mb-8 text-lg">Daftarkan produk Anda sekarang dan nikmati layanan purna jual terbaik</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/garansi" className="bg-[#FFE500] text-black font-black px-8 py-3.5 rounded-xl hover:bg-yellow-400 transition-all">
              Daftar Garansi
            </Link>
            <Link href="/claim" className="border border-white/30 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all">
              Klaim Promo
            </Link>
          </div>
        </div>
      </section>

      {/* KONTAK */}
      <section id="kontak" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#FFE500] text-black text-xs font-black uppercase tracking-widest px-3 py-1 rounded mb-4">
              Kontak
            </div>
            <h2 className="text-4xl font-black text-gray-900">Hubungi Kami</h2>
            <p className="text-gray-500 mt-3">Kami siap membantu Anda setiap saat</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <a href="https://wa.me/6285178092162" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center text-center p-6 border border-gray-100 rounded-2xl hover:border-[#FFE500] hover:shadow-md transition-all group">
              <span className="text-4xl mb-3">💬</span>
              <span className="font-black text-gray-900 mb-1">WhatsApp</span>
              <span className="text-sm text-gray-500">+62 851-7809-2162</span>
            </a>
            <div className="flex flex-col items-center text-center p-6 border border-gray-100 rounded-2xl">
              <span className="text-4xl mb-3">📍</span>
              <span className="font-black text-gray-900 mb-1">Lokasi</span>
              <span className="text-sm text-gray-500">Jakarta, Indonesia</span>
            </div>
            <div className="flex flex-col items-center text-center p-6 border border-gray-100 rounded-2xl">
              <span className="text-4xl mb-3">🕐</span>
              <span className="font-black text-gray-900 mb-1">Jam Operasional</span>
              <span className="text-sm text-gray-500">Senin – Sabtu<br />09.00 – 18.00 WIB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 border-t border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/nikon-logo.svg" alt="Nikon" width={60} height={24} className="h-6 w-auto brightness-0 invert opacity-60" />
            <span className="text-gray-400 text-sm">© 2026 Alta Nikindo. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/nikon" className="hover:text-white transition-colors">Produk</Link>
            <Link href="/claim" className="hover:text-white transition-colors">Klaim Promo</Link>
            <Link href="/garansi" className="hover:text-white transition-colors">Garansi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
