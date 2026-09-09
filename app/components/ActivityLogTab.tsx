'use client';

/**
 * ActivityLogTab — Log Aktivitas Perubahan Dashboard (untuk IT check & review).
 *
 * Baca tabel `data_log` via GET /api/admin/audit-log. Semua mutasi tabel penting
 * (event_registrations, garansi, claim_promo, budget_approval, dll.) tercatat di sini:
 * siapa (nama akun), kapan (timestamp WIB), aksi, tabel, record, dan alasan/note.
 *
 * Fitur: filter (user / tabel / aksi / tanggal / cari), pagination, dan
 * "Download Log (CSV)" untuk arsip offline IT.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface LogRow {
  id: string;
  created_at: string;
  user_name: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  note: string | null;
}

interface LogResponse {
  data: LogRow[];
  count: number;
  page: number;
  pageSize: number;
  filters: { tables: string[]; actions: string[]; users: string[] };
}

const ACTION_STYLE: Record<string, string> = {
  insert: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  upsert: 'bg-teal-100 text-teal-700',
  approve_payment: 'bg-green-100 text-green-700',
  reject_payment: 'bg-red-100 text-red-700',
  change_registration_status: 'bg-amber-100 text-amber-800',
  send_event_ticket: 'bg-indigo-100 text-indigo-700',
};

function fmtWib(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

function summarizeValues(row: LogRow): string {
  const parts: string[] = [];
  const oldV = row.old_values || {};
  const newV = row.new_values || {};
  const keys = [...new Set([...Object.keys(oldV), ...Object.keys(newV)])];
  for (const k of keys.slice(0, 6)) {
    const o = oldV[k];
    const n = newV[k];
    if (o !== undefined && n !== undefined && JSON.stringify(o) !== JSON.stringify(n)) {
      parts.push(`${k}: ${JSON.stringify(o)} → ${JSON.stringify(n)}`);
    } else if (o === undefined && n !== undefined) {
      parts.push(`${k}: ${JSON.stringify(n)}`);
    }
  }
  return parts.join(' · ');
}

export default function ActivityLogTab() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [fUser, setFUser] = useState('');
  const [fTable, setFTable] = useState('');
  const [fAction, setFAction] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fSearch, setFSearch] = useState('');
  const [opts, setOpts] = useState<{ tables: string[]; actions: string[]; users: string[] }>({ tables: [], actions: [], users: [] });

  const buildQuery = useCallback((extra: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    if (fUser) p.set('user', fUser);
    if (fTable) p.set('table', fTable);
    if (fAction) p.set('action', fAction);
    if (fFrom) p.set('from', new Date(fFrom).toISOString());
    if (fTo) { const d = new Date(fTo); d.setHours(23, 59, 59, 999); p.set('to', d.toISOString()); }
    if (fSearch) p.set('search', fSearch);
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return p.toString();
  }, [fUser, fTable, fAction, fFrom, fTo, fSearch]);

  const fetchLogs = useCallback(async (toPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit-log?${buildQuery({ page: String(toPage) })}`);
      const json: LogResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setRows(json.data || []);
      setCount(json.count || 0);
      setPage(json.page || toPage);
      setPageSize(json.pageSize || 50);
      if (json.filters) setOpts(json.filters);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => fetchLogs(1);
  const resetFilters = () => {
    setFUser(''); setFTable(''); setFAction(''); setFFrom(''); setFTo(''); setFSearch('');
    setTimeout(() => fetchLogs(1), 0);
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/audit-log?${buildQuery({ export: '1' })}`);
      const json: LogResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const list = json.data || [];
      const headers = ['Waktu (WIB)', 'User', 'Aksi', 'Tabel', 'Record ID', 'Perubahan', 'Alasan/Note'];
      const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
      const lines = [
        headers.join(','),
        ...list.map(r => [
          esc(fmtWib(r.created_at)), esc(r.user_name), esc(r.action), esc(r.table_name),
          esc(r.record_id), esc(summarizeValues(r)), esc(r.note),
        ].join(',')),
      ];
      const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `log-aktivitas-dashboard_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert('Gagal export: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = useMemo(
    () => [fUser, fTable, fAction, fFrom, fTo, fSearch].filter(Boolean).length,
    [fUser, fTable, fAction, fFrom, fTo, fSearch],
  );

  return (
    <div className="space-y-4 animate-fade-in text-gray-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Log Aktivitas Perubahan</h2>
            <p className="text-xs text-gray-500">Jejak audit semua perubahan data dashboard — untuk pengecekan &amp; review IT.</p>
          </div>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="text-xs font-semibold bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition shadow-sm"
        >
          {exporting ? 'Menyiapkan...' : '⬇️ Download Log (CSV)'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <select aria-label="Filter user" value={fUser} onChange={e => setFUser(e.target.value)} className="py-2 px-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs outline-none focus:border-[#FFE500]">
          <option value="">Semua User</option>
          {opts.users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select aria-label="Filter tabel" value={fTable} onChange={e => setFTable(e.target.value)} className="py-2 px-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs outline-none focus:border-[#FFE500]">
          <option value="">Semua Tabel</option>
          {opts.tables.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Filter aksi" value={fAction} onChange={e => setFAction(e.target.value)} className="py-2 px-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs outline-none focus:border-[#FFE500]">
          <option value="">Semua Aksi</option>
          {opts.actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" aria-label="Dari tanggal" value={fFrom} onChange={e => setFFrom(e.target.value)} className="py-2 px-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs outline-none focus:border-[#FFE500]" />
        <input type="date" aria-label="Sampai tanggal" value={fTo} onChange={e => setFTo(e.target.value)} className="py-2 px-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs outline-none focus:border-[#FFE500]" />
        <input type="text" aria-label="Cari record / note" placeholder="Cari record / note..." value={fSearch} onChange={e => setFSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFilters()} className="py-2 px-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs outline-none focus:border-[#FFE500]" />
        <div className="col-span-2 md:col-span-3 lg:col-span-6 flex gap-2">
          <button onClick={applyFilters} className="text-xs font-semibold bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-1.5 rounded-lg transition">Terapkan Filter</button>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition">Reset ({activeFilterCount})</button>
          )}
          <span className="ml-auto text-xs text-gray-400 self-center">{count.toLocaleString('en-GB')} entri</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[64vh] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 text-left font-bold text-gray-600 whitespace-nowrap">Waktu (WIB)</th>
              <th className="px-3 py-2.5 text-left font-bold text-gray-600">User</th>
              <th className="px-3 py-2.5 text-left font-bold text-gray-600">Aksi</th>
              <th className="px-3 py-2.5 text-left font-bold text-gray-600">Tabel</th>
              <th className="px-3 py-2.5 text-left font-bold text-gray-600">Record</th>
              <th className="px-3 py-2.5 text-left font-bold text-gray-600">Perubahan</th>
              <th className="px-3 py-2.5 text-left font-bold text-gray-600">Alasan / Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-10">Memuat...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="text-center text-red-500 py-10">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-10">Tidak ada aktivitas yang cocok.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-gray-500 font-mono">{fmtWib(r.created_at)}</td>
                <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{r.user_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide text-[10px] ${ACTION_STYLE[r.action] || 'bg-gray-100 text-gray-600'}`}>{r.action}</span>
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.table_name}</td>
                <td className="px-3 py-2 text-gray-400 font-mono max-w-[160px] truncate" title={r.record_id}>{r.record_id}</td>
                <td className="px-3 py-2 text-gray-600 max-w-[260px] break-words">{summarizeValues(r) || <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[220px] break-words">{r.note || <span className="text-gray-300">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1 || loading} className="text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 px-3 py-1.5 rounded-lg transition">◄ Sebelumnya</button>
          <span className="text-xs text-gray-500">Halaman {page} / {totalPages}</span>
          <button onClick={() => fetchLogs(page + 1)} disabled={page >= totalPages || loading} className="text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 px-3 py-1.5 rounded-lg transition">Berikutnya ►</button>
        </div>
      )}
    </div>
  );
}
