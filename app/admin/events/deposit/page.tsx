'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type DepositRegistration = {
  id: string;
  created_at: string;
  nama_lengkap: string;
  nomor_wa: string;
  kabupaten_kotamadya: string | null;
  event_name: string;
  event_id: string | null;
  status_pendaftaran: string;
  payment_type: string;
  ticket_url: string | null;
  bukti_transfer_url: string | null;
  bukti_pengembalian_deposit: string | null;
  status_pengembalian_deposit: string | null;
  nama_bank: string | null;
  no_rekening: string | null;
  nama_pemilik_rekening: string | null;
  refund_requested_at: string | null;
};

type EventInfo = { id: string; event_title: string; event_date: string; deposit_amount: string | null };

export default function AdminDepositPage() {
  const [registrations, setRegistrations] = useState<(DepositRegistration & { event?: EventInfo })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<Record<string, File>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('payment_type', 'deposit')
      .order('refund_requested_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      const eventIds = [...new Set(data.map((r: any) => r.event_id).filter(Boolean))];
      let eventsMap: Record<string, EventInfo> = {};
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('events')
          .select('id, event_title, event_date, deposit_amount')
          .in('id', eventIds as string[]);
        if (events) events.forEach((ev: any) => { eventsMap[ev.id] = ev; });
      }
      setRegistrations(data.map((r: any) => ({ ...r, event: r.event_id ? eventsMap[r.event_id] : undefined })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const filtered = registrations.filter(r => {
    if (filterStatus === 'no_data' && (r.nama_bank && r.no_rekening)) return false;
    if (filterStatus === 'requested' && r.status_pengembalian_deposit !== 'requested') return false;
    if (filterStatus === 'refunded' && r.status_pengembalian_deposit !== 'Processed') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.nama_lengkap.toLowerCase().includes(q) && !r.nomor_wa.includes(q) && !r.event_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: registrations.length,
    no_data: registrations.filter(r => !r.nama_bank || !r.no_rekening).length,
    requested: registrations.filter(r => r.status_pengembalian_deposit === 'requested').length,
    refunded: registrations.filter(r => r.status_pengembalian_deposit === 'Processed').length,
  };

  const handleRefund = async (regId: string) => {
    setUploadingId(regId);
    try {
      const formData = new FormData();
      formData.append('registrationId', regId);
      if (uploadFiles[regId]) {
        formData.append('refundFile', uploadFiles[regId]);
      }

      const res = await fetch('/api/events/deposit-refund', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Pengembalian deposit berhasil diproses. Notifikasi dikirim via WhatsApp!');
      setUploadFiles(prev => { const n = { ...prev }; delete n[regId]; return n; });
      fetchRegistrations();
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} disalin: ${text}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-green-900/90 border-green-500/40 text-green-300' : 'bg-red-900/90 border-red-500/40 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      <header className="border-b border-white/10 bg-zinc-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 text-lg">NIKON</div>
            <span className="font-bold text-zinc-300 text-sm hidden sm:block">Admin · Pengecekan & Pengembalian Deposit</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/events" className="text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg">
              ← Validasi Pembayaran
            </a>
            <a href="/" className="text-xs text-zinc-400 hover:text-white">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-8 flex gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold text-orange-300 text-sm">Pengembalian Deposit Peserta Event</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Peserta mengisi data rekening melalui <a href="/events/refund" target="_blank" className="text-[#FFE800] hover:underline">/events/refund</a>. Setelah transfer, upload bukti pengembalian — sistem otomatis kirim notifikasi WhatsApp.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { id: 'all', label: 'Total Deposit', value: counts.all, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            { id: 'no_data', label: 'Belum Isi Rekening', value: counts.no_data, color: 'text-zinc-300', bg: 'bg-zinc-800/50' },
            { id: 'requested', label: 'Menunggu Transfer', value: counts.requested, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { id: 'refunded', label: 'Sudah Dikembalikan', value: counts.refunded, color: 'text-green-400', bg: 'bg-green-500/10' },
          ].map(s => (
            <button key={s.id} onClick={() => setFilterStatus(s.id)} className={`${s.bg} rounded-xl p-4 border text-left transition-all ${filterStatus === s.id ? 'border-[#FFE800]/50' : 'border-white/5 hover:border-white/20'}`}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Cari nama, WA, atau event..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] w-64"
          />
          <button onClick={fetchRegistrations} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg border border-white/10">
            🔄 Refresh
          </button>
          <button onClick={() => setFilterStatus('all')} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg border border-white/10">
            Reset Filter
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FFE800]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 py-16 text-sm">Tidak ada data sesuai filter.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map(reg => {
              const isRefunded = reg.status_pengembalian_deposit === 'Processed';
              const hasBank = reg.nama_bank && reg.no_rekening;
              const isRequested = reg.status_pengembalian_deposit === 'requested';
              return (
                <div key={reg.id} className={`bg-zinc-900 border rounded-xl overflow-hidden ${isRefunded ? 'border-green-500/20' : isRequested ? 'border-yellow-500/30' : 'border-orange-500/20'}`}>
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row gap-5">
                      {/* Left: Registration & Event Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {isRefunded ? (
                            <span className="text-xs px-2 py-0.5 rounded-full border font-semibold bg-green-500/20 text-green-400 border-green-500/30">✓ Sudah Dikembalikan</span>
                          ) : isRequested ? (
                            <span className="text-xs px-2 py-0.5 rounded-full border font-semibold bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏳ Menunggu Transfer</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full border font-semibold bg-zinc-700 text-zinc-300 border-zinc-600">Belum Isi Rekening</span>
                          )}
                          <span className="text-[10px] text-zinc-500">Daftar: {new Date(reg.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {reg.refund_requested_at && (
                            <span className="text-[10px] text-zinc-500">· Isi rekening: {new Date(reg.refund_requested_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                          )}
                        </div>

                        <h3 className="font-bold text-white text-lg leading-tight">{reg.event?.event_title || reg.event_name}</h3>
                        <p className="text-zinc-400 text-sm mt-0.5">📅 {reg.event?.event_date || '-'}</p>
                        {reg.event?.deposit_amount && (
                          <p className="text-orange-400 text-sm font-bold mt-1">💵 {reg.event.deposit_amount}</p>
                        )}

                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-zinc-200 font-bold">{reg.nama_lengkap}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-zinc-500">
                            <span>📱 {reg.nomor_wa}</span>
                            {reg.kabupaten_kotamadya && <span>📍 {reg.kabupaten_kotamadya}</span>}
                          </div>
                        </div>

                        {/* Bukti pembayaran deposit (saat pendaftaran) — untuk cross-check */}
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Bukti Bayar Deposit (saat daftar)</p>
                          {reg.bukti_transfer_url ? (
                            <button
                              onClick={() => setPreviewUrl(reg.bukti_transfer_url)}
                              className="text-xs bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 px-3 py-2 rounded-lg border border-blue-500/30 transition-all flex items-center gap-2"
                            >
                              🖼️ Lihat Bukti Transfer Pendaftaran
                            </button>
                          ) : (
                            <p className="text-xs text-zinc-600 italic">Tidak ada bukti tersimpan</p>
                          )}
                        </div>
                      </div>

                      {/* Middle: Bank Info */}
                      <div className="lg:w-72 lg:border-l lg:border-white/5 lg:pl-5">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-2">Data Rekening Tujuan</p>
                        {hasBank ? (
                          <div className="space-y-2">
                            <div className="bg-zinc-800/60 rounded-lg p-3">
                              <p className="text-zinc-500 text-[10px] uppercase">Bank</p>
                              <p className="text-white font-bold text-base flex items-center justify-between">
                                {reg.nama_bank}
                                <button onClick={() => copyToClipboard(reg.nama_bank!, 'Nama bank')} className="text-zinc-500 hover:text-white text-xs">📋</button>
                              </p>
                            </div>
                            <div className="bg-zinc-800/60 rounded-lg p-3">
                              <p className="text-zinc-500 text-[10px] uppercase">No Rekening</p>
                              <p className="text-white font-bold text-base font-mono flex items-center justify-between">
                                {reg.no_rekening}
                                <button onClick={() => copyToClipboard(reg.no_rekening!, 'Nomor rekening')} className="text-zinc-500 hover:text-white text-xs">📋</button>
                              </p>
                            </div>
                            <div className="bg-zinc-800/60 rounded-lg p-3">
                              <p className="text-zinc-500 text-[10px] uppercase">Atas Nama</p>
                              <p className="text-white font-bold text-sm flex items-center justify-between">
                                {reg.nama_pemilik_rekening || reg.nama_lengkap}
                                <button onClick={() => copyToClipboard(reg.nama_pemilik_rekening || reg.nama_lengkap, 'Nama pemilik rekening')} className="text-zinc-500 hover:text-white text-xs">📋</button>
                              </p>
                              {reg.nama_pemilik_rekening && reg.nama_pemilik_rekening.toLowerCase() !== reg.nama_lengkap.toLowerCase() && (
                                <p className="text-[10px] text-yellow-400 mt-1">⚠️ Berbeda dari nama peserta ({reg.nama_lengkap})</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-800/40 border border-dashed border-zinc-700 rounded-lg p-4 text-center">
                            <p className="text-zinc-500 text-xs">Peserta belum mengisi data rekening</p>
                            <p className="text-zinc-600 text-[10px] mt-1">Arahkan ke <span className="text-[#FFE800]">/events/refund</span></p>
                          </div>
                        )}
                      </div>

                      {/* Right: Action */}
                      <div className="lg:w-64 flex flex-col gap-2">
                        {isRefunded ? (
                          <>
                            {reg.bukti_pengembalian_deposit && (
                              <button
                                onClick={() => setPreviewUrl(reg.bukti_pengembalian_deposit)}
                                className="text-xs bg-green-900/30 hover:bg-green-900/50 text-green-300 px-3 py-2 rounded-lg border border-green-500/30 transition-all"
                              >
                                🖼️ Lihat Bukti Transfer
                              </button>
                            )}
                            {reg.ticket_url && (
                              <a href={reg.ticket_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-900/40 text-blue-300 px-3 py-2 rounded-lg border border-blue-500/30 text-center">
                                🎫 Tiket
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Upload Bukti Transfer</label>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              disabled={!hasBank}
                              onChange={e => {
                                if (e.target.files?.[0]) {
                                  setUploadFiles(prev => ({ ...prev, [reg.id]: e.target.files![0] }));
                                }
                              }}
                              className="text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                            />
                            {uploadFiles[reg.id] && (
                              <p className="text-xs text-zinc-500 truncate">📎 {uploadFiles[reg.id].name}</p>
                            )}
                            <button
                              onClick={() => handleRefund(reg.id)}
                              disabled={uploadingId === reg.id || !hasBank}
                              className="w-full bg-[#FFE800] hover:bg-[#FFE800]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
                            >
                              {uploadingId === reg.id ? (
                                <><span className="animate-spin">⏳</span> Memproses...</>
                              ) : (
                                <>💸 Tandai Selesai & Kirim WA</>
                              )}
                            </button>
                            {!hasBank && (
                              <p className="text-[10px] text-zinc-600 text-center">Tidak bisa proses sebelum peserta isi rekening</p>
                            )}
                          </>
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

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-10 right-0 text-zinc-400 hover:text-white text-sm">✕ Tutup</button>
            <img src={previewUrl} alt="Bukti Pengembalian" className="w-full rounded-xl border border-white/10 shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
