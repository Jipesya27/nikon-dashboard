'use client';

import { useState, useRef, useEffect } from 'react';

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

        {step === 'list' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Pilih Event yang Ingin Diikuti</h2>
              <p className="text-xs text-gray-700">Berikut adalah event Nikon yang masih membuka pendaftaran.</p>
            </div>

            {events.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <p className="text-gray-700 font-medium">Saat ini belum ada event aktif. Silakan cek kembali nanti.</p>
              </div>
            )}

            {events.map(evt => {
              const sisa = evt.event_partisipant_stock > 0 ? evt.event_partisipant_stock - evt.registered_count : null;
              return (
                <div key={evt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {evt.event_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={evt.event_image} alt={evt.event_title} className="w-full h-44 object-cover" />
                  )}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{evt.event_title}</h3>
                      <p className="text-sm text-gray-700 mt-0.5">📅 {evt.event_date}</p>
                      {evt.event_speaker && (
                        <p className="text-xs text-gray-700 mt-0.5">🎤 {evt.event_speaker}{evt.event_speaker_genre ? ` (${evt.event_speaker_genre})` : ''}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-800">
                        💰 {evt.event_price}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${evt.event_payment_tipe === 'deposit' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {evt.event_payment_tipe === 'deposit' ? '🎫 Deposit (Refundable)' : '🎫 Regular'}
                      </span>
                      {sisa !== null && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${sisa <= 3 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          Sisa kuota: {sisa}
                        </span>
                      )}
                    </div>
                    {evt.event_description && (
                      <p className="text-xs text-gray-700 line-clamp-3">{evt.event_description}</p>
                    )}
                    <button
                      onClick={() => pilihEvent(evt)}
                      className="w-full bg-black text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition"
                    >
                      Daftar Event Ini →
                    </button>
                  </div>
                </div>
              );
            })}
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
