'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-to-prevent-error';
const supabase = createClient(supabaseUrl, supabaseKey);

// Fallback dummy data jika tabel `events` belum dibuat di Supabase
const EVENTS_DUMMY = [
  {
    id: 'z9-masterclass',
    title: 'Nikon Z9 Masterclass: The Future of Speed',
    price: 'Rp 750.000',
    date: '12 Agustus 2026',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop',
    rating: 5,
    stock: 20,
    status: 'In stock',
    detail_acara: 'Ini adalah contoh teks panjang detail acara. Bergabunglah dengan lingkaran elit fotografer. Tingkatkan keahlian Anda dan rasakan pengalaman menggunakan gear terbaru dari Nikon dalam sesi eksklusif yang dipandu oleh profesional.',
    bank_info: 'BCA 1234567890\na.n Nikon Event Indonesia'
  },
  {
    id: 'wildlife-expedition',
    title: 'Wildlife Expedition with Nikon Z8',
    price: 'Rp 1.500.000',
    date: '20 September 2026',
    image: 'https://images.unsplash.com/photo-1542314831-c6a4d142104d?q=80&w=600&auto=format&fit=crop',
    rating: 5,
    stock: 15,
    status: 'In stock',
    detail_acara: 'Eksplorasi alam liar. Abadikan keindahan alam liar yang tak tertandingi dalam ekspedisi eksklusif bersama pemandu profesional. Acara ini mencakup transportasi, akomodasi, dan sesi review foto di malam hari.',
    bank_info: 'BCA 1234567890\na.n Nikon Event Indonesia'
  }
];

