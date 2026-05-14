'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Registration = {
  id: string;
  created_at: string;
  nama_lengkap: string;
  nomor_wa: string;
  kabupaten_kotamadya: string | null;
  tipe_kamera: string | null;
  event_name: string;
  bukti_transfer_url: string | null;
  status_pendaftaran: 'menunggu_validasi' | 'terdaftar' | 'ditolak';
  payment_type: 'regular' | 'deposit';
  ticket_url: string | null;
  status_pengembalian_deposit: string | null;
  bukti_pengembalian_deposit: string | null;
  rejection_reason: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  menunggu_validasi: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  terdaftar: 'bg-green-500/20 text-green-400 border-green-500/30',
  ditolak: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  menunggu_validasi: 'Menunggu Validasi',
  terdaftar: 'Terdaftar',
  ditolak: 'Ditolak',
};

export default function AdminEventsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRegistrations(data as Registration[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRegistrations();
  }, [fetchRegistrations]);

  const uniqueEvents = Array.from(new Set(registrations.map(r => r.event_name)));

  const filtered = registrations.filter(r => {
    if (filterStatus !== 'all' && r.status_pendaftaran !== filterStatus) return false;
    if (filterEvent !== 'all' && r.event_name !== filterEvent) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.nama_lengkap.toLowerCase().includes(q) && !r.nomor_wa.includes(q)) return false;
    }
    return true;
  });

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/events/validate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: id, action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Pembayaran disetujui. Tiket dikirim via WhatsApp!');
      fetchRegistrations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyetujui';
      showToast(message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessingId(rejectModal.id);
    try {
      const res = await fetch('/api/events/validate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: rejectModal.id, action: 'reject', rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Pendaftaran ditolak. Notifikasi dikirim via WhatsApp.');
      setRejectModal(null);
      setRejectionReason('');
      fetchRegistrations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menolak';
      showToast(message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const counts = {
    all: registrations.length,
    menunggu_validasi: registrations.filter(r => r.status_pendaftaran === 'menunggu_validasi').length,
    terdaftar: registrations.filter(r => r.status_pendaftaran === 'terdaftar').length,
    ditolak: registrations.filter(r => r.status_pendaftaran === 'ditolak').length,
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
            <span className="font-bold text-zinc-300 text-sm hidden sm:block">Admin · Validasi Pembayaran Event</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/events/deposit" className="text-xs text-[#FFE800] border border-[#FFE800]/40 hover:bg-[#FFE800]/10 px-3 py-1.5 rounded-lg transition-all font-semibold">
              Kelola Deposit →
            </Link>
            <Link href="/" className="text-xs text-zinc-400 hover:text-white transition-colors">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: counts.all, color: 'text-white', bg: 'bg-zinc-800' },
            { label: 'Menunggu Validasi', value: counts.menunggu_validasi, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Terdaftar', value: counts.terdaftar, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Ditolak', value: counts.ditolak, color: 'text-red-400', bg: 'bg-red-500/10' },
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
            <option value="all">Semua Status</option>
            <option value="menunggu_validasi">Menunggu Validasi</option>
            <option value="terdaftar">Terdaftar</option>
            <option value="ditolak">Ditolak</option>
          </select>
          <select
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#FFE800]"
          >
            <option value="all">Semua Event</option>
            {uniqueEvents.map(ev => <option key={ev} value={ev}>{ev}</option>)}
          </select>
          <button onClick={fetchRegistrations} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg border border-white/10 transition-all">
            Refresh
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FFE800]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 py-16 text-sm">Tidak ada data pendaftaran.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(reg => (
              <div key={reg.id} className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all">
                <div className="p-5 flex flex-col sm:flex-row gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[reg.status_pendaftaran]}`}>
                        {STATUS_LABELS[reg.status_pendaftaran]}
                      </span>
                      {reg.payment_type === 'deposit' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">DEPOSIT</span>
                      )}
                      <span className="text-xs text-zinc-500">{new Date(reg.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <h3 className="font-bold text-white text-lg">{reg.nama_lengkap}</h3>
                    <p className="text-zinc-400 text-sm mt-0.5">{reg.event_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
                      <span>📱 {reg.nomor_wa}</span>
                      {reg.kabupaten_kotamadya && <span>📍 {reg.kabupaten_kotamadya}</span>}
                      {reg.tipe_kamera && <span>📷 {reg.tipe_kamera}</span>}
                    </div>
                    {reg.rejection_reason && (
                      <p className="text-xs text-red-400 mt-2 bg-red-500/10 px-3 py-1.5 rounded-lg">Alasan: {reg.rejection_reason}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 sm:items-end justify-start">
                    {reg.bukti_transfer_url && (
                      <button
                        onClick={() => setPreviewUrl(reg.bukti_transfer_url)}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-all flex items-center gap-1"
                      >
                        🖼️ Lihat Bukti
                      </button>
                    )}
                    {reg.ticket_url && (
                      <a href={reg.ticket_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/30 transition-all flex items-center gap-1">
                        🎫 Lihat Tiket
                      </a>
                    )}

                    {reg.status_pendaftaran === 'menunggu_validasi' && (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleApprove(reg.id)}
                          disabled={processingId === reg.id}
                          className="text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg transition-all"
                        >
                          {processingId === reg.id ? '...' : '✓ Setujui'}
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: reg.id, name: reg.nama_lengkap })}
                          disabled={processingId === reg.id}
                          className="text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg transition-all"
                        >
                          ✕ Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)} className="absolute -top-10 right-0 text-zinc-400 hover:text-white text-sm">✕ Tutup</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Bukti Transfer" className="w-full rounded-xl border border-white/10 shadow-2xl" />
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Tolak Pendaftaran</h3>
            <p className="text-zinc-400 text-sm mb-4">Tolak pendaftaran <strong className="text-white">{rejectModal.name}</strong>? Notifikasi akan dikirim via WhatsApp.</p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Alasan penolakan (opsional)"
              rows={3}
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectionReason(''); }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={!!processingId}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition-all"
              >
                {processingId ? '...' : 'Tolak & Kirim WA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*
        SQL Migration needed:

        -- Rename events table columns
        ALTER TABLE events RENAME COLUMN title TO event_title;
        ALTER TABLE events RENAME COLUMN date TO event_date;
        ALTER TABLE events RENAME COLUMN image TO event_image;
        ALTER TABLE events RENAME COLUMN price TO event_price;
        ALTER TABLE events RENAME COLUMN stock TO event_partisipant_stock;
        ALTER TABLE events RENAME COLUMN status TO event_status;
        ALTER TABLE events RENAME COLUMN detail_acara TO event_description;
        ALTER TABLE events RENAME COLUMN payment_type TO event_payment_tipe;
        -- Add new columns to events
        ALTER TABLE events ADD COLUMN IF NOT EXISTS event_speaker TEXT;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS event_speaker_genre TEXT;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS event_upload_payment_screenshot TEXT;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS proposal_event_id TEXT REFERENCES budget_approval(id_budget);

        -- Rename event_registrations table columns
        ALTER TABLE event_registrations RENAME COLUMN full_name TO nama_lengkap;
        ALTER TABLE event_registrations RENAME COLUMN wa_number TO nomor_wa;
        ALTER TABLE event_registrations RENAME COLUMN camera_model TO tipe_kamera;
        ALTER TABLE event_registrations RENAME COLUMN status TO status_pendaftaran;
        ALTER TABLE event_registrations RENAME COLUMN deposit_refund_status TO status_pengembalian_deposit;
        ALTER TABLE event_registrations RENAME COLUMN deposit_refund_url TO bukti_pengembalian_deposit;
        -- Add new columns to event_registrations
        ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS kabupaten_kotamadya TEXT;
        -- Update status_pendaftaran values
        UPDATE event_registrations SET status_pendaftaran = 'menunggu_validasi' WHERE status_pendaftaran = 'Pending';
        UPDATE event_registrations SET status_pendaftaran = 'terdaftar' WHERE status_pendaftaran = 'Approved';
        UPDATE event_registrations SET status_pendaftaran = 'ditolak' WHERE status_pendaftaran = 'Rejected';
        -- Update event_status values
        UPDATE events SET event_status = 'available' WHERE event_status = 'aktif';
        UPDATE events SET event_status = 'sold_out' WHERE event_status = 'sold out';
      */}
    </div>
  );
}
