'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

const NAV_LINKS = [
  { label: 'Tentang', href: '#tentang' },
  { label: 'Layanan', href: '#layanan' },
  { label: 'Keunggulan', href: '#keunggulan' },
  { label: 'Brand', href: '#brand' },
  { label: 'Kontak', href: '#kontak' },
];

const MILESTONES = [
  { year: '2002', text: 'Didirikan dan ditunjuk sebagai Distributor Resmi Nikon di Indonesia.' },
  { year: '2024', text: 'Memperluas portofolio sebagai distributor resmi produk pendukung fotografi: Athabasca, Visico, Datacolor, dan Somita.' },
];

const SERVICES = [
  {
    no: '01',
    title: 'Distribusi Resmi Produk Nikon',
    desc: 'Official distribution of Nikon products — kamera, lensa, dan aksesoris original bergaransi resmi.',
    icon: '📦',
  },
  {
    no: '02',
    title: 'Penjualan Produk Fotografi',
    desc: 'Penjualan produk fotografi dan pendukungnya dari berbagai brand ternama untuk semua kebutuhan Anda.',
    icon: '📷',
  },
  {
    no: '03',
    title: 'Service Center Resmi',
    desc: 'Layanan purna jual dan perbaikan melalui Nikon Service Center resmi berstandar global.',
    icon: '🔧',
  },
  {
    no: '04',
    title: 'Konsultasi & Dukungan Teknis',
    desc: 'Dukungan teknis dan konsultasi produk oleh tim berpengalaman dan tersertifikasi Nikon.',
    icon: '💬',
  },
];

const ADVANTAGES = [
  {
    icon: '🏆',
    title: 'Distributor Resmi & Berpengalaman',
    desc: 'Lebih dari 20 tahun dipercaya sebagai mitra resmi Nikon di Indonesia sejak 2002.',
  },
  {
    icon: '📚',
    title: 'Portofolio Produk yang Lengkap',
    desc: 'Berbagai pilihan produk untuk kebutuhan fotografi profesional maupun personal dari brand ternama.',
  },
  {
    icon: '⚙️',
    title: 'Service Center Resmi Nikon',
    desc: 'Dedikasi layanan purna jual melalui jaringan layanan global Nikon dengan teknisi bersertifikat.',
  },
  {
    icon: '✅',
    title: 'Komitmen terhadap Kualitas',
    desc: 'Menjamin keaslian produk, standar kualitas, dan pelayanan yang konsisten untuk setiap pelanggan.',
  },
];

