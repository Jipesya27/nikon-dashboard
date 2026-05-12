'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

type EventItem = {
  id: string;
  event_title: string;
  event_date: string;
  event_price: string;
  event_image?: string;
  event_description?: string;
  event_speaker?: string;
  event_speaker_genre?: string;
  event_payment_tipe: 'regular' | 'deposit';
  deposit_amount?: string;
  bank_info?: string;
  event_partisipant_stock: number;
  registered_count: number;
};

const ID_MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};
function parseIdDate(str: string): Date | null {
  if (!str) return null;
  const p = str.trim().toLowerCase().split(/\s+/);
  if (p.length < 3) return null;
  const d = parseInt(p[0]), m = ID_MONTHS[p[1]], y = parseInt(p[2]);
  if (isNaN(d) || m === undefined || isNaN(y)) return null;
  return new Date(y, m, d);
}
function daysUntil(dateStr: string): number | null {
  const d = parseIdDate(dateStr);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

type FormState = {
  nama_lengkap: string;
  nomor_wa: string;
  email: string;
  tipe_kamera: string;
  kabupaten_kotamadya: string;
  nama_bank: string;
  no_rekening: string;
  nama_pemilik_rekening: string;
};

const EMPTY_FORM: FormState = {
  nama_lengkap: '', nomor_wa: '', email: '', tipe_kamera: '',
  kabupaten_kotamadya: '', nama_bank: '', no_rekening: '', nama_pemilik_rekening: '',
};

export default function EventRegisterPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [step, setStep] = useState<'list' | 'form' | 'success'>('list');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [fileBukti, setFileBukti] = useState<File | null>(null);
  const [previewBukti, setPreviewBukti] = useState<string | null>(null);
  const refBukti = useRef<HTMLInputElement>(null);

  // Marketplace filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'regular' | 'deposit'>('all');
  const [filterGenre, setFilterGenre] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'newest' | 'soonest' | 'price_asc' | 'price_desc'>('soonest');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/events/register');
        const result = await res.json();
        if (res.ok) setEvents(result.events || []);
        else setErrorMsg(result.error || 'Gagal memuat daftar event.');
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setFileBukti(file);
    setPreviewBukti(URL.createObjectURL(file));
  }

  function pilihEvent(evt: EventItem) {
    setSelectedEvent(evt);
    setStep('form');
    setErrorMsg('');
    setFormData(EMPTY_FORM);
    setFileBukti(null);
    setPreviewBukti(null);
  }

  // Daftar genre unik dari events
  const allGenres = useMemo(() => {
    const g = new Set<string>();
    events.forEach(e => { if (e.event_speaker_genre) g.add(e.event_speaker_genre); });
    return ['Semua', ...Array.from(g)];
  }, [events]);

  // Apply search/filter/sort
  const visibleEvents = useMemo(() => {
    const parsePrice = (s: string) => parseInt((s || '').replace(/[^0-9]/g, '')) || 0;
    let list = events.filter(e => {
      if (filterPayment !== 'all' && e.event_payment_tipe !== filterPayment) return false;
      if (filterGenre !== 'Semua' && e.event_speaker_genre !== filterGenre) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const blob = `${e.event_title} ${e.event_speaker || ''} ${e.event_speaker_genre || ''} ${e.event_description || ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'newest') return 0; // sudah urut dari API
      if (sortBy === 'soonest') {
        const da = parseIdDate(a.event_date)?.getTime() ?? Infinity;
        const db = parseIdDate(b.event_date)?.getTime() ?? Infinity;
        return da - db;
      }
      if (sortBy === 'price_asc') return parsePrice(a.event_price) - parsePrice(b.event_price);
      if (sortBy === 'price_desc') return parsePrice(b.event_price) - parsePrice(a.event_price);
      return 0;
    });
    return list;
  }, [events, filterPayment, filterGenre, searchTerm, sortBy]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent) return;
    if (!fileBukti) {
      setErrorMsg('Harap unggah bukti transfer pembayaran.');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const fd = new FormData();
      fd.append('event_id', selectedEvent.id);
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      fd.append('bukti_transfer', fileBukti);

      const res = await fetch('/api/events/register', { method: 'POST', body: fd });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal mengirim data.');
      setStep('success');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  }

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (step === 'success' && selectedEvent) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-gray-900" style={{ colorScheme: 'light' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pendaftaran Diterima!</h2>
          <p className="text-gray-800 mb-3 font-medium">
            Pendaftaran Anda untuk <span className="font-bold">{selectedEvent.event_title}</span> sedang diverifikasi.
          </p>
          <p className="text-sm text-gray-700 mb-4 font-medium">
            Konfirmasi akan dikirim ke WhatsApp Anda dalam 1-2 hari kerja.
          </p>
          <button
            onClick={() => { setStep('list'); setSelectedEvent(null); setFormData(EMPTY_FORM); setFileBukti(null); setPreviewBukti(null); }}
            className="bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-800 transition"
          >
            ← Lihat Event Lain
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2.5 border border-gray-400 rounded-lg text-sm text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent";
  const labelCls = "block text-sm font-semibold text-gray-900 mb-1";
  const req = <span className="text-red-600">*</span>;

  // ========== MARKETPLACE LIST VIEW ==========
  if (step === 'list') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900" style={{ colorScheme: 'light' }}>
        {/* HERO / TOP BAR — black bg + nikon yellow accent */}
        <header className="bg-linear-to-r from-gray-900 via-black to-gray-900 border-b-4 border-[#FFE500] sticky top-0 z-30 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3 md:gap-5">
            <div className="bg-[#FFE500] rounded-lg w-10 h-10 flex items-center justify-center shadow-md shrink-0">
              <span className="text-black font-black text-lg">N</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-xl font-bold text-white truncate">Nikon Event</h1>
              <p className="text-xs text-gray-400 hidden md:block">Daftar event fotografi & workshop resmi Nikon Indonesia</p>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[#FFE500] text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-[#FFE500] rounded-full animate-pulse" /> {events.length} Event Tersedia
            </div>
          </div>

          {/* Search bar */}
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari event, speaker, atau topik..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-500 shadow-md focus:outline-none focus:ring-2 focus:ring-[#FFE500]"
              />
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* CATEGORY FILTER PILLS */}
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-none">
            <div className="flex gap-2 min-w-max pb-1">
              {allGenres.map(g => {
                const active = filterGenre === g;
                return (
                  <button
                    key={g}
                    onClick={() => setFilterGenre(g)}
                    className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border-2 ${active ? 'bg-black text-[#FFE500] border-black shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
                  >
                    {g === 'Semua' ? '⭐ Semua' : `📷 ${g}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAYMENT FILTER + SORT */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex gap-2">
              {([
                { v: 'all',     l: 'Semua Tipe', i: '🎟️' },
                { v: 'regular', l: 'Regular',    i: '🎫' },
                { v: 'deposit', l: 'Deposit',    i: '💎' },
              ] as const).map(opt => {
                const active = filterPayment === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setFilterPayment(opt.v)}
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all border ${active ? 'bg-[#FFE500] text-black border-[#FFE500] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {opt.i} {opt.l}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700">Urutkan:</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="soonest">📆 Terdekat</option>
                <option value="newest">✨ Terbaru</option>
                <option value="price_asc">💸 Harga Terendah</option>
                <option value="price_desc">💰 Harga Tertinggi</option>
              </select>
            </div>
          </div>

          {/* RESULT COUNT */}
          <p className="text-xs text-gray-600 font-medium">
            Menampilkan <span className="font-bold text-gray-900">{visibleEvents.length}</span> dari {events.length} event
          </p>

          {/* EMPTY STATE */}
          {visibleEvents.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-gray-800 font-semibold mb-1">Tidak ada event ditemukan</p>
              <p className="text-sm text-gray-600">Coba ubah filter atau kata kunci pencarian Anda.</p>
            </div>
          )}

          {/* GRID OF EVENTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleEvents.map(evt => {
              const totalStock = evt.event_partisipant_stock;
              const sisa = totalStock > 0 ? totalStock - evt.registered_count : null;
              const persenTerisi = totalStock > 0 ? (evt.registered_count / totalStock) : 0;
              const tampilSisa = sisa !== null && sisa > 0 && persenTerisi >= 0.7;
              const sisaHari = daysUntil(evt.event_date);
              const isHot = (tampilSisa && sisa! <= 3) || (sisaHari !== null && sisaHari <= 7 && sisaHari >= 0);

              return (
                <div key={evt.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
                  <div className="relative bg-linear-to-br from-gray-100 to-gray-200">
                    {evt.event_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evt.event_image}
                        alt={evt.event_title}
                        className="w-full aspect-[3/4] object-contain group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-linear-to-br from-gray-800 to-black flex items-center justify-center">
                        <span className="text-[#FFE500] font-black text-5xl">N</span>
                      </div>
                    )}
                    {/* badges overlay */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                      {isHot && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold uppercase shadow-md">
                          🔥 Hot
                        </span>
                      )}
                      {evt.event_payment_tipe === 'deposit' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFE500] text-black text-[10px] font-bold uppercase shadow-md">
                          💎 Refundable
                        </span>
                      )}
                    </div>
                    {tampilSisa && (
                      <span className={`absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold shadow-md ${sisa! <= 3 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                        Sisa {sisa} kursi
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    {evt.event_speaker_genre && (
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{evt.event_speaker_genre}</p>
                    )}
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 min-h-[2.5rem]">{evt.event_title}</h3>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs text-gray-700 flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        {evt.event_date}
                        {sisaHari !== null && sisaHari >= 0 && sisaHari <= 30 && (
                          <span className="ml-1 text-[10px] text-red-600 font-bold">· {sisaHari === 0 ? 'Hari ini' : `${sisaHari}h lagi`}</span>
                        )}
                      </p>
                      {evt.event_speaker && (
                        <p className="text-xs text-gray-700 flex items-center gap-1 truncate">
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                          <span className="truncate">{evt.event_speaker}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase">Harga</p>
                        <p className="text-base font-black text-gray-900 leading-tight">{evt.event_price}</p>
                      </div>
                      <button
                        onClick={() => pilihEvent(evt)}
                        className="bg-black text-[#FFE500] px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-gray-800 transition shadow-md whitespace-nowrap"
                      >
                        Daftar →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-gray-500 pt-6">
            Nikon Indonesia · Powered by Alta Nikindo
          </p>
        </div>
      </div>
    );
  }

  // ========== FORM & SUCCESS VIEWS ==========
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 text-gray-900" style={{ colorScheme: 'light' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-xl mb-3">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pendaftaran Event Nikon</h1>
          <p className="text-gray-700 text-sm mt-1 font-medium">Nikon Indonesia</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
        )}

        {step === 'form' && selectedEvent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event yang dipilih */}
            <div className="bg-white rounded-2xl shadow-sm border-2 border-black p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Event Dipilih</p>
                  <h3 className="text-base font-bold text-gray-900 mt-1">{selectedEvent.event_title}</h3>
                  <p className="text-sm text-gray-700 mt-0.5">📅 {selectedEvent.event_date} · 💰 {selectedEvent.event_price}</p>
                  {selectedEvent.event_payment_tipe === 'deposit' && (
                    <p className="text-xs text-amber-700 mt-1 font-medium">⚠️ Event ini berbayar deposit (bisa di-refund setelah hadir)</p>
                  )}
                </div>
                <button type="button" onClick={() => { setStep('list'); setSelectedEvent(null); }} className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline shrink-0">Ganti</button>
              </div>
              {selectedEvent.bank_info && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-bold text-gray-800 mb-1">💳 Info Pembayaran:</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedEvent.bank_info}</p>
                  {selectedEvent.event_payment_tipe === 'deposit' && selectedEvent.deposit_amount && (
                    <p className="text-xs text-gray-700 mt-1">Jumlah deposit: <span className="font-bold">Rp {selectedEvent.deposit_amount}</span></p>
                  )}
                </div>
              )}
            </div>

            {/* DATA DIRI */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="text-base font-semibold text-gray-800">Data Peserta</h2>
              </div>

              <div>
                <label className={labelCls}>Nama Lengkap {req}</label>
                <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Nomor WhatsApp {req}</label>
                <input type="text" name="nomor_wa" value={formData.nomor_wa} onChange={handleChange} required pattern="[0-9]{10,15}" title="Format angka, contoh: 081234567890" placeholder="Contoh: 081234567890" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Email <span className="text-gray-700 text-xs font-normal ml-1">(opsional)</span></label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="nama@email.com" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Tipe Kamera yang Dimiliki {req}</label>
                <input type="text" name="tipe_kamera" value={formData.tipe_kamera} onChange={handleChange} required placeholder="Contoh: Nikon Z50 Kit 16-50mm" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Kabupaten / Kota {req}</label>
                <input type="text" name="kabupaten_kotamadya" value={formData.kabupaten_kotamadya} onChange={handleChange} required placeholder="Contoh: Jakarta Selatan" className={inputCls} />
              </div>
            </div>

            {/* DATA BANK (jika deposit) */}
            {selectedEvent.event_payment_tipe === 'deposit' && (
              <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <h2 className="text-base font-semibold text-gray-800">Rekening untuk Refund Deposit</h2>
                </div>
                <p className="text-xs text-gray-700">Data rekening digunakan untuk mengembalikan deposit Anda setelah acara selesai.</p>

                <div>
                  <label className={labelCls}>Nama Bank {req}</label>
                  <input type="text" name="nama_bank" value={formData.nama_bank} onChange={handleChange} required={selectedEvent.event_payment_tipe === 'deposit'} placeholder="Contoh: BCA, Mandiri" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Nomor Rekening {req}</label>
                  <input type="text" name="no_rekening" value={formData.no_rekening} onChange={handleChange} required={selectedEvent.event_payment_tipe === 'deposit'} pattern="[0-9]+" title="Hanya angka" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Nama Pemilik Rekening {req}</label>
                  <input type="text" name="nama_pemilik_rekening" value={formData.nama_pemilik_rekening} onChange={handleChange} required={selectedEvent.event_payment_tipe === 'deposit'} className={inputCls} />
                </div>
              </div>
            )}

            {/* UPLOAD */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">{selectedEvent.event_payment_tipe === 'deposit' ? 3 : 2}</div>
                <h2 className="text-base font-semibold text-gray-800">Bukti Transfer Pembayaran</h2>
              </div>

              <div>
                <label className={labelCls}>Foto Bukti Transfer {req}</label>
                <input ref={refBukti} type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => refBukti.current?.click()}
                  className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors ${fileBukti ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                >
                  {previewBukti && fileBukti?.type.startsWith('image/') ? (
                    <div className="flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewBukti} alt="preview" className="h-32 object-contain rounded" />
                      <span className="text-xs text-green-600 font-medium">{fileBukti.name}</span>
                      <span className="text-xs text-gray-700">Ketuk untuk ganti</span>
                    </div>
                  ) : fileBukti ? (
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs text-green-600 font-medium">{fileBukti.name}</span>
                      <span className="text-xs text-gray-700">Ketuk untuk ganti</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-sm text-gray-800 font-medium">Ketuk untuk upload foto/PDF</span>
                      <span className="text-xs text-gray-700">Screenshot atau foto bukti transfer</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Mengirim & mengupload...
                </span>
              ) : 'Daftar Sekarang'}
            </button>

            <p className="text-xs text-gray-700 text-center pb-4">
              Data Anda aman dan hanya digunakan untuk keperluan event Nikon Indonesia.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
