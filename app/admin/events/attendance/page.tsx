'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    // Try to load admin name from localStorage if available
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
      const message = err instanceof Error ? err.message : 'Network error';
      setScanResult({ type: 'error', message });
    } finally {
      setProcessing(false);
    }
  }, [adminName, fetchAll]);

  // QR scanner lifecycle
  useEffect(() => {
    if (scannerOpen) {
      const scanner = new Html5QrcodeScanner(
        'qr-scanner',
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false
      );
      scanner.render(
        (decoded) => {
          // Debounce: ignore same scan within 3 seconds
          const now = Date.now();
          if (decoded === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
          lastScanRef.current = decoded;
          lastScanTimeRef.current = now;
          handleScan(decoded);
        },
        () => { /* errors silenced */ }
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

  // Filtered registrations
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <header className="border-b border-white/10 bg-zinc-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 text-lg">NIKON</div>
            <span className="font-bold text-zinc-300 text-sm hidden sm:block">Admin · Absensi & Konfirmasi Kehadiran</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/events" className="text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg">← Validasi Pembayaran</Link>
            <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white">Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6 flex gap-3">
          <span className="text-2xl">📷</span>
          <div className="flex-1">
            <p className="font-semibold text-purple-300 text-sm">Absensi via Scan QR Code</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Scan QR pada tiket peserta untuk konfirmasi kehadiran. Sistem otomatis kirim notifikasi WhatsApp.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFE800]"
          >
            <option value="all">Semua Event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.event_title} — {ev.event_date}</option>)}
          </select>
          <input
            type="text"
            placeholder="Cari nama/nomor WA..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800]"
          />
          <input
            type="text"
            placeholder="Nama admin yang scan..."
            value={adminName}
            onChange={e => setAdminName(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800]"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Terdaftar</p>
            <p className="text-3xl font-bold mt-1 text-white">{stats.total}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Sudah Hadir</p>
            <p className="text-3xl font-bold mt-1 text-green-400">{stats.attended}</p>
            {stats.total > 0 && <p className="text-[10px] text-green-500 mt-1">{Math.round((stats.attended / stats.total) * 100)}% kehadiran</p>}
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Belum Hadir</p>
            <p className="text-3xl font-bold mt-1 text-orange-400">{stats.pending}</p>
          </div>
        </div>

        {/* Scanner Action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 bg-linear-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-2 text-white">📷 Scanner QR Code</h3>
            <p className="text-zinc-400 text-xs mb-4">Buka kamera HP/laptop untuk scan QR pada tiket peserta.</p>
            {!scannerOpen ? (
              <button
                onClick={() => { setScannerOpen(true); setScanResult(null); }}
                className="w-full bg-[#FFE800] hover:bg-[#FFE800]/90 text-black font-bold py-3 rounded-lg transition-all"
              >
                🎥 Mulai Scan QR
              </button>
            ) : (
              <div>
                <div id="qr-scanner" className="rounded-lg overflow-hidden bg-black"></div>
                <button
                  onClick={() => setScannerOpen(false)}
                  className="mt-3 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-lg"
                >
                  ✕ Tutup Scanner
                </button>
              </div>
            )}
          </div>

          {/* Manual Entry */}
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
            <h3 className="font-bold text-sm mb-2 text-white">⌨️ Input Manual</h3>
            <p className="text-zinc-500 text-xs mb-4">Kalau QR tidak bisa di-scan, masukkan ID registrasi atau paste data QR.</p>
            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="UUID atau NIKON-EVT|..."
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFE800] mb-2"
              />
              <button type="submit" disabled={processing} className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-lg">
                {processing ? 'Memproses...' : 'Konfirmasi Manual'}
              </button>
            </form>
          </div>
        </div>

        {/* Scan Result Modal */}
        {scanResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setScanResult(null)}>
            <div onClick={e => e.stopPropagation()} className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border-2 ${
              scanResult.type === 'success' ? 'bg-green-900/40 border-green-500' :
              scanResult.type === 'already' ? 'bg-yellow-900/40 border-yellow-500' :
              'bg-red-900/40 border-red-500'
            }`}>
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">
                  {scanResult.type === 'success' ? '✅' : scanResult.type === 'already' ? '⚠️' : '❌'}
                </div>
                <h2 className="text-2xl font-bold">
                  {scanResult.type === 'success' ? 'Berhasil Hadir!' : scanResult.type === 'already' ? 'Sudah Tercatat' : 'Gagal Konfirmasi'}
                </h2>
              </div>

              {scanResult.reg && (
                <div className="bg-black/30 rounded-lg p-4 mb-4 text-sm space-y-1">
                  <p className="font-bold text-lg text-white">{scanResult.reg.nama_lengkap}</p>
                  <p className="text-zinc-300">📅 {scanResult.reg.event_name}</p>
                  <p className="text-zinc-400 text-xs">📱 {scanResult.reg.nomor_wa}</p>
                  {scanResult.reg.tipe_kamera && <p className="text-zinc-400 text-xs">📷 {scanResult.reg.tipe_kamera}</p>}
                  {scanResult.reg.is_attended && scanResult.reg.attended_at && (
                    <p className="text-green-400 text-xs mt-2">✓ Hadir: {new Date(scanResult.reg.attended_at).toLocaleString('id-ID')}{scanResult.reg.attended_by ? ` oleh ${scanResult.reg.attended_by}` : ''}</p>
                  )}
                </div>
              )}

              <p className="text-zinc-300 text-sm mb-4">{scanResult.message}</p>

              <button
                onClick={() => setScanResult(null)}
                className="w-full bg-[#FFE800] hover:bg-[#FFE800]/90 text-black font-bold py-3 rounded-lg"
              >
                Lanjut Scan
              </button>
            </div>
          </div>
        )}

        {/* Recent attendees */}
        {recentAttendees.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">⏱️ Hadir Terbaru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentAttendees.map(r => (
                <div key={r.id} className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="font-bold text-sm text-white truncate">{r.nama_lengkap}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{r.event_name}</p>
                  <p className="text-[10px] text-green-400 mt-1">{r.attended_at && new Date(r.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{r.attended_by ? ` · ${r.attended_by}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full list */}
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Daftar Peserta Terdaftar ({filtered.length})</h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFE800]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-zinc-600 py-12 text-sm">Tidak ada peserta sesuai filter.</div>
          ) : (
            <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-zinc-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-zinc-500">Nama</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-zinc-500">Event</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-zinc-500">WA</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-zinc-500">Hadir</th>
                      <th className="px-4 py-3 text-left text-xs uppercase font-bold text-zinc-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map(r => (
                      <tr key={r.id} className="hover:bg-zinc-800/50">
                        <td className="px-4 py-3">
                          {r.is_attended ? (
                            <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded font-bold uppercase">✓ Hadir</span>
                          ) : (
                            <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1 rounded font-bold uppercase">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold">{r.nama_lengkap}</td>
                        <td className="px-4 py-3 text-zinc-400">{r.event_name}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{r.nomor_wa}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400">
                          {r.attended_at ? (
                            <>
                              {new Date(r.attended_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              {r.attended_by && <span className="block text-[10px] text-zinc-500">oleh {r.attended_by}</span>}
                            </>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {r.is_attended ? (
                            <button onClick={() => handleUndo(r.id)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Batalkan</button>
                          ) : (
                            <button onClick={() => handleScan(r.id)} disabled={processing} className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded">✓ Tandai Hadir</button>
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