const BRANDS = [
  { name: 'Nikon', color: '#FFE500', textColor: '#000' },
  { name: 'datacolor', color: '#fff', textColor: '#c00' },
  { name: 'VISICO', color: '#fff', textColor: '#2a6' },
  { name: 'Athabasca', color: '#fff', textColor: '#1a3a6b' },
  { name: 'SOMITA', color: '#fff', textColor: '#c00' },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans scroll-smooth">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-900/95 backdrop-blur-md shadow-xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="#" className="flex items-center gap-3">
              <Image src="/nikon-logo.svg" alt="Nikon" width={72} height={28} className="h-7 w-auto brightness-0 invert" />
              <div className="hidden sm:block">
                <div className="text-white font-black text-sm leading-none tracking-wide">Alta Nikindo</div>
                <div className="text-[#FFE500] text-[9px] font-semibold tracking-widest uppercase leading-none mt-0.5">Authorized Nikon Partner</div>
              </div>
            </a>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href} className="text-white/70 hover:text-[#FFE500] text-sm font-semibold transition-colors">
                  {l.label}
                </a>
              ))}
              <Link href="/dashboard" className="bg-[#FFE500] text-black text-xs font-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                Staff Login
              </Link>
            </div>

            {/* Mobile button */}
            <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(o => !o)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-zinc-900 border-t border-zinc-800 px-5 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                className="block text-white/80 hover:text-[#FFE500] font-semibold py-1 text-sm">
                {l.label}
              </a>
            ))}
            <Link href="/dashboard" className="block bg-[#FFE500] text-black text-center font-black px-4 py-2 rounded-lg text-sm mt-2">
              Staff Login
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative bg-zinc-900 min-h-screen flex items-center overflow-hidden">
        {/* Background image ambience */}
        <div className="absolute inset-0">
          <Image src="/cp-hero.png" alt="" fill className="object-cover object-center opacity-[0.12]" priority />
        </div>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900/60" />
        {/* Grid pattern */}
        <div className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(rgba(255,229,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,229,0,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Yellow glow */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#FFE500]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FFE500]/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 border border-[#FFE500]/30 bg-[#FFE500]/8 rounded-full px-4 py-1.5 mb-8">
                <span className="w-1.5 h-1.5 bg-[#FFE500] rounded-full animate-pulse" />
                <span className="text-[#FFE500] text-xs font-bold uppercase tracking-widest">Authorized Nikon Distributor & Service Center</span>
              </div>

              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black text-white leading-[1.05] mb-6">
                PT Alta<br />
                <span className="text-[#FFE500]">Nikindo</span>
              </h1>

              <p className="text-gray-400 text-lg leading-relaxed mb-4 max-w-lg">
                Distributor Resmi Nikon & Service Center Resmi Nikon di Indonesia — terpercaya sejak 2002.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-lg">
                Authorized Nikon Distributor & Official Nikon Service Center in Indonesia, appointed directly by Nikon Corporation, Japan.
              </p>

              <div className="flex flex-wrap gap-3">
                <a href="#layanan" className="bg-[#FFE500] text-black font-black px-7 py-3.5 rounded-xl text-sm hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20">
                  Lihat Layanan
                </a>
                <a href="#kontak" className="border border-white/20 text-white font-bold px-7 py-3.5 rounded-xl text-sm hover:bg-white/8 transition-all">
                  Hubungi Kami
                </a>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: '20+', label: 'Tahun Pengalaman', sub: 'Sejak 2002' },
                { val: '5', label: 'Brand Resmi', sub: 'Nikon & lainnya' },
                { val: '100%', label: 'Produk Original', sub: 'Garansi resmi' },
                { val: 'No.1', label: 'Nikon Partner', sub: 'Di Indonesia' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/8 rounded-2xl p-6 hover:border-[#FFE500]/30 transition-colors">
                  <div className="text-3xl font-black text-[#FFE500] mb-1">{s.val}</div>
                  <div className="text-white text-sm font-bold mb-0.5">{s.label}</div>
                  <div className="text-gray-500 text-xs">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
          <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="tentang" className="py-28 bg-white relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/cp-about.png" alt="" fill className="object-cover object-center opacity-[0.04]" />
        </div>
                <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <FadeIn>
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-5">
                Tentang Kami
              </div>
              <h2 className="text-4xl xl:text-5xl font-black text-zinc-900 leading-tight mb-6">
                Mitra Resmi Nikon<br />Terpercaya di Indonesia
              </h2>
              <p className="text-gray-600 leading-relaxed mb-5">
                PT Alta Nikindo adalah perusahaan yang ditunjuk secara resmi oleh Nikon Corporation sebagai <strong>Authorized Nikon Distributor & Official Nikon Service Center di Indonesia</strong>.
              </p>
              <p className="text-gray-600 leading-relaxed mb-5">
                Didirikan pada Agustus 2002, Alta Nikindo telah membangun reputasi yang kuat dalam layanan purna jual profesional dan dedikasi hubungan jangka panjang dengan pelanggan dan mitra bisnis di seluruh Indonesia.
              </p>
              <p className="text-gray-500 leading-relaxed text-sm">
                PT Alta Nikindo is officially appointed by Nikon Corporation, Japan, as an Authorized Nikon Distributor in Indonesia and operates its Nikon Service Centers in full alignment with Nikon's global quality and service standards.
              </p>
            </FadeIn>

            <div className="space-y-5">
              {/* Vision */}
              <FadeIn delay={100}>
                <div className="bg-zinc-900 rounded-2xl p-7 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 bg-[#FFE500] rounded-lg flex items-center justify-center text-black text-sm font-black">V</span>
                    <span className="font-black text-sm uppercase tracking-wider text-[#FFE500]">Visi</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Menjadi distributor dan pusat layanan produk fotografi terkemuka di Indonesia yang dipercaya oleh pelanggan dan mitra internasional.
                  </p>
                  <p className="text-gray-500 text-xs mt-2 leading-relaxed italic">
                    To become a leading and trusted distributor and service center for photographic products in Indonesia.
                  </p>
                </div>
              </FadeIn>

              {/* Mission */}
              <FadeIn delay={200}>
                <div className="bg-[#FFE500] rounded-2xl p-7 text-black">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-[#FFE500] text-sm font-black">M</span>
                    <span className="font-black text-sm uppercase tracking-wider">Misi</span>
                  </div>
                  <ul className="space-y-2 text-sm text-zinc-800">
                    <li className="flex gap-2"><span className="font-black mt-0.5">›</span> Mendistribusikan produk Nikon dengan standar kualitas internasional</li>
                    <li className="flex gap-2"><span className="font-black mt-0.5">›</span> Memberikan layanan purna jual yang profesional dan bersertifikasi</li>
                    <li className="flex gap-2"><span className="font-black mt-0.5">›</span> Mengembangkan hubungan jangka panjang dengan pelanggan dan mitra</li>
                    <li className="flex gap-2"><span className="font-black mt-0.5">›</span> Mengembangkan SDM yang kompeten dan berintegritas tinggi</li>
                  </ul>
                </div>
              </FadeIn>
            </div>
          </div>

          {/* Milestones */}
          <FadeIn delay={150}>
            <div className="mt-20 border-t border-gray-100 pt-14">
              <div className="inline-block bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-8">
                Milestones
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                {MILESTONES.map(m => (
                  <div key={m.year} className="flex gap-5 p-6 border border-gray-100 rounded-2xl hover:border-[#FFE500] hover:shadow-sm transition-all">
                    <div className="text-4xl font-black text-[#FFE500] leading-none shrink-0">{m.year}</div>
                    <p className="text-gray-600 text-sm leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="layanan" className="py-28 bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/cp-services.png" alt="" fill className="object-cover object-center opacity-[0.08]" />
        </div>
        <div className="absolute inset-0 bg-zinc-950/70" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeIn>
            <div className="mb-14">
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-4">
                Layanan
              </div>
              <h2 className="text-4xl xl:text-5xl font-black text-white">Our Services</h2>
              <p className="text-gray-500 mt-3 max-w-lg text-sm leading-relaxed">
                Solusi lengkap untuk semua kebutuhan fotografi Anda — dari distribusi produk hingga layanan purna jual resmi.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((s, i) => (
              <FadeIn key={s.no} delay={i * 80}>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-6 hover:border-[#FFE500]/40 hover:bg-white/8 transition-all group h-full">
                  <div className="text-3xl mb-4">{s.icon}</div>
                  <div className="text-[#FFE500] text-xs font-black tracking-widest mb-2">{s.no}</div>
                  <h3 className="text-white font-black text-base mb-3 leading-tight">{s.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEUNGGULAN ── */}
      <section id="keunggulan" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-4">
                Keunggulan
              </div>
              <h2 className="text-4xl xl:text-5xl font-black text-zinc-900">Company Advantages</h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ADVANTAGES.map((a, i) => (
              <FadeIn key={a.title} delay={i * 80}>
                <div className="text-center p-7 border border-gray-100 rounded-2xl hover:border-[#FFE500] hover:shadow-md transition-all group">
                  <div className="w-14 h-14 bg-[#FFE500]/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 group-hover:bg-[#FFE500]/20 transition-colors">
                    {a.icon}
                  </div>
                  <h3 className="font-black text-zinc-900 text-base mb-3 leading-tight">{a.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{a.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRANDS ── */}
      <section id="brand" className="py-20 bg-zinc-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="inline-block bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-4">
                Brand
              </div>
              <h2 className="text-3xl font-black text-zinc-900">Meet Our Brand</h2>
              <p className="text-gray-500 text-sm mt-2">Brand-brand terpercaya yang kami distribusikan secara resmi di Indonesia</p>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {BRANDS.map(b => (
                <div key={b.name}
                  className="flex items-center justify-center px-8 py-5 rounded-2xl border border-gray-200 bg-white hover:border-[#FFE500] hover:shadow-md transition-all min-w-[140px]"
                  style={{ borderColor: b.name === 'Nikon' ? '#FFE500' : undefined, background: b.name === 'Nikon' ? '#FFE500' : undefined }}>
                  <span className="font-black text-xl" style={{ color: b.textColor }}>
                    {b.name}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── ACTIVITY ── */}
      <section className="py-28 bg-zinc-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/cp-activity.png" alt="" fill className="object-cover object-center opacity-[0.15]" />
        </div>
        <div className="absolute inset-0 bg-zinc-900/75" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-5">
                Aktivitas
              </div>
              <h2 className="text-4xl xl:text-5xl font-black text-white mb-6">Our Activity</h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                Kami senantiasa hadir dalam berbagai kegiatan fotografi — dari launching produk, workshop, dan seminar, hingga kegiatan foto outdoor dan sosial.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 italic">
                We are always present at various photography activities, from new product launches, workshops and seminars to outdoor photography activities and social activities of dealers, communities, campuses and schools.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/events/register" className="bg-[#FFE500] text-black font-black px-6 py-3 rounded-xl text-sm hover:bg-yellow-400 transition-colors">
                  Lihat Event
                </Link>
                <a href="https://wa.me/6285178092162" target="_blank" rel="noopener noreferrer"
                  className="border border-white/20 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/8 transition-all">
                  Hubungi Kami
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <div className="grid grid-cols-3 gap-3">
                {['Workshop Fotografi', 'Product Launch', 'Community Event', 'Hunting Foto', 'Seminar', 'Dealer Event'].map((act, i) => (
                  <div key={i} className={`rounded-xl ${i === 0 || i === 5 ? 'col-span-2' : ''} bg-white/5 border border-white/8 p-4 flex items-end min-h-[90px] hover:border-[#FFE500]/30 transition-colors`}>
                    <span className="text-white/60 text-xs font-semibold">{act}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-[#FFE500]">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <FadeIn>
            <h2 className="text-4xl xl:text-5xl font-black text-black mb-4">
              Butuh Produk atau Layanan Nikon?
            </h2>
            <p className="text-black/60 text-lg mb-8">
              Daftarkan garansi, klaim promo, atau hubungi tim kami untuk konsultasi produk
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/garansi" className="bg-black text-white font-black px-8 py-3.5 rounded-xl text-sm hover:bg-zinc-800 transition-colors">
                Daftar Garansi
              </Link>
              <Link href="/claim" className="bg-white text-black font-black px-8 py-3.5 rounded-xl text-sm hover:bg-gray-100 transition-colors">
                Klaim Promo
              </Link>
              <Link href="/nikon" className="border-2 border-black text-black font-black px-8 py-3.5 rounded-xl text-sm hover:bg-black/8 transition-colors">
                Produk Nikon
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── KONTAK ── */}
      <section id="kontak" className="py-28 bg-white relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/cp-contact.png" alt="" fill className="object-cover object-top opacity-[0.05]" />
        </div>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-4">
                Kontak
              </div>
              <h2 className="text-4xl font-black text-zinc-900">Our Contact</h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <FadeIn delay={0}>
              <a href="https://www.altanikindo.com" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center text-center p-7 border border-gray-100 rounded-2xl hover:border-[#FFE500] hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-[#FFE500]/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-[#FFE500]/20 transition-colors">🌐</div>
                <span className="font-black text-zinc-900 mb-1 text-sm">Website</span>
                <span className="text-xs text-gray-500">www.altanikindo.com</span>
              </a>
            </FadeIn>
            <FadeIn delay={80}>
              <a href="tel:+62215331-2500"
                className="flex flex-col items-center text-center p-7 border border-gray-100 rounded-2xl hover:border-[#FFE500] hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-[#FFE500]/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-[#FFE500]/20 transition-colors">📞</div>
                <span className="font-black text-zinc-900 mb-1 text-sm">Telepon</span>
                <span className="text-xs text-gray-500">+62 5331-2500</span>
              </a>
            </FadeIn>
            <FadeIn delay={160}>
              <div className="flex flex-col items-center text-center p-7 border border-gray-100 rounded-2xl hover:border-[#FFE500] hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-[#FFE500]/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-[#FFE500]/20 transition-colors">📍</div>
                <span className="font-black text-zinc-900 mb-1 text-sm">Alamat</span>
                <span className="text-xs text-gray-500 leading-relaxed">Komplek Mangga Dua Square<br />Blok H No 1–2, Jakarta</span>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-zinc-950 border-t border-zinc-800 py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image src="/nikon-logo.svg" alt="Nikon" width={60} height={24} className="h-6 w-auto brightness-0 invert opacity-50" />
              <div>
                <div className="text-white font-black text-xs">PT Alta Nikindo</div>
                <div className="text-gray-600 text-[10px]">© 2026 All rights reserved.</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-xs text-gray-500">
              <Link href="/nikon" className="hover:text-white transition-colors">Produk Nikon</Link>
              <Link href="/garansi" className="hover:text-white transition-colors">Garansi</Link>
              <Link href="/claim" className="hover:text-white transition-colors">Klaim Promo</Link>
              <Link href="/events/register" className="hover:text-white transition-colors">Event</Link>
              <Link href="/dashboard" className="hover:text-[#FFE500] transition-colors">Staff</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
