'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const supabase = createClient(
  typeof window !== 'undefined' ? (window.location.origin + '/api/admin/sb') : (process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
);

type Registration = {
  id: string;
  nama_lengkap: string;
  nomor_wa: string;
  kabupaten_kotamadya: string | null;
  tipe_kamera: string | null;
  event_name: string;
  event_id: string | null;
  status_pendaftaran: string;
  is_attended: boolean;
  attended_at: string | null;
  attended_by: string | null;
  created_at: string;
};

type EventInfo = { id: string; event_title: string; event_date: string };

type ScanResult =
  | { type: 'success'; reg: Registration; message: string }
  | { type: 'already'; reg: Registration; message: string }
  | { type: 'error'; message: string; reg?: Registration }
  | null;

export default function AdminAttendancePage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [processing, setProcessing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: regs }, { data: evs }] = await Promise.all([
      supabase.from('event_registrations').select('*').eq('status_pendaftaran', 'terdaftar').order('attended_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
      supabase.from('events').select('id, event_title, event_date').order('created_at', { ascending: false }),
    ]);
    setRegistrations(regs || []);
    setEvents(evs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
    try {
      const u = localStorage.getItem('current_user');
      if (u) {
        const parsed = JSON.parse(u);
        setAdminName(parsed.nama_karyawan || parsed.username || 'Admin');
      }
    } catch {}
  }, [fetchAll]);

  const handleScan = useCallback(async (qrText: string) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/events/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr: qrText, attendedBy: adminName, sendWa: true }),
      });
      const data = await res.json();
      if (data.alreadyAttended) {
        setScanResult({ type: 'already', reg: data.registration, message: data.message });
      } else if (!res.ok) {
        setScanResult({ type: 'error', message: data.error || 'Gagal proses', reg: data.registration });
      } else {
        setScanResult({ type: 'success', reg: data.registration, message: data.message });
      }
      fetchAll();
    } catch (err: unknown) {
      setScanResult({ type: 'error', message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setProcessing(false);
    }
  }, [adminName, fetchAll]);

  useEffect(() => {
    if (scannerOpen) {
      const scanner = new Html5QrcodeScanner(
        'qr-scanner',
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false
      );
      scanner.render(
        (decoded) => {
          const now = Date.now();
          if (decoded === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
          lastScanRef.current = decoded;
          lastScanTimeRef.current = now;
          handleScan(decoded);
        },
        () => {}
      );
      scannerRef.current = scanner;
      return () => {
        try { scanner.clear(); } catch {}
        scannerRef.current = null;
      };
    }
  }, [scannerOpen, handleScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScan(manualInput.trim());
    setManualInput('');
  };

  const handleUndo = async (registrationId: string) => {
    if (!confirm('Batalkan status hadir untuk peserta ini?')) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/events/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert('Gagal: ' + data.error);
      } else {
        fetchAll();
      }
    } finally {
      setProcessing(false);
    }
  };

  const filtered = registrations.filter(r => {
    if (selectedEventId !== 'all' && r.event_id !== selectedEventId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.nama_lengkap.toLowerCase().includes(q) && !r.nomor_wa.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: filtered.length,
    attended: filtered.filter(r => r.is_attended).length,
    pending: filtered.filter(r => !r.is_attended).length,
  };

  const recentAttendees = registrations.filter(r => r.is_attended).slice(0, 8);

  // Nomor urut kehadiran per event (diurutkan by attended_at ASC)
  const attendanceNumberMap = useMemo(() => {
    const map: Record<string, number> = {};
    const byEvent: Record<string, Registration[]> = {};
    registrations.filter(r => r.is_attended && r.attended_at).forEach(r => {
      const key = r.event_id || 'unknown';
      if (!byEvent[key]) byEvent[key] = [];
      byEvent[key].push(r);
    });
    Object.values(byEvent).forEach(group => {
      group.sort((a, b) => new Date(a.attended_at!).getTime() - new Date(b.attended_at!).getTime());
      group.forEach((r, i) => { map[r.id] = i + 1; });
    });
    return map;
  }, [registrations]);

  const exportCSV = () => {
    const headers = ['No. Hadir', 'Status', 'Nama', 'Event', 'No WA', 'Kota', 'Tipe Kamera', 'Waktu Hadir', 'Admin Scan', 'Tgl Daftar'];
    const rows = filtered.map(r => [
      attendanceNumberMap[r.id] != null ? String(attendanceNumberMap[r.id]) : '-',
      r.is_attended ? 'Hadir' : 'Belum Hadir',
      r.nama_lengkap,
      r.event_name,
      r.nomor_wa,
      r.kabupaten_kotamadya || '',
      r.tipe_kamera || '',
      r.attended_at ? new Date(r.attended_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '',
      r.attended_by || '',
      new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const eventLabel = selectedEventId === 'all' ? 'semua-event' : (events.find(e => e.id === selectedEventId)?.event_title.replace(/\s+/g, '-').toLowerCase() || selectedEventId);
    a.href = url;
    a.download = `absensi-${eventLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 text-lg tracking-wide">NIKON</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Absensi & Konfirmasi Kehadiran</p>
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
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 flex gap-3">
          <span className="text-xl">📷</span>
          <div className="flex-1">
            <p className="font-semibold text-purple-800 text-sm">Absensi via Scan QR Code</p>
            <p className="text-purple-600 text-xs mt-0.5">Scan QR pada tiket peserta untuk konfirmasi kehadiran. Sistem otomatis kirim notifikasi WhatsApp.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] shadow-sm"
          >
            <option value="all">Semua Event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.event_title} — {ev.event_date}</option>)}
          </select>
          <input
            type="text"
            placeholder="Cari nama / nomor WA..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] shadow-sm"
          />
          <input
            type="text"
            placeholder="Nama admin yang scan..."
            value={adminName}
            onChange={e => setAdminName(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] shadow-sm"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 border-l-4 border-l-gray-400 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Terdaftar</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white border border-gray-200 border-l-4 border-l-green-400 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Sudah Hadir</p>
            <p className="text-3xl font-bold mt-1 text-green-600">{stats.attended}</p>
            {stats.total > 0 && <p className="text-[11px] text-green-500 mt-1 font-medium">{Math.round((stats.attended / stats.total) * 100)}% kehadiran</p>}
          </div>
          <div className="bg-white border border-gray-200 border-l-4 border-l-orange-400 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Belum Hadir</p>
            <p className="text-3xl font-bold mt-1 text-orange-600">{stats.pending}</p>
          </div>
        </div>

        {/* Scanner Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-1 text-gray-900">📷 Scanner QR Code</h3>
            <p className="text-gray-500 text-xs mb-4">Buka kamera HP/laptop untuk scan QR pada tiket peserta.</p>
            {!scannerOpen ? (
              <div className="space-y-3">
                <button
                  onClick={() => { setScannerOpen(true); setScanResult(null); }}
                  className="w-full bg-[#FFE800] hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-all shadow-sm text-base"
                >
                  🎥 Mulai Scan QR
                </button>
                <button
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg border border-gray-300 transition-all text-sm"
                >
                  🖼️ Scan dari Gambar File
                </button>
              </div>
            ) : (
              <div>
                <div id="qr-scanner" className="rounded-lg overflow-hidden border border-gray-200"></div>
                <button
                  onClick={() => setScannerOpen(false)}
                  className="mt-3 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg border border-gray-200 transition-all"
                >
                  ✕ Tutup Scanner
                </button>
              </div>
            )}
          </div>

          {/* Manual Entry */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-sm mb-1 text-gray-900">⌨️ Input Manual</h3>
            <p className="text-gray-500 text-xs mb-4">Kalau QR tidak bisa di-scan, masukkan ID registrasi atau paste data QR.</p>
            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="UUID atau NIKON-EVT|..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] mb-2"
              />
              <button type="submit" disabled={processing} className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-lg transition-all">
                {processing ? 'Memproses...' : 'Konfirmasi Manual'}
              </button>
            </form>
          </div>
        </div>

        {/* Scan Result Modal */}
        {scanResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setScanResult(null)}>
            <div onClick={e => e.stopPropagation()} className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border-2 bg-white ${
              scanResult.type === 'success' ? 'border-green-400' :
              scanResult.type === 'already' ? 'border-yellow-400' :
              'border-red-400'
            }`}>
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">
                  {scanResult.type === 'success' ? '✅' : scanResult.type === 'already' ? '⚠️' : '❌'}
                </div>
                <h2 className={`text-2xl font-bold ${scanResult.type === 'success' ? 'text-green-700' : scanResult.type === 'already' ? 'text-yellow-700' : 'text-red-700'}`}>
                  {scanResult.type === 'success' ? 'Berhasil Hadir!' : scanResult.type === 'already' ? 'Sudah Tercatat' : 'Gagal Konfirmasi'}
                </h2>
              </div>

              {scanResult.reg && (
                <div className={`rounded-lg p-4 mb-4 text-sm space-y-1 border ${scanResult.type === 'success' ? 'bg-green-50 border-green-200' : scanResult.type === 'already' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-lg text-gray-900">{scanResult.reg.nama_lengkap}</p>
                    {attendanceNumberMap[scanResult.reg.id] != null && (
                      <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        #{attendanceNumberMap[scanResult.reg.id]}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">📅 {scanResult.reg.event_name}</p>
                  <p className="text-gray-400 text-xs">📱 {scanResult.reg.nomor_wa}</p>
                  {scanResult.reg.tipe_kamera && <p className="text-gray-400 text-xs">📷 {scanResult.reg.tipe_kamera}</p>}
                  {scanResult.reg.is_attended && scanResult.reg.attended_at && (
                    <p className="text-green-600 text-xs mt-2">✓ Hadir: {new Date(scanResult.reg.attended_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}{scanResult.reg.attended_by ? ` oleh ${scanResult.reg.attended_by}` : ''}</p>
                  )}
                </div>
              )}

              <p className="text-gray-600 text-sm mb-4">{scanResult.message}</p>

              <button
                onClick={() => setScanResult(null)}
                className="w-full bg-[#FFE800] hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-all shadow-sm"
              >
                Lanjut Scan
              </button>
            </div>
          </div>
        )}

        {/* Recent Attendees */}
        {recentAttendees.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">⏱️ Hadir Terbaru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentAttendees.map(r => (
                <div key={r.id} className="bg-white border border-green-200 border-l-4 border-l-green-400 rounded-lg p-3 shadow-sm">
                  <p className="font-bold text-sm text-gray-900 truncate">{r.nama_lengkap}</p>
                  <p className="text-[11px] text-gray-500 truncate">{r.event_name}</p>
                  <p className="text-[10px] text-green-600 mt-1 font-medium">{r.attended_at && new Date(r.attended_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}{r.attended_by ? ` · ${r.attended_by}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Daftar Peserta Terdaftar ({filtered.length})</h3>
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-all"
            >
              ⬇️ Export CSV
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFE800]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm bg-white rounded-xl border border-gray-200 shadow-sm">Tidak ada peserta sesuai filter.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-gray-500">No.</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-gray-500">Nama</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-gray-500">Event</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-gray-500">WA</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-gray-500">Waktu Hadir</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center">
                          {attendanceNumberMap[r.id] != null ? (
                            <span className="inline-flex items-center justify-center bg-green-100 text-green-700 text-xs font-bold w-7 h-7 rounded-full border border-green-300">
                              {attendanceNumberMap[r.id]}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.is_attended ? (
                            <span className="text-[10px] bg-green-50 text-green-700 border border-green-300 px-2 py-1 rounded font-bold uppercase">✓ Hadir</span>
                          ) : (
                            <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-300 px-2 py-1 rounded font-bold uppercase">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">{r.nama_lengkap}</td>
                        <td className="px-4 py-3 text-gray-500">{r.event_name}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.nomor_wa}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.attended_at ? (
                            <>
                              {new Date(r.attended_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              {r.attended_by && <span className="block text-[10px] text-gray-400">oleh {r.attended_by}</span>}
                            </>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {r.is_attended ? (
                            <button onClick={() => handleUndo(r.id)} className="text-xs text-red-500 hover:text-red-700 hover:underline font-medium">Batalkan</button>
                          ) : (
                            <button onClick={() => handleScan(r.id)} disabled={processing} className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all">✓ Tandai Hadir</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
