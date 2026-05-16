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
  { no: '01', title: 'Distribusi Resmi Produk Nikon', desc: 'Official distribution of Nikon products — kamera, lensa, dan aksesoris original bergaransi resmi.', icon: '📦' },
  { no: '02', title: 'Penjualan Produk Fotografi', desc: 'Penjualan produk fotografi dan pendukungnya dari berbagai brand ternama untuk semua kebutuhan Anda.', icon: '📷' },
  { no: '03', title: 'Service Center Resmi', desc: 'Layanan purna jual dan perbaikan melalui Nikon Service Center resmi berstandar global.', icon: '🔧' },
  { no: '04', title: 'Konsultasi & Dukungan Teknis', desc: 'Dukungan teknis dan konsultasi produk oleh tim berpengalaman dan tersertifikasi Nikon.', icon: '💬' },
];

const ADVANTAGES = [
  { icon: '🏆', title: 'Distributor Resmi & Berpengalaman', desc: 'Lebih dari 20 tahun dipercaya sebagai mitra resmi Nikon di Indonesia sejak 2002.' },
  { icon: '📚', title: 'Portofolio Produk yang Lengkap', desc: 'Berbagai pilihan produk untuk kebutuhan fotografi profesional maupun personal.' },
  { icon: '⚙️', title: 'Service Center Resmi Nikon', desc: 'Dedikasi layanan purna jual melalui jaringan layanan global Nikon dengan teknisi bersertifikat.' },
  { icon: '✅', title: 'Komitmen terhadap Kualitas', desc: 'Menjamin keaslian produk, standar kualitas, dan pelayanan yang konsisten.' },
];

const BRANDS = [
  { name: 'Nikon', textColor: '#000', bg: '#FFE500' },
  { name: 'datacolor', textColor: '#c00', bg: '#fff' },
  { name: 'VISICO', textColor: '#1a7a3a', bg: '#fff' },
  { name: 'Athabasca', textColor: '#1a3a6b', bg: '#fff' },
  { name: 'SOMITA', textColor: '#c00', bg: '#fff' },
];

