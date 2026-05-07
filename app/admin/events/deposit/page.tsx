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
  event_name: string;
  status_pendaftaran: string;
  payment_type: string;
  ticket_url: string | null;
  bukti_pengembalian_deposit: string | null;
  status_pengembalian_deposit: string | null;
};

export default function AdminDepositPage() {
  const [registrations, setRegistrations] = useState<DepositRegistration[]>([]);
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
      .order('created_at', { ascending: false });
    if (!error && data) setRegistrations(data as unknown as DepositRegistration[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const filtered = registrations.filter(r => {
    if (filterStatus === 'pending_refund' && r.status_pengembalian_deposit === 'Processed') return false;
    if (filterStatus === 'refunded' && r.status_pengembalian_deposit !== 'Processed') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.nama_lengkap.toLowerCase().includes(q) && !r.nomor_wa.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: registrations.length,
    pending: registrations.filter(r => r.status_pengembalian_deposit !== 'Processed').length,
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-green-900/90 border-green-500/40 text-green-300' : 'bg-red-900/90 border-red-500/40 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 text-lg">NIKON</div>
            <span className="font-bold text-zinc-300 text-sm hidden sm:block">Admin · Kelola Deposit Event</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/events" className="text-xs text-zinc-400 hover:text-white transition-colors border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg">
              ← Validasi Pembayaran
            </a>
            <a href="/" className="text-xs text-zinc-400 hover:text-white transition-colors">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Info Banner */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-8 flex gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold text-orange-300 text-sm">Halaman Pengembalian Deposit</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Upload bukti pengembalian deposit dan sistem akan otomatis mengirim link via WhatsApp ke peserta.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Deposit', value: counts.all, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            { label: 'Belum Dikembalikan', value: counts.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Sudah Dikembalikan', value: counts.refunded, color: 'text-green-400', bg: 'bg-green-500/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white/5`}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Cari nama atau nomor WA..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] w-64"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FFE800]"
          >
            <option value="all">Semua</option>
            <option value="pending_refund">Belum Dikembalikan</option>
            <option value="refunded">Sudah Dikembalikan</option>
          </select>
          <button onClick={fetchRegistrations} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg border border-white/10 transition-all">
            Refresh
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FFE800]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 py-16 text-sm">Tidak ada peserta deposit.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map(reg => {
              const isRefunded = reg.status_pengembalian_deposit === 'Processed';
              return (
                <div key={reg.id} className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${isRefunded ? 'border-green-500/20' : 'border-orange-500/20'}`}>
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Left: Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${isRefunded ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                            {isRefunded ? '✓ Deposit Dikembalikan' : '⏳ Belum Dikembalikan'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${reg.status_pendaftaran === 'terdaftar' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-zinc-700 text-zinc-400 border-zinc-600'}`}>
                            Pembayaran: {reg.status_pendaftaran === 'terdaftar' ? 'Disetujui' : reg.status_pendaftaran}
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-lg">{reg.nama_lengkap}</h3>
                        <p className="text-zinc-400 text-sm mt-0.5">{reg.event_name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
                          <span>📱 {reg.nomor_wa}</span>
                        </div>

                        {isRefunded && reg.bukti_pengembalian_deposit && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => setPreviewUrl(reg.bukti_pengembalian_deposit)}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-all"
                            >
                              🖼️ Lihat Bukti Pengembalian
                            </button>
                            {reg.ticket_url && (
                              <a href={reg.ticket_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-900/40 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/30 transition-all">
                                🎫 Tiket
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Upload & Action */}
                      {!isRefunded && (
                        <div className="sm:w-64 flex flex-col gap-2">
                          <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Upload Bukti Pengembalian</label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                setUploadFiles(prev => ({ ...prev, [reg.id]: e.target.files![0] }));
                              }
                            }}
                            className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 transition-all cursor-pointer"
                          />
                          {uploadFiles[reg.id] && (
                            <p className="text-xs text-zinc-500 truncate">📎 {uploadFiles[reg.id].name}</p>
                          )}
                          <button
                            onClick={() => handleRefund(reg.id)}
                            disabled={uploadingId === reg.id}
                            className="w-full bg-[#FFE800] hover:bg-[#FFE800]/90 disabled:opacity-50 text-black text-sm font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            {uploadingId === reg.id ? (
                              <><span className="animate-spin">⏳</span> Memproses...</>
                            ) : (
                              <>💸 Proses & Kirim WA</>
                            )}
                          </button>
                          <p className="text-xs text-zinc-600 text-center">Akan mengirim link via WhatsApp</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Preview Modal */}
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
