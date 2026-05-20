'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  typeof window !== 'undefined' ? (window.location.origin + '/api/admin/sb') : (process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
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

// Ekstrak Drive file ID dari berbagai format URL, lalu arahkan ke proxy /api/drive-file
function driveProxyUrl(url: string | null): string | null {
  if (!url) return null;
  const qId = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1];
  if (qId) return `/api/drive-file?id=${qId}`;
  const pathId = url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/)?.[1];
  if (pathId) return `/api/drive-file?id=${pathId}`;
  const lhId = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/)?.[1];
  if (lhId) return `/api/drive-file?id=${lhId}`;
  return url;
}

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
      const eventIds = [...new Set(data.map((r: DepositRegistration) => r.event_id).filter(Boolean))];
      const eventsMap: Record<string, EventInfo> = {};
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('events')
          .select('id, event_title, event_date, deposit_amount')
          .in('id', eventIds as string[]);
        if (events) events.forEach((ev: EventInfo) => { eventsMap[ev.id] = ev; });
      }
      setRegistrations(data.map((r: DepositRegistration) => ({ ...r, event: r.event_id ? eventsMap[r.event_id] : undefined })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRegistrations();
  }, [fetchRegistrations]);

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
      if (uploadFiles[regId]) formData.append('refundFile', uploadFiles[regId]);
      const res = await fetch('/api/events/deposit-refund', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Pengembalian deposit berhasil diproses. Notifikasi dikirim via WhatsApp!');
      setUploadFiles(prev => { const n = { ...prev }; delete n[regId]; return n; });
      fetchRegistrations();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memproses', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} disalin: ${text}`);
  };

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
              <p className="font-bold text-gray-900 text-sm">Pengembalian Deposit</p>
              <p className="text-xs text-gray-400 hidden sm:block">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/events" className="text-xs text-gray-600 border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg font-medium transition-all">← Validasi Pembayaran</Link>
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-900 ml-1 transition-colors">Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Info Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8 flex gap-3">
          <span className="text-xl">💰</span>
          <div>
            <p className="font-semibold text-orange-800 text-sm">Pengembalian Deposit Peserta Event</p>
            <p className="text-orange-600 text-xs mt-0.5">
              Peserta mengisi data rekening melalui <a href="/events/refund" target="_blank" className="text-orange-800 font-bold hover:underline">/events/refund</a>. Setelah transfer, upload bukti pengembalian — sistem otomatis kirim notifikasi WhatsApp.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { id: 'all', label: 'Total Deposit', value: counts.all, color: 'text-gray-900', border: 'border-l-gray-400' },
            { id: 'no_data', label: 'Belum Isi Rekening', value: counts.no_data, color: 'text-gray-600', border: 'border-l-gray-300' },
            { id: 'requested', label: 'Menunggu Transfer', value: counts.requested, color: 'text-yellow-600', border: 'border-l-yellow-400' },
            { id: 'refunded', label: 'Sudah Dikembalikan', value: counts.refunded, color: 'text-green-600', border: 'border-l-green-400' },
          ].map(s => (
            <button key={s.id} onClick={() => setFilterStatus(s.id)} className={`bg-white rounded-xl p-4 border border-gray-200 border-l-4 ${s.border} shadow-sm text-left transition-all ${filterStatus === s.id ? 'ring-2 ring-[#FFE800]' : 'hover:shadow-md'}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{s.label}</p>
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
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] w-64 shadow-sm"
          />
          <button onClick={fetchRegistrations} className="bg-white hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg border border-gray-300 shadow-sm font-medium transition-all">
            🔄 Refresh
          </button>
          <button onClick={() => setFilterStatus('all')} className="bg-white hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg border border-gray-300 shadow-sm font-medium transition-all">
            Reset Filter
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FFE800]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm bg-white rounded-xl border border-gray-200 shadow-sm">Tidak ada data sesuai filter.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map(reg => {
              const isRefunded = reg.status_pengembalian_deposit === 'Processed';
              const hasBank = reg.nama_bank && reg.no_rekening;
              const isRequested = reg.status_pengembalian_deposit === 'requested';
              return (
                <div key={reg.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all ${isRefunded ? 'border-l-4 border-l-green-400 border-green-200' : isRequested ? 'border-l-4 border-l-yellow-400 border-yellow-200' : 'border-gray-200'}`}>
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row gap-5">
                      {/* Left: Registration & Event Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {isRefunded ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-green-50 text-green-700 border-green-300">✓ Sudah Dikembalikan</span>
                          ) : isRequested ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-yellow-50 text-yellow-700 border-yellow-300">⏳ Menunggu Transfer</span>
                          ) : (
                            <span className="text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-gray-100 text-gray-600 border-gray-300">Belum Isi Rekening</span>
                          )}
                          <span className="text-[11px] text-gray-400">Daftar: {new Date(reg.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {reg.refund_requested_at && (
                            <span className="text-[11px] text-gray-400">· Isi rekening: {new Date(reg.refund_requested_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                          )}
                        </div>

                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{reg.event?.event_title || reg.event_name}</h3>
                        <p className="text-gray-500 text-sm mt-0.5">📅 {reg.event?.event_date || '-'}</p>
                        {reg.event?.deposit_amount && (
                          <p className="text-orange-600 text-sm font-bold mt-1">💵 {reg.event.deposit_amount}</p>
                        )}

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-gray-900 font-bold">{reg.nama_lengkap}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                            <span>📱 {reg.nomor_wa}</span>
                            {reg.kabupaten_kotamadya && <span>📍 {reg.kabupaten_kotamadya}</span>}
                          </div>
                        </div>

                        {/* Bukti pembayaran deposit */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">Bukti Bayar Deposit (saat daftar)</p>
                          {reg.bukti_transfer_url ? (
                            <button
                              onClick={() => setPreviewUrl(driveProxyUrl(reg.bukti_transfer_url))}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 transition-all flex items-center gap-2 font-medium shadow-sm"
                            >
                              🖼️ Lihat Bukti Transfer Pendaftaran
                            </button>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Tidak ada bukti tersimpan</p>
                          )}
                        </div>
                      </div>

                      {/* Middle: Bank Info */}
                      <div className="lg:w-72 lg:border-l lg:border-gray-100 lg:pl-5">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">Data Rekening Tujuan</p>
                        {hasBank ? (
                          <div className="space-y-2">
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <p className="text-gray-400 text-[10px] uppercase">Bank</p>
                              <p className="text-gray-900 font-bold text-base flex items-center justify-between">
                                {reg.nama_bank}
                                <button onClick={() => copyToClipboard(reg.nama_bank!, 'Nama bank')} className="text-gray-400 hover:text-gray-700 text-xs">📋</button>
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <p className="text-gray-400 text-[10px] uppercase">No Rekening</p>
                              <p className="text-gray-900 font-bold text-base font-mono flex items-center justify-between">
                                {reg.no_rekening}
                                <button onClick={() => copyToClipboard(reg.no_rekening!, 'Nomor rekening')} className="text-gray-400 hover:text-gray-700 text-xs">📋</button>
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <p className="text-gray-400 text-[10px] uppercase">Atas Nama</p>
                              <p className="text-gray-900 font-bold text-sm flex items-center justify-between">
                                {reg.nama_pemilik_rekening || reg.nama_lengkap}
                                <button onClick={() => copyToClipboard(reg.nama_pemilik_rekening || reg.nama_lengkap, 'Nama pemilik rekening')} className="text-gray-400 hover:text-gray-700 text-xs">📋</button>
                              </p>
                              {reg.nama_pemilik_rekening && reg.nama_pemilik_rekening.toLowerCase() !== reg.nama_lengkap.toLowerCase() && (
                                <p className="text-[10px] text-yellow-600 mt-1">⚠️ Berbeda dari nama peserta ({reg.nama_lengkap})</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <p className="text-gray-500 text-xs">Peserta belum mengisi data rekening</p>
                            <p className="text-gray-400 text-[10px] mt-1">Arahkan ke <span className="text-gray-700 font-medium">/events/refund</span></p>
                          </div>
                        )}
                      </div>

                      {/* Right: Action */}
                      <div className="lg:w-64 flex flex-col gap-2">
                        {isRefunded ? (
                          <>
                            {reg.bukti_pengembalian_deposit && (
                              <button
                                onClick={() => setPreviewUrl(driveProxyUrl(reg.bukti_pengembalian_deposit))}
                                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg border border-green-200 transition-all font-medium"
                              >
                                🖼️ Lihat Bukti Transfer
                              </button>
                            )}
                            {reg.ticket_url && (
                              <a href={reg.ticket_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 text-center font-medium">
                                🎫 Tiket
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Upload Bukti Transfer</label>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              disabled={!hasBank}
                              onChange={e => {
                                if (e.target.files?.[0]) setUploadFiles(prev => ({ ...prev, [reg.id]: e.target.files![0] }));
                              }}
                              className="text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50 cursor-pointer"
                            />
                            {uploadFiles[reg.id] && (
                              <p className="text-xs text-gray-500 truncate">📎 {uploadFiles[reg.id].name}</p>
                            )}
                            <button
                              onClick={() => handleRefund(reg.id)}
                              disabled={uploadingId === reg.id || !hasBank}
                              className="w-full bg-[#FFE800] hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                              {uploadingId === reg.id ? (
                                <><span className="animate-spin">⏳</span> Memproses...</>
                              ) : (
                                <>💸 Tandai Selesai & Kirim WA</>
                              )}
                            </button>
                            {!hasBank && (
                              <p className="text-[10px] text-gray-400 text-center">Tidak bisa proses sebelum peserta isi rekening</p>
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

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">↗ Buka di tab baru</a>
              <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-gray-700 text-sm font-bold">✕ Tutup</button>
            </div>
            <div className="p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Bukti Transfer"
                className="w-full rounded-lg border border-gray-200"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
                }}
              />
              <div style={{ display: 'none' }} className="flex-col items-center justify-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500 text-sm">Preview tidak tersedia (mungkin PDF)</p>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-gray-800 text-sm hover:underline font-bold">↗ Buka File</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