export default function EventCatalog() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    wa_number: '',
    email: '',
    camera_model: '',
  });
  const [buktiTransfer, setBuktiTransfer] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredId, setRegisteredId] = useState<string>('');
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});

  // Fetch events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
        
        try {
          const { data: regData } = await supabase.from('event_registrations').select('event_name');
          if (regData) {
             const counts: Record<string, number> = {};
             regData.forEach((r: any) => {
                counts[r.event_name] = (counts[r.event_name] || 0) + 1;
             });
             setRegistrationCounts(counts);
          }
        } catch (e) {}

        if (error) {
          throw error;
        }
        if (data && data.length > 0) {
          setEvents(data);
        } else {
          setEvents(EVENTS_DUMMY);
        }
      } catch (err) {
        console.warn("Tabel events belum ada, menggunakan data dummy.");
        setEvents(EVENTS_DUMMY);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  // --- STORAGE HELPER ---
  const uploadFileToStorage = async (file: File, prefix: string, serial: string) => {
     const ext = file.name.split('.').pop();
     const fileName = `${serial}_${prefix}_${Date.now()}.${ext}`;
     const { error } = await supabase.storage.from('whatsapp-uploads').upload(fileName, file, { upsert: true });
     if (error) throw error;
     return supabase.storage.from('whatsapp-uploads').getPublicUrl(fileName).data.publicUrl;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setIsSuccess(false);
    setErrorMsg('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedEvent(null);
      setIsSuccess(false);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let buktiUrl = null;
      if (buktiTransfer) {
        buktiUrl = await uploadFileToStorage(buktiTransfer, 'EventPayment', formData.wa_number || 'UNKNOWN');
      }

      // Uncomment ini bila tabel event_registrations sudah siap di Supabase
      /*
      const { error } = await supabase.from('event_registrations').insert([
        { ...formData, event_name: selectedEvent.title, bukti_transfer_url: buktiUrl, status: 'Pending Payment' }
      ]);
      if (error) throw error;
      */
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulasi loading
      
      setIsSuccess(true);
      setFormData({
        full_name: '',
        wa_number: '',
        email: '',
        camera_model: '',
      });
      setBuktiTransfer(null);
    } catch (error: any) {
      setErrorMsg(error.message || 'Terjadi kesalahan saat mendaftar atau mengunggah bukti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    const numRating = rating || 5;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg 
            key={star} 
            className={`w-3 h-3 ${star <= numRating ? 'text-[#FFE800]' : 'text-zinc-600'}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#FFE800] selection:text-black">
      {/* Header Area */}
      <header className="border-b border-white/10 bg-zinc-950 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 tracking-tighter text-xl">
              NIKON
            </div>
            <span className="font-bold tracking-widest uppercase text-sm hidden sm:block ml-2">Event Catalog</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>Showing 1 - {events.length} of {events.length} events</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingEvents ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFE800]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((evt) => (
              <div 
                key={evt.id}
                onClick={() => evt.stock > 0 && openModal(evt)}
                className={`group flex flex-col bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-zinc-900 hover:-translate-y-1 ${evt.stock === 0 ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* Poster Image */}
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img 
                    src={evt.image} 
                    alt={evt.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {evt.stock === 0 && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                      SOLD OUT
                    </div>
                  )}
                  {evt.price === 'Gratis' && evt.stock > 0 && (
                    <div className="absolute top-3 left-3 bg-[#FFE800] text-black text-xs font-bold px-2 py-1 rounded">
                      FREE EVENT
                    </div>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xl font-medium text-white mb-3 tracking-tight">{evt.price}</p>
                  
                  <h3 className="text-sm font-semibold text-zinc-300 leading-snug mb-3 flex-1 group-hover:text-white transition-colors">
                    {evt.title}
                  </h3>
                  
                  <div className="flex flex-col gap-3 mt-auto">
                    {renderStars(evt.rating)}
                    
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className={`w-2 h-2 rounded-full ${evt.stock > 0 ? 'bg-[#FFE800] animate-pulse' : 'bg-zinc-600'}`}></span>
                      <span className={evt.stock > 0 ? 'text-[#FFE800]' : 'text-zinc-500'}>
                        {evt.status || (evt.stock > 0 ? 'In stock' : 'Sold out')} {evt.stock > 0 && `, ${evt.stock} slot`}
                               {((registrationCounts[evt.title] || 0) >= (evt.stock * 0.7) && evt.stock > 0) && (
                                   <span className="ml-2 text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full text-[10px]">Sisa {evt.stock - (registrationCounts[evt.title] || 0)} slot!</span>
                               )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Registration Modal Overlay */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 shadow-2xl relative custom-scrollbar">
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-full p-2 transition-colors z-20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            {isSuccess ? (
              <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-[#FFE800]/20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-[#FFE800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4">Pendaftaran Berhasil!</h2>
                <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                  Anda telah terdaftar untuk <strong className="text-white">{selectedEvent.title}</strong>. Kami akan segera menghubungi Anda melalui WhatsApp.
                </p>
                <button 
                  onClick={closeModal}
                  className="bg-[#FFE800] text-black font-bold py-3 px-8 rounded-lg hover:bg-[#FFE800]/90 transition-all"
                >
                  Kembali ke Katalog
                </button>
              </div>
            ) : (
              <div>
                {/* Modal Header Cover */}
                <div className="h-40 md:h-48 relative overflow-hidden rounded-t-2xl">
                  <img src={selectedEvent.image} className="w-full h-full object-cover opacity-40" alt="Cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
                  <div className="absolute bottom-4 left-6 pr-12">
                    <div className="bg-[#FFE800] text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest inline-block mb-2">
                      {selectedEvent.date}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{selectedEvent.title}</h2>
                  </div>
                </div>

                {/* Event Details (Long Text) */}
                {selectedEvent.detail_acara && (
                  <div className="px-6 md:px-8 pt-6">
                    <h3 className="text-sm font-bold text-[#FFE800] uppercase tracking-wider mb-2">Detail Acara</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap bg-zinc-900/50 p-4 rounded-lg border border-white/5">
                      {selectedEvent.detail_acara}
                    </p>
                  </div>
                )}

                {/* Form Content */}
                <div className="p-6 md:p-8 pt-6">
                  <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">Formulir Pendaftaran</h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
                        {errorMsg}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                      <input 
                        type="text" 
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Nomor WhatsApp</label>
                        <input 
                          type="tel" 
                          name="wa_number"
                          value={formData.wa_number}
                          onChange={handleChange}
                          placeholder="08123456789"
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Email</label>
                        <input 
                          type="email" 
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Brand & Model Kamera</label>
                      <input 
                        type="text" 
                        name="camera_model"
                        value={formData.camera_model}
                        onChange={handleChange}
                        placeholder="Contoh: Nikon Z8"
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] transition-colors"
                        required
                      />
                    </div>

                    {selectedEvent.price !== 'Gratis' && (
                      <div className="bg-zinc-900 border border-white/5 rounded-lg p-4 mt-2">
                        <label className="block text-xs font-medium text-[#FFE800] uppercase tracking-wider mb-2">Informasi Pembayaran</label>
                        <div className="text-sm text-zinc-300 mb-3 flex justify-between items-center bg-black/40 p-3 rounded">
                          <div>
                            <span className="text-zinc-500 text-xs block">Total Tagihan</span>
                            <span className="font-bold text-white text-base">{selectedEvent.price}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-500 text-xs block">Transfer ke Rekening</span>
                            <span className="font-bold text-white text-sm whitespace-pre-wrap">{selectedEvent.bank_info || 'BCA 1234567890\na.n Nikon Event Indonesia'}</span>
                          </div>
                        </div>
                        
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Upload Bukti Transfer</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setBuktiTransfer(e.target.files[0]);
                            }
                          }}
                          className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 transition-all cursor-pointer"
                        />
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full bg-[#FFE800] text-black font-bold py-3.5 rounded-lg mt-4 flex justify-center items-center gap-2 hover:bg-[#FFE800]/90 transition-all duration-300 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Memproses...
                        </>
                      ) : (
                        <>
                          Daftar & Konfirmasi
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </>
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #18181b; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b; 
        }
      `}} />
    </div>
  );
}
