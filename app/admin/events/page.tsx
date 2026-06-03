'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  typeof window !== 'undefined' ? (window.location.origin + '/api/admin/sb') : (process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
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
  catatan_validasi: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  menunggu_validasi: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  terdaftar: 'bg-green-50 text-green-700 border-green-300',
  ditolak: 'bg-red-50 text-red-700 border-red-300',
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
  const [approveModal, setApproveModal] = useState<{ id: string; name: string } | null>(null);
  const [catatanValidasi, setCatatanValidasi] = useState('');
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

  const handleApprove = async (id: string, catatan?: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/events/validate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: id, action: 'approve', catatanValidasi: catatan || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Pembayaran disetujui. Tiket dikirim via WhatsApp!');
      setApproveModal(null);
      setCatatanValidasi('');
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
        body: JSON.stringify({ registrationId: rejectModal.id, action: 'reject', rejectionReason, catatanValidasi: catatanValidasi || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Pendaftaran ditolak. Notifikasi dikirim via WhatsApp.');
      setRejectModal(null);
      setRejectionReason('');
      setCatatanValidasi('');
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

  const countPerEvent = uniqueEvents.map(ev => ({
    name: ev,
    total: registrations.filter(r => r.event_name === ev).length,
    terdaftar: registrations.filter(r => r.event_name === ev && r.status_pendaftaran === 'terdaftar').length,
    menunggu: registrations.filter(r => r.event_name === ev && r.status_pendaftaran === 'menunggu_validasi').length,
  }));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border ${toast.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 text-lg tracking-wide">NIKON</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Validasi Pembayaran Event</p>
              <p className="text-xs text-gray-400 hidden sm:block">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/events/deposit" className="text-xs font-semibold text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-all">
              Kelola Deposit →
            </Link>
            <Link href="/admin/events/attendance" className="text-xs font-semibold text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-all">
              Absensi →
            </Link>
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-900 transition-colors ml-1">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Pendaftar', value: counts.all, color: 'text-gray-900', border: 'border-l-gray-400', bg: 'bg-white' },
            { label: 'Menunggu Validasi', value: counts.menunggu_validasi, color: 'text-yellow-600', border: 'border-l-yellow-400', bg: 'bg-white' },
            { label: 'Terdaftar', value: counts.terdaftar, color: 'text-green-600', border: 'border-l-green-400', bg: 'bg-white' },
            { label: 'Ditolak', value: counts.ditolak, color: 'text-red-600', border: 'border-l-red-400', bg: 'bg-white' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-200 border-l-4 ${s.border} shadow-sm`}>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Per-Event Count */}
        {countPerEvent.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Jumlah Peserta per Event</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {countPerEvent.map(ev => (
                <div key={ev.name} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="font-semibold text-gray-900 text-sm truncate" title={ev.name}>{ev.name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-2xl font-bold text-gray-900">{ev.total}</span>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      <div><span className="text-green-600 font-semibold">{ev.terdaftar}</span> terdaftar</div>
                      <div><span className="text-yellow-600 font-semibold">{ev.menunggu}</span> menunggu</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Cari nama atau nomor WA..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] w-64 shadow-sm"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#FFE800] shadow-sm"
          >
            <option value="all">Semua Status</option>
            <option value="menunggu_validasi">Menunggu Validasi</option>
            <option value="terdaftar">Terdaftar</option>
            <option value="ditolak">Ditolak</option>
          </select>
          <select
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#FFE800] shadow-sm"
          >
            <option value="all">Semua Event</option>
            {uniqueEvents.map(ev => <option key={ev} value={ev}>{ev}</option>)}
          </select>
          <button onClick={fetchRegistrations} className="bg-white hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg border border-gray-300 shadow-sm transition-all font-medium">
            🔄 Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FFE800]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm bg-white rounded-xl border border-gray-200 shadow-sm">
            Tidak ada data pendaftaran.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(reg => (
              <div key={reg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all hover:border-gray-300">
                <div className="p-5 flex flex-col sm:flex-row gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[reg.status_pendaftaran]}`}>
                        {STATUS_LABELS[reg.status_pendaftaran]}
                      </span>
                      {reg.payment_type === 'deposit' && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-300 font-semibold">DEPOSIT</span>
                      )}
                      <span className="text-xs text-gray-400">{new Date(reg.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-lg">{reg.nama_lengkap}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{reg.event_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      <span>📱 {reg.nomor_wa}</span>
                      {reg.kabupaten_kotamadya && <span>📍 {reg.kabupaten_kotamadya}</span>}
                      {reg.tipe_kamera && <span>📷 {reg.tipe_kamera}</span>}
                    </div>
                    {reg.rejection_reason && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Alasan: {reg.rejection_reason}</p>
                    )}
                    {reg.catatan_validasi && (
                      <p className="text-xs text-blue-700 mt-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">📝 Catatan: {reg.catatan_validasi}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 sm:items-end justify-start">
                    {reg.bukti_transfer_url && (
                      <button
                        onClick={() => {
                          const id = reg.bukti_transfer_url!.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
                          setPreviewUrl(id ? `/api/drive-file?id=${id}` : reg.bukti_transfer_url);
                        }}
                        className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 transition-all flex items-center gap-1 font-medium shadow-sm"
                      >
                        🖼️ Lihat Bukti
                      </button>
                    )}
                    {reg.ticket_url && (
                      <a href={reg.ticket_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 transition-all flex items-center gap-1 font-medium">
                        🎫 Lihat Tiket
                      </a>
                    )}

                    {reg.status_pendaftaran === 'menunggu_validasi' && (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => setApproveModal({ id: reg.id, name: reg.nama_lengkap })}
                          disabled={processingId === reg.id}
                          className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg transition-all shadow-sm"
                        >
                          {processingId === reg.id ? '...' : '✓ Setujui'}
                        </button>
                        <button
                          onClick={() => { setRejectModal({ id: reg.id, name: reg.nama_lengkap }); setCatatanValidasi(''); }}
                          disabled={processingId === reg.id}
                          className="text-xs bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 font-bold px-4 py-1.5 rounded-lg border border-red-300 transition-all"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          {/* Tombol close floating — selalu terlihat */}
          <button
            onClick={() => setPreviewUrl(null)}
            aria-label="Tutup preview"
            className="fixed top-4 right-4 z-[60] w-11 h-11 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all border border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center justify-center min-h-full p-4 pt-16" onClick={e => e.stopPropagation()}>
            <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">↗ Buka di tab baru</a>
              </div>
              <div className="p-4 overflow-y-auto max-h-[80vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Bukti Transfer"
                  className="w-full rounded-lg border border-gray-200"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }}
                />
                <div style={{ display: 'none' }} className="flex-col items-center justify-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-10 text-center">
                  <span className="text-4xl">📄</span>
                  <p className="text-gray-500 text-sm">File tidak bisa di-preview (mungkin PDF).</p>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium">Buka File ↗</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Setujui Pembayaran</h3>
            <p className="text-gray-500 text-sm mb-4">Setujui pendaftaran <strong className="text-gray-900">{approveModal.name}</strong>? Tiket akan digenerate dan dikirim via WhatsApp.</p>
            <textarea
              value={catatanValidasi}
              onChange={e => setCatatanValidasi(e.target.value)}
              placeholder="Catatan internal (opsional, tidak dikirim ke peserta)"
              rows={3}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1.5 mb-4">💡 Catatan hanya terlihat oleh admin, tidak dikirim ke peserta.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setApproveModal(null); setCatatanValidasi(''); }}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold py-2.5 rounded-lg border border-gray-300 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handleApprove(approveModal.id, catatanValidasi)}
                disabled={!!processingId}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition-all shadow-sm"
              >
                {processingId ? '...' : '✓ Setujui & Kirim Tiket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Tolak Pendaftaran</h3>
            <p className="text-gray-500 text-sm mb-4">Tolak pendaftaran <strong className="text-gray-900">{rejectModal.name}</strong>? Notifikasi akan dikirim via WhatsApp.</p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Alasan penolakan (dikirim ke peserta via WA)"
              rows={2}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none"
            />
            <textarea
              value={catatanValidasi}
              onChange={e => setCatatanValidasi(e.target.value)}
              placeholder="Catatan internal admin (opsional, tidak dikirim ke peserta)"
              rows={2}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none mt-2"
            />
            <p className="text-xs text-gray-400 mt-1.5">💡 Catatan internal hanya terlihat oleh admin.</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectionReason(''); setCatatanValidasi(''); }}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold py-2.5 rounded-lg border border-gray-300 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={!!processingId}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition-all shadow-sm"
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
        ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS catatan_validasi TEXT;
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