function useInView(threshold = 0.12) {
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
      transform: inView ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
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
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-900/96 backdrop-blur-md shadow-2xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#" className="flex items-center gap-2">
              <Image src="/ALTA_baru.png" alt="Alta Nikindo" width={120} height={40} className="h-10 w-auto object-contain" />
            </a>
            <div className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href} className="text-white/70 hover:text-[#FFE500] text-sm font-semibold transition-colors">{l.label}</a>
              ))}
              <Link href="/dashboard" className="bg-[#FFE500] text-black text-xs font-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                Staff Login
              </Link>
            </div>
            <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(o => !o)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-zinc-900 border-t border-zinc-800 px-5 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="block text-white/80 hover:text-[#FFE500] font-semibold py-1 text-sm">{l.label}</a>
            ))}
            <Link href="/dashboard" className="block bg-[#FFE500] text-black text-center font-black px-4 py-2 rounded-lg text-sm mt-2">Staff Login</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative bg-zinc-900 min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/cp-hero.png" alt="" fill className="object-cover object-center opacity-25" priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/85 to-zinc-900/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-zinc-900/60" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-[#FFE500]/40 bg-[#FFE500]/10 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 bg-[#FFE500] rounded-full animate-pulse" />
              <span className="text-[#FFE500] text-xs font-bold uppercase tracking-widest">Authorized Nikon Distributor & Service Center</span>
            </div>
            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black text-white leading-[1.05] mb-6">
              PT Alta<br /><span className="text-[#FFE500]">Nikindo</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed mb-3 max-w-xl">
              Distributor Resmi Nikon & Service Center Resmi Nikon di Indonesia — terpercaya sejak 2002.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed mb-10 max-w-xl">
              Authorized Nikon Distributor & Official Nikon Service Center in Indonesia, appointed directly by Nikon Corporation, Japan.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#layanan" className="bg-[#FFE500] text-black font-black px-7 py-3.5 rounded-xl text-sm hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20">
                Lihat Layanan
              </a>
              <a href="#kontak" className="border border-white/25 text-white font-bold px-7 py-3.5 rounded-xl text-sm hover:bg-white/10 transition-all">
                Hubungi Kami
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20">
            {[
              { val: '20+', label: 'Tahun Pengalaman', sub: 'Sejak 2002' },
              { val: '5', label: 'Brand Resmi', sub: 'Nikon & lainnya' },
              { val: '100%', label: 'Produk Original', sub: 'Garansi resmi' },
              { val: 'No.1', label: 'Nikon Partner', sub: 'Di Indonesia' },
            ].map(s => (
              <div key={s.label} className="bg-white/8 border border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:border-[#FFE500]/30 transition-colors">
                <div className="text-3xl font-black text-[#FFE500] mb-1">{s.val}</div>
                <div className="text-white text-sm font-bold mb-0.5">{s.label}</div>
                <div className="text-gray-500 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHOTO STRIP — Store Interior ── */}
      <section className="relative h-[55vh] overflow-hidden">
        <Image src="/cp-store.png" alt="Nikon Experience Hub Interior" fill className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/60 to-transparent" />
      </section>

      {/* ── ABOUT ── */}
      <section id="tentang" className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-5">
                Tentang Kami
              </div>
              <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
                Mitra Resmi Nikon<br />Terpercaya di Indonesia
              </h2>
              <p className="text-gray-400 leading-relaxed mb-5">
                PT Alta Nikindo adalah perusahaan yang ditunjuk secara resmi oleh Nikon Corporation sebagai <span className="text-white font-semibold">Authorized Nikon Distributor & Official Nikon Service Center di Indonesia</span>.
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                Didirikan pada Agustus 2002, Alta Nikindo telah membangun reputasi yang kuat dalam layanan purna jual profesional dengan dedikasi hubungan jangka panjang bersama pelanggan dan mitra bisnis di seluruh Indonesia.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {MILESTONES.map(m => (
                  <div key={m.year} className="bg-white/5 border border-white/8 rounded-xl p-4 hover:border-[#FFE500]/30 transition-colors">
                    <div className="text-2xl font-black text-[#FFE500] mb-1">{m.year}</div>
                    <p className="text-gray-500 text-xs leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <div className="space-y-4">
                <div className="bg-[#FFE500] rounded-2xl p-7">
                  <div className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">Visi</div>
                  <p className="text-black font-semibold leading-relaxed">
                    Menjadi distributor dan pusat layanan produk fotografi terkemuka di Indonesia yang dipercaya oleh pelanggan dan mitra internasional.
                  </p>
                </div>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-7">
                  <div className="text-xs font-black uppercase tracking-widest text-[#FFE500] mb-3">Misi</div>
                  <ul className="space-y-2">
                    {[
                      'Mendistribusikan produk Nikon dengan standar kualitas internasional',
                      'Memberikan layanan purna jual yang profesional dan bersertifikasi',
                      'Mengembangkan hubungan jangka panjang dengan pelanggan dan mitra',
                      'Mengembangkan SDM yang kompeten dan berintegritas tinggi',
                    ].map((m, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-400">
                        <span className="text-[#FFE500] font-black shrink-0 mt-0.5">›</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── PHOTO — Products ── */}
      <section className="relative h-[60vh] overflow-hidden">
        <Image src="/cp-products.png" alt="Nikon Product Display" fill className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-zinc-900/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <FadeIn>
            <div className="text-center px-4">
              <p className="text-[#FFE500] text-xs font-black uppercase tracking-widest mb-3">Koleksi Lengkap</p>
              <h2 className="text-4xl sm:text-5xl font-black text-white drop-shadow-2xl">Nikon Z Series</h2>
              <p className="text-gray-300 mt-3 text-sm">Rangkaian kamera mirrorless terbaik dari Nikon</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="layanan" className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeIn>
            <div className="mb-14">
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-4">Layanan</div>
              <h2 className="text-4xl xl:text-5xl font-black text-white">Our Services</h2>
              <p className="text-gray-500 mt-3 max-w-lg text-sm leading-relaxed">
                Solusi lengkap untuk semua kebutuhan fotografi Anda — dari distribusi produk hingga layanan purna jual resmi.
              </p>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((s, i) => (
              <FadeIn key={s.no} delay={i * 80}>
                <div className="bg-white/5 border border-white/8 rounded-2xl p-6 hover:border-[#FFE500]/40 hover:bg-white/8 transition-all h-full">
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

      {/* ── PHOTO — Nikon College ── */}
      <section className="relative h-[65vh] overflow-hidden">
        <Image src="/cp-college.png" alt="Nikon College" fill className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/90 via-zinc-900/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-12 w-full">
            <FadeIn>
              <p className="text-[#FFE500] text-xs font-black uppercase tracking-widest mb-2">Workshop & Edukasi</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white max-w-lg">
                Nikon College —<br />Ruang Kreasi Para Fotografer
              </h2>
              <p className="text-gray-400 text-sm mt-3 max-w-md">
                Fasilitas lengkap untuk workshop fotografi, seminar, dan kegiatan komunitas bersama instruktur berpengalaman.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── KEUNGGULAN ── */}
      <section id="keunggulan" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-4">Keunggulan</div>
              <h2 className="text-4xl xl:text-5xl font-black text-zinc-900">Company Advantages</h2>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ADVANTAGES.map((a, i) => (
              <FadeIn key={a.title} delay={i * 80}>
                <div className="text-center p-7 border border-gray-100 rounded-2xl hover:border-[#FFE500] hover:shadow-md transition-all group">
                  <div className="w-14 h-14 bg-[#FFE500]/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 group-hover:bg-[#FFE500]/20 transition-colors">{a.icon}</div>
                  <h3 className="font-black text-zinc-900 text-base mb-3 leading-tight">{a.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{a.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHOTO — Showroom ── */}
      <section className="relative h-[60vh] overflow-hidden">
        <Image src="/cp-showroom.png" alt="Nikon Showroom" fill className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-l from-zinc-900/90 via-zinc-900/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/70 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-end">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full flex justify-end">
            <FadeIn delay={80}>
              <div className="max-w-md text-right">
                <p className="text-[#FFE500] text-xs font-black uppercase tracking-widest mb-2">Distributor Resmi</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white">
                  Experience Now<br />Produk Berkelas
                </h2>
                <p className="text-gray-400 text-sm mt-3">
                  Berbagai kebutuhan Studio mulai dari kamera Nikon, lampu studio Visico, tripod, filter dan dry cabinet Athabasca, tripod video Somita, dan Datacolor color management.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── BRANDS ── */}
      <section id="brand" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="inline-block bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-4">Brand</div>
              <h2 className="text-3xl font-black text-zinc-900">Meet Our Brand</h2>
              <p className="text-gray-500 text-sm mt-2">Brand-brand terpercaya yang kami distribusikan secara resmi di Indonesia</p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4">
              {/* Nikon — besar, 2 baris tinggi */}
              <div className="flex items-center justify-center p-8 rounded-2xl border-2 border-[#FFE500] hover:shadow-lg transition-all hover:scale-[1.02] bg-white" style={{ minHeight: 240, minWidth: 220 }}>
                <Image src="/brand-nikon.png" alt="Nikon" width={200} height={120} className="w-44 h-auto object-contain" />
              </div>
              {/* 4 brand lain — grid 2x2 */}
              <div className="grid grid-cols-2 gap-4 flex-1">
                {[
                  { src: '/brand-athabasca.png', alt: 'Athabasca' },
                  { src: '/brand-datacolor.png', alt: 'Datacolor' },
                  { src: '/brand-somita.png', alt: 'Somita' },
                  { src: '/brand-visico.png', alt: 'Visico' },
                ].map(b => (
                  <div key={b.alt} className="flex items-center justify-center p-5 rounded-2xl border border-gray-200 hover:border-[#FFE500] hover:shadow-md transition-all hover:scale-[1.03] bg-white">
                    <Image src={b.src} alt={b.alt} width={120} height={60} className="h-12 w-auto object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-[#FFE500]">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <FadeIn>
            <h2 className="text-4xl xl:text-5xl font-black text-black mb-4">Butuh Produk atau Layanan Nikon?</h2>
            <p className="text-black/60 text-lg mb-8">Daftarkan garansi, klaim promo, atau hubungi tim kami untuk konsultasi</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/garansi" className="bg-black text-white font-black px-8 py-3.5 rounded-xl text-sm hover:bg-zinc-800 transition-colors">Daftar Garansi</Link>
              <Link href="/claim" className="bg-white text-black font-black px-8 py-3.5 rounded-xl text-sm hover:bg-gray-100 transition-colors">Klaim Promo</Link>
              <Link href="/nikon" className="border-2 border-black text-black font-black px-8 py-3.5 rounded-xl text-sm hover:bg-black/8 transition-colors">Produk Nikon</Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── KONTAK ── */}
      <section id="kontak" className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded mb-4">Kontak</div>
              <h2 className="text-4xl font-black text-white">Our Contact</h2>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {[
              { icon: '📞', label: 'Telepon', val: '+62 6231-2600', href: 'tel:+6262312600' },
              { icon: '📍', label: 'Alamat', val: 'Komplek Mangga Dua Square\nBlok H No 1–2, Jakarta', href: 'https://maps.app.goo.gl/vXzprSzknSRaLqaD8' },
            ].map((c, i) => (
              <FadeIn key={c.label} delay={i * 80}>
                {c.href ? (
                  <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                    className="flex flex-col items-center text-center p-7 border border-white/8 rounded-2xl hover:border-[#FFE500]/50 hover:bg-white/5 transition-all group">
                    <div className="w-12 h-12 bg-[#FFE500]/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-[#FFE500]/20 transition-colors">{c.icon}</div>
                    <span className="font-black text-white mb-1 text-sm">{c.label}</span>
                    <span className="text-xs text-gray-500 whitespace-pre-line">{c.val}</span>
                  </a>
                ) : (
                  <div className="flex flex-col items-center text-center p-7 border border-white/8 rounded-2xl hover:border-[#FFE500]/50 hover:bg-white/5 transition-all group">
                    <div className="w-12 h-12 bg-[#FFE500]/10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-[#FFE500]/20 transition-colors">{c.icon}</div>
                    <span className="font-black text-white mb-1 text-sm">{c.label}</span>
                    <span className="text-xs text-gray-500 whitespace-pre-line">{c.val}</span>
                  </div>
                )}
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-black border-t border-zinc-900 py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Image src="/ALTA_baru.png" alt="Alta Nikindo" width={80} height={28} className="h-7 w-auto object-contain opacity-60" />
            <div>
              <div className="text-gray-600 text-[10px]">© 2026 All rights reserved.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs text-gray-600">
            <Link href="/nikon" className="hover:text-white transition-colors">Produk</Link>
            <Link href="/garansi" className="hover:text-white transition-colors">Garansi</Link>
            <Link href="/claim" className="hover:text-white transition-colors">Klaim Promo</Link>
            <Link href="/events/register" className="hover:text-white transition-colors">Event</Link>
            <Link href="/dashboard" className="hover:text-[#FFE500] transition-colors">Staff</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
