'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-to-prevent-error';
const supabase = createClient(supabaseUrl, supabaseKey);

type Registration = {
  id: string;
  nama_lengkap: string;
  nomor_wa: string;
  event_name: string;
  event_id: string | null;
  status_pendaftaran: string;
  payment_type: string;
  status_pengembalian_deposit: string | null;
  bukti_pengembalian_deposit: string | null;
  nama_bank: string | null;
  no_rekening: string | null;
};

type EventInfo = { id: string; event_title: string; event_date: string; deposit_amount: string | null };

export default function DepositRefundPage() {
  const [step, setStep] = useState<'lookup' | 'select' | 'form' | 'success'>('lookup');
  const [waInput, setWaInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registrations, setRegistrations] = useState<(Registration & { event?: EventInfo })[]>([]);
  const [selectedReg, setSelectedReg] = useState<(Registration & { event?: EventInfo }) | null>(null);
  const [formData, setFormData] = useState({ nama_bank: '', no_rekening: '' });

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { data: regs, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('nomor_wa', waInput.trim())
        .eq('payment_type', 'deposit');

      if (error) throw error;
      if (!regs || regs.length === 0) {
        setErrorMsg('Tidak ditemukan pendaftaran deposit untuk nomor WhatsApp ini.');
        setIsLoading(false);
        return;
      }

      const eventIds = [...new Set(regs.map(r => r.event_id).filter(Boolean))];
      let eventsMap: Record<string, EventInfo> = {};
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('events')
          .select('id, event_title, event_date, deposit_amount')
          .in('id', eventIds as string[]);
        if (events) {
          events.forEach((ev: any) => { eventsMap[ev.id] = ev; });
        }
      }

      const enriched = regs.map((r: Registration) => ({ ...r, event: r.event_id ? eventsMap[r.event_id] : undefined }));
      setRegistrations(enriched);
      setStep('select');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mencari data pendaftaran.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (reg: Registration & { event?: EventInfo }) => {
    setSelectedReg(reg);
    setFormData({ nama_bank: reg.nama_bank || '', no_rekening: reg.no_rekening || '' });
    setErrorMsg('');
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({
          nama_bank: formData.nama_bank.trim(),
          no_rekening: formData.no_rekening.trim(),
          status_pengembalian_deposit: selectedReg.status_pengembalian_deposit === 'Processed' ? 'Processed' : 'requested',
          refund_requested_at: new Date().toISOString(),
        })
        .eq('id', selectedReg.id);

      if (error) throw error;
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim data pengembalian.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep('lookup');
    setWaInput('');
    setRegistrations([]);
    setSelectedReg(null);
    setFormData({ nama_bank: '', no_rekening: '' });
    setErrorMsg('');
  };

  const refundStatusLabel = (s: string | null) => {
    if (!s) return null;
    if (s === 'Processed') return { label: 'Sudah Dikembalikan', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    if (s === 'requested') return { label: 'Data Sudah Diisi (Menunggu Transfer)', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    return { label: s, color: 'bg-zinc-700 text-zinc-300 border-zinc-600' };
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#FFE800] selection:text-black">
      <header className="border-b border-white/10 bg-zinc-950 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 tracking-tighter text-xl">NIKON</div>
            <span className="font-bold tracking-widest uppercase text-sm hidden sm:block ml-2">Pengembalian Deposit</span>
          </div>
          <a href="/events/register" className="text-xs text-zinc-400 hover:text-white transition-colors">← Katalog Event</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-8 flex gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold text-orange-300 text-sm">Form Pengembalian Deposit</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Isi form ini untuk mengajukan pengembalian deposit setelah acara selesai. Pastikan nomor rekening yang Anda berikan sudah benar.
            </p>
          </div>
        </div>

        {/* STEP: LOOKUP */}
        {step === 'lookup' && (
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8">
            <h1 className="text-2xl font-bold mb-2">Cari Data Pendaftaran</h1>
            <p className="text-zinc-400 text-sm mb-6">Masukkan nomor WhatsApp yang digunakan saat mendaftar event.</p>

            <form onSubmit={handleLookup} className="space-y-4">
              {errorMsg && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">{errorMsg}</div>}
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={waInput}
                  onChange={e => setWaInput(e.target.value)}
                  placeholder="08123456789"
                  required
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800]"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#FFE800] text-black font-bold py-3.5 rounded-lg flex justify-center items-center gap-2 hover:bg-[#FFE800]/90 transition-all disabled:opacity-70"
              >
                {isLoading ? 'Mencari...' : 'Cari Pendaftaran Saya'}
              </button>
            </form>
          </div>
        )}

        {/* STEP: SELECT */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Pilih Event</h1>
              <button onClick={reset} className="text-xs text-zinc-400 hover:text-white">← Cari nomor lain</button>
            </div>
            <p className="text-zinc-400 text-sm">Ditemukan {registrations.length} pendaftaran deposit. Pilih event yang ingin Anda klaim pengembalian depositnya.</p>

            {registrations.map(reg => {
              const refundInfo = refundStatusLabel(reg.status_pengembalian_deposit);
              const isProcessed = reg.status_pengembalian_deposit === 'Processed';
              return (
                <div key={reg.id} className={`bg-zinc-950 border rounded-2xl p-5 transition-all ${isProcessed ? 'border-green-500/20 opacity-70' : 'border-white/10 hover:border-[#FFE800]/40'}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-bold text-white text-lg leading-tight">{reg.event?.event_title || reg.event_name}</h3>
                      <p className="text-zinc-400 text-sm mt-0.5">📅 {reg.event?.event_date || '-'}</p>
                    </div>
                    {refundInfo && (
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border whitespace-nowrap ${refundInfo.color}`}>{refundInfo.label}</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 space-y-1">
                    <p>👤 {reg.nama_lengkap}</p>
                    <p>📱 {reg.nomor_wa}</p>
                    {reg.event?.deposit_amount && <p className="text-orange-400">💵 Deposit: {reg.event.deposit_amount}</p>}
                    <p>Status pendaftaran: <span className="font-semibold text-zinc-300">{reg.status_pendaftaran}</span></p>
                  </div>
                  <div className="mt-4">
                    {isProcessed ? (
                      reg.bukti_pengembalian_deposit ? (
                        <a href={reg.bukti_pengembalian_deposit} target="_blank" rel="noopener noreferrer" className="inline-block text-xs bg-green-900/40 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg font-bold hover:bg-green-900/60">
                          🎫 Lihat Bukti Pengembalian
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-500">Deposit sudah dikembalikan via WhatsApp</span>
                      )
                    ) : (
                      <button
                        onClick={() => handleSelect(reg)}
                        className="w-full bg-[#FFE800] text-black font-bold py-2.5 rounded-lg hover:bg-[#FFE800]/90 transition-all text-sm"
                      >
                        {reg.nama_bank ? 'Update Data Rekening' : 'Ajukan Pengembalian Deposit'} →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP: FORM */}
        {step === 'form' && selectedReg && (
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8">
            <button onClick={() => setStep('select')} className="text-xs text-zinc-400 hover:text-white mb-4">← Pilih event lain</button>
            <h1 className="text-2xl font-bold mb-2">Form Pengembalian Deposit</h1>
            <p className="text-zinc-400 text-sm mb-6">Lengkapi data rekening untuk transfer pengembalian deposit.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">{errorMsg}</div>}

              {/* Read-only info from registration */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 space-y-2">
                <p className="text-xs text-[#FFE800] font-bold uppercase tracking-wider mb-2">Data Pendaftaran (terhubung otomatis)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs">Event</p>
                    <p className="text-white font-semibold">{selectedReg.event?.event_title || selectedReg.event_name}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs">Tanggal Acara</p>
                    <p className="text-white font-semibold">{selectedReg.event?.event_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs">Nama Lengkap</p>
                    <p className="text-white font-semibold">{selectedReg.nama_lengkap}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs">Nomor WhatsApp</p>
                    <p className="text-white font-semibold">{selectedReg.nomor_wa}</p>
                  </div>
                  {selectedReg.event?.deposit_amount && (
                    <div className="md:col-span-2">
                      <p className="text-zinc-500 text-xs">Jumlah Deposit yang Akan Dikembalikan</p>
                      <p className="text-orange-400 font-bold text-lg">{selectedReg.event.deposit_amount}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Nama Bank</label>
                <input
                  type="text"
                  list="bank-options"
                  value={formData.nama_bank}
                  onChange={e => setFormData({ ...formData, nama_bank: e.target.value })}
                  placeholder="Contoh: BCA, Mandiri, BNI, BRI, BSI"
                  required
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800]"
                />
                <datalist id="bank-options">
                  <option value="BCA" />
                  <option value="Mandiri" />
                  <option value="BNI" />
                  <option value="BRI" />
                  <option value="BSI" />
                  <option value="CIMB Niaga" />
                  <option value="Permata" />
                  <option value="Danamon" />
                  <option value="Maybank" />
                  <option value="OCBC NISP" />
                  <option value="Jenius" />
                  <option value="SeaBank" />
                  <option value="Bank Jago" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.no_rekening}
                  onChange={e => setFormData({ ...formData, no_rekening: e.target.value.replace(/\D/g, '') })}
                  placeholder="1234567890"
                  required
                  pattern="[0-9]{6,20}"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">Pastikan nomor rekening atas nama yang sama dengan nama lengkap di atas.</p>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-xs text-orange-300">
                <strong>Catatan:</strong> Tim Nikon akan memproses transfer ke rekening ini setelah acara selesai. Pastikan data benar — kesalahan transfer karena data salah bukan tanggung jawab Nikon.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#FFE800] text-black font-bold py-3.5 rounded-lg flex justify-center items-center gap-2 hover:bg-[#FFE800]/90 transition-all disabled:opacity-70"
              >
                {isLoading ? 'Mengirim...' : 'Kirim Data Rekening'}
              </button>
            </form>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {step === 'success' && selectedReg && (
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-10 text-center">
            <div className="w-20 h-20 bg-[#FFE800]/20 rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg className="w-10 h-10 text-[#FFE800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">Data Diterima!</h2>
            <p className="text-zinc-400 mb-2 max-w-md mx-auto">
              Data rekening untuk event <strong className="text-white">{selectedReg.event?.event_title || selectedReg.event_name}</strong> telah kami simpan.
            </p>
            <p className="text-zinc-500 text-sm mb-8 max-w-md mx-auto">
              Tim Nikon akan memproses transfer pengembalian deposit ke rekening Anda. Bukti transfer akan dikirim via WhatsApp.
            </p>
            <div className="bg-zinc-900/50 rounded-lg p-4 mb-6 inline-block text-left text-sm">
              <p className="text-zinc-500 text-xs">Akan transfer ke:</p>
              <p className="text-white font-bold">{formData.nama_bank}</p>
              <p className="text-white font-mono">{formData.no_rekening}</p>
              <p className="text-zinc-400 text-xs mt-1">a.n {selectedReg.nama_lengkap}</p>
            </div>
            <div>
              <button onClick={reset} className="bg-[#FFE800] text-black font-bold py-3 px-8 rounded-lg hover:bg-[#FFE800]/90 transition-all">
                Selesai
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
