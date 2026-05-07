'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-to-prevent-error';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  return new Date(y, m, d + 1);
}

function gdriveUrl(url: string | null | undefined): string {
  if (!url) return '';
  const m = url.match(/(?:drive\.google\.com\/uc\?id=|drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=|drive\.google\.com\/thumbnail\?id=|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return `https://lh3.googleusercontent.com/d/${m[1]}=w2000`;
  return url;
}

function getEventClosed(evt: any, regCount: number): { closed: boolean; reason: string } {
  const status = (evt.event_status || '').toLowerCase();
  if (status === 'close' || status === 'closed') return { closed: true, reason: 'Ditutup' };
  if (status === 'sold out' || status === 'sold_out' || status === 'soldout') return { closed: true, reason: 'Sold Out' };
  if (evt.event_partisipant_stock > 0 && regCount >= evt.event_partisipant_stock) return { closed: true, reason: 'Kuota Penuh' };
  const evtDate = parseIdDate(evt.event_date);
  if (evtDate && evtDate < new Date()) return { closed: true, reason: 'Acara Selesai' };
  return { closed: false, reason: '' };
}

export default function EventCatalog() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nama_lengkap: '', nomor_wa: '', kabupaten_kotamadya: '', tipe_kamera: '' });
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [tipeBarangOptions, setTipeBarangOptions] = useState<string[]>([]);
  const [buktiTransfer, setBuktiTransfer] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
        try {
          const { data: regData } = await supabase.from('event_registrations').select('event_name');
          if (regData) {
            const counts: Record<string, number> = {};
            regData.forEach((r: any) => { counts[r.event_name] = (counts[r.event_name] || 0) + 1; });
            setRegistrationCounts(counts);
          }
        } catch {}
        try {
          const { data: claimData } = await supabase.from('claim_promo').select('tipe_barang');
          if (claimData) {
            const unique = [...new Set(claimData.map((c: any) => c.tipe_barang).filter(Boolean))] as string[];
            setTipeBarangOptions(unique);
          }
        } catch {}
        if (error) throw error;
        setEvents(data || []);
      } catch {
        setEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    fetchData();
  }, []);

  const uploadFileToStorage = async (file: File, opts: { folder?: string; filename?: string; prefix?: string; serial?: string }) => {
    const fd = new FormData();
    fd.append('file', file);
    if (opts.folder) fd.append('folder', opts.folder);
    if (opts.filename) fd.append('filename', opts.filename);
    if (opts.prefix) fd.append('prefix', opts.prefix);
    if (opts.serial) fd.append('serial', opts.serial);
    const response = await fetch('/api/upload-google-drive', { method: 'POST', body: fd });
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Upload failed'); }
    return (await response.json()).url;
  };

  const handleWaChange = async (wa: string) => {
    setFormData(f => ({ ...f, nomor_wa: wa }));
    if (wa.length >= 10) {
      setIsAutoFilling(true);
      try {
        const { data } = await supabase.from('konsumen').select('nama_lengkap, kabupaten_kotamadya').eq('nomor_wa', wa).single();
        if (data) {
          setFormData(f => ({
            ...f,
            nomor_wa: wa,
            nama_lengkap: data.nama_lengkap || '',
            kabupaten_kotamadya: data.kabupaten_kotamadya && data.kabupaten_kotamadya !== 'BELUM_DIISI' ? data.kabupaten_kotamadya : '',
          }));
        }
      } catch {}
      setIsAutoFilling(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'nomor_wa') { handleWaChange(value); return; }
    setFormData(f => ({ ...f, [name]: value }));
  };

  const openModal = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setIsSuccess(false);
    setErrorMsg('');
    setFormData({ nama_lengkap: '', nomor_wa: '', kabupaten_kotamadya: '', tipe_kamera: '' });
    setBuktiTransfer(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => { setSelectedEvent(null); setIsSuccess(false); }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { closed, reason } = getEventClosed(selectedEvent, registrationCounts[selectedEvent?.event_title] || 0);
    if (closed) { setErrorMsg(`Pendaftaran ditutup: ${reason}`); return; }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      let buktiUrl: string | null = null;
      if (buktiTransfer) {
        // Format: tanggalAcara_namaAcara_nomorWa_namaLengkap
        const customName = [
          selectedEvent.event_date || 'tgl',
          selectedEvent.event_title || 'event',
          formData.nomor_wa || 'wa',
          formData.nama_lengkap || 'nama',
        ].join('_');
        buktiUrl = await uploadFileToStorage(buktiTransfer, { folder: 'Pembayaran', filename: customName });
      }

      const { error } = await supabase.from('event_registrations').insert([{
        nama_lengkap: formData.nama_lengkap,
        nomor_wa: formData.nomor_wa,
        kabupaten_kotamadya: formData.kabupaten_kotamadya,
        tipe_kamera: formData.tipe_kamera,
        event_name: selectedEvent.event_title,
        event_id: selectedEvent.id,
        bukti_transfer_url: buktiUrl,
        status_pendaftaran: 'menunggu_validasi',
        payment_type: selectedEvent.event_payment_tipe || 'regular',
      }]);

      if (error) throw error;
      setIsSuccess(true);
    } catch (error: any) {
      setErrorMsg(error.message || 'Terjadi kesalahan saat mendaftar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDeposit = selectedEvent?.event_payment_tipe === 'deposit';

  const renderStars = (rating: number) => {
    const n = rating || 5;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <svg key={star} className={`w-3 h-3 ${star <= n ? 'text-[#FFE800]' : 'text-zinc-600'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#FFE800] selection:text-black">
      <header className="border-b border-white/10 bg-zinc-950 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 tracking-tighter text-xl">NIKON</div>
            <span className="font-bold tracking-widest uppercase text-sm hidden sm:block ml-2">Event Catalog</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <a href="/events/refund" className="text-[#FFE800] border border-[#FFE800]/40 hover:bg-[#FFE800]/10 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold">
              💰 Klaim Pengembalian Deposit
            </a>
            <span className="hidden sm:inline">Showing 1 - {events.length} of {events.length} events</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingEvents ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFE800]" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold mb-2">Belum Ada Event</h2>
            <p className="text-zinc-500 text-sm max-w-sm">Saat ini belum ada event yang tersedia. Silakan kembali lagi nanti untuk melihat event mendatang.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map(evt => {
              const regCount = registrationCounts[evt.event_title] || 0;
              const { closed, reason } = getEventClosed(evt, regCount);
              const sisa = evt.event_partisipant_stock - regCount;
              return (
              <div
                key={evt.id}
                onClick={() => !closed && openModal(evt)}
                className={`group flex flex-col bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 ${closed ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-white/20 hover:bg-zinc-900 hover:-translate-y-1'}`}
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img src={gdriveUrl(evt.event_image)} alt={evt.event_title} referrerPolicy="no-referrer" className={`w-full h-full object-cover transition-transform duration-700 ${!closed && 'group-hover:scale-105'}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {closed && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-sm font-extrabold px-4 py-2 rounded-lg tracking-widest uppercase shadow-lg">{reason}</span>
                    </div>
                  )}
                  {!closed && evt.event_price === 'Gratis' && (
                    <div className="absolute top-3 left-3 bg-[#FFE800] text-black text-xs font-bold px-2 py-1 rounded">FREE EVENT</div>
                  )}
                  {!closed && evt.event_payment_tipe === 'deposit' && (
                    <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">DEPOSIT</div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xl font-medium text-white mb-1 tracking-tight">{evt.event_price}</p>
                  {evt.event_payment_tipe === 'deposit' && evt.deposit_amount && (
                    <p className="text-xs text-orange-400 mb-2">Deposit: {evt.deposit_amount}</p>
                  )}
                  <h3 className="text-sm font-semibold text-zinc-300 leading-snug mb-1 flex-1 group-hover:text-white transition-colors">{evt.event_title}</h3>
                  {evt.event_speaker && (
                    <p className="text-xs text-zinc-500 mb-2">🎤 {evt.event_speaker}{evt.event_speaker_genre ? ` — ${evt.event_speaker_genre}` : ''}</p>
                  )}
                  <div className="flex flex-col gap-3 mt-auto">
                    {renderStars(evt.rating)}
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className={`w-2 h-2 rounded-full ${closed ? 'bg-red-500' : 'bg-[#FFE800] animate-pulse'}`} />
                      {closed ? (
                        <span className="text-red-400">{reason}</span>
                      ) : (
                        <span className="text-[#FFE800]">
                          Aktif, {sisa} slot tersisa
                          {sisa <= Math.ceil(evt.event_partisipant_stock * 0.3) && (
                            <span className="ml-2 text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full text-[10px]">Sisa {sisa} slot!</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Registration Modal */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 shadow-2xl relative custom-scrollbar">
            <button onClick={closeModal} className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-full p-2 transition-colors z-20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {isSuccess ? (
              <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-[#FFE800]/20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-[#FFE800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4">Pendaftaran Diterima!</h2>
                <p className="text-gray-400 mb-3 max-w-sm mx-auto">
                  Pendaftaran Anda untuk <strong className="text-white">{selectedEvent.event_title}</strong> sedang dalam proses validasi.
                </p>
                <p className="text-zinc-500 text-sm mb-8 max-w-sm mx-auto">
                  Tim kami akan memverifikasi pembayaran Anda. Setelah dikonfirmasi, tiket PDF dengan QR Code akan dikirim ke WhatsApp Anda.
                </p>
                {isDeposit && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 text-left max-w-sm">
                    <p className="text-orange-400 text-sm font-semibold mb-1">Info Deposit</p>
                    <p className="text-zinc-400 text-xs">Deposit sebesar <strong className="text-white">{selectedEvent.deposit_amount}</strong> akan dikembalikan setelah acara selesai melalui WhatsApp.</p>
                  </div>
                )}
                <button onClick={closeModal} className="bg-[#FFE800] text-black font-bold py-3 px-8 rounded-lg hover:bg-[#FFE800]/90 transition-all">
                  Kembali ke Katalog
                </button>
              </div>
            ) : (
              <div>
                {/* Header cover */}
                <div className="h-40 md:h-48 relative overflow-hidden rounded-t-2xl">
                  <img src={gdriveUrl(selectedEvent.event_image)} className="w-full h-full object-cover opacity-40" alt="Cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
                  <div className="absolute bottom-4 left-6 pr-12">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-[#FFE800] text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest inline-block">
                        {selectedEvent.event_date}
                      </div>
                      {isDeposit && (
                        <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest inline-block rounded">DEPOSIT</div>
                      )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{selectedEvent.event_title}</h2>
                    {selectedEvent.event_speaker && (
                      <p className="text-zinc-400 text-xs mt-1">🎤 {selectedEvent.event_speaker}{selectedEvent.event_speaker_genre ? ` — ${selectedEvent.event_speaker_genre}` : ''}</p>
                    )}
                  </div>
                </div>

                {selectedEvent.event_description && (
                  <div className="px-6 md:px-8 pt-6">
                    <h3 className="text-sm font-bold text-[#FFE800] uppercase tracking-wider mb-2">Detail Acara</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap bg-zinc-900/50 p-4 rounded-lg border border-white/5">
                      {selectedEvent.event_description}
                    </p>
                  </div>
                )}

                <div className="p-6 md:p-8 pt-6">
                  <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">Formulir Pendaftaran</h3>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">{errorMsg}</div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Nomor WhatsApp</label>
                      <div className="relative">
                        <input type="tel" name="nomor_wa" value={formData.nomor_wa} onChange={handleChange} placeholder="08123456789" required
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors" />
                        {isAutoFilling && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">mengisi...</span>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                      <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} placeholder="Nama sesuai KTP" required
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors" />
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Kabupaten / Kotamadya</label>
                        <input type="text" name="kabupaten_kotamadya" value={formData.kabupaten_kotamadya} onChange={handleChange} placeholder="Kota domisili Anda" required
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Tipe Kamera</label>
                        <input type="text" name="tipe_kamera" list="tipe-kamera-options" value={formData.tipe_kamera} onChange={handleChange} placeholder="Contoh: Nikon Z8" required
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors" />
                        <datalist id="tipe-kamera-options">
                          {tipeBarangOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                      </div>
                    </div>

                    {selectedEvent.event_price !== 'Gratis' && (
                      <div className="bg-zinc-900 border border-white/5 rounded-lg p-4 mt-2 space-y-3">
                        <label className="block text-xs font-medium text-[#FFE800] uppercase tracking-wider">Informasi Pembayaran</label>

                        <div className="bg-black/40 p-3 rounded-lg">
                          {isDeposit ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-500 text-xs">Harga Acara</span>
                                <span className="font-bold text-white text-sm">{selectedEvent.event_price}</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-white/10 pt-2">
                                <span className="text-orange-400 text-xs font-semibold">Deposit (akan dikembalikan)</span>
                                <span className="font-bold text-orange-400 text-sm">{selectedEvent.deposit_amount}</span>
                              </div>
                              <p className="text-xs text-zinc-500 pt-1">Transfer sejumlah deposit terlebih dahulu untuk konfirmasi kehadiran.</p>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-zinc-500 text-xs block">Total Tagihan</span>
                                <span className="font-bold text-white text-base">{selectedEvent.event_price}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-zinc-500 text-xs block">Transfer ke Rekening</span>
                                <span className="font-bold text-white text-sm whitespace-pre-wrap">{selectedEvent.bank_info || 'BCA 1234567890\na.n Nikon Event Indonesia'}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {isDeposit && (
                          <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg">
                            <div>
                              <span className="text-zinc-500 text-xs block">Transfer Deposit ke</span>
                              <span className="font-bold text-white text-sm whitespace-pre-wrap">{selectedEvent.bank_info || 'BCA 1234567890\na.n Nikon Event Indonesia'}</span>
                            </div>
                          </div>
                        )}

                        {selectedEvent.event_upload_payment_screenshot && (
                          <div>
                            <p className="text-xs text-zinc-400 mb-2">QR / Info Pembayaran:</p>
                            <img src={gdriveUrl(selectedEvent.event_upload_payment_screenshot)} alt="QR Pembayaran" referrerPolicy="no-referrer" className="max-w-[200px] rounded-lg border border-white/10" />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                            Upload Bukti {isDeposit ? 'Transfer Deposit' : 'Transfer'}
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => { if (e.target.files?.[0]) setBuktiTransfer(e.target.files[0]); }}
                            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 transition-all cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {isDeposit && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-xs text-orange-300">
                        <strong>Info Deposit:</strong> Deposit sebesar {selectedEvent.deposit_amount} akan dikembalikan setelah acara selesai. Bukti pengembalian akan dikirimkan via WhatsApp.
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full bg-[#FFE800] text-black font-bold py-3.5 rounded-lg mt-4 flex justify-center items-center gap-2 hover:bg-[#FFE800]/90 transition-all duration-300 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? (
                        <><svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Memproses...</>
                      ) : (
                        <>Daftar & Konfirmasi<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #18181b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}} />
    </div>
  );
}
