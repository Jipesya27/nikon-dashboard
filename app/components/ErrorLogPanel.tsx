'use client';

import { useState, useEffect, useCallback } from 'react';

interface ErrorLogRow {
  id: string;
  created_at: string;
  source: string;
  severity: 'error' | 'warning';
  message: string;
  detail: Record<string, unknown>;
  resolved: boolean;
}

export default function ErrorLogPanel() {
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState<'false' | 'true' | ''>('false');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (sourceFilter) params.set('source', sourceFilter);
      if (severityFilter) params.set('severity', severityFilter);
      if (resolvedFilter) params.set('resolved', resolvedFilter);
      const res = await fetch(`/api/admin/error-log?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      setRows(json.data || []);
      setCount(json.count || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter, severityFilter, resolvedFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function toggleResolved(row: ErrorLogRow) {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, resolved: !r.resolved } : r));
    try {
      await fetch('/api/admin/error-log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, resolved: !row.resolved }),
      });
    } catch {
      fetchLogs(); // revert on failure by re-fetching truth from server
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={sourceFilter}
          onChange={e => { setPage(1); setSourceFilter(e.target.value); }}
          placeholder="Filter source (mis. api:sb-write)"
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 w-56"
        />
        <select
          value={severityFilter}
          onChange={e => { setPage(1); setSeverityFilter(e.target.value); }}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200"
        >
          <option value="">Semua severity</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
        </select>
        <select
          value={resolvedFilter}
          onChange={e => { setPage(1); setResolvedFilter(e.target.value as 'false' | 'true' | ''); }}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200"
        >
          <option value="false">Belum diselesaikan</option>
          <option value="true">Sudah diselesaikan</option>
          <option value="">Semua</option>
        </select>
        <button
          onClick={fetchLogs}
          className="px-2.5 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white text-xs transition-colors"
        >
          ↺ Refresh
        </button>
        <span className="text-xs text-gray-600 ml-auto">{count} entri</span>
      </div>

      {loading && rows.length === 0 && (
        <div className="text-center text-gray-600 text-sm py-10">Memuat...</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-center text-gray-600 text-sm py-10">Tidak ada log yang cocok dengan filter.</div>
      )}

      <div className="space-y-1.5">
        {rows.map(row => (
          <div key={row.id} className={`rounded border ${row.resolved ? 'border-gray-800 bg-gray-900/40' : row.severity === 'warning' ? 'border-yellow-900 bg-yellow-950/30' : 'border-red-900 bg-red-950/30'}`}>
            <div
              className="flex items-center gap-3 px-3 py-2 cursor-pointer"
              onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
            >
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${row.severity === 'warning' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
                {row.severity}
              </span>
              <span className="text-[11px] font-mono text-gray-500 shrink-0">{row.source}</span>
              <span className="text-xs text-gray-200 truncate flex-1">{row.message}</span>
              <span className="text-[11px] text-gray-600 font-mono shrink-0">
                {new Date(row.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
              </span>
              <button
                onClick={e => { e.stopPropagation(); toggleResolved(row); }}
                className={`text-[11px] px-2 py-1 rounded border shrink-0 ${row.resolved ? 'border-gray-700 text-gray-500' : 'border-green-800 text-green-400 hover:bg-green-950'}`}
              >
                {row.resolved ? '↺ Buka lagi' : '✓ Tandai selesai'}
              </button>
            </div>
            {expandedId === row.id && (
              <pre className="px-3 pb-3 text-[11px] text-gray-400 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(row.detail, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-2 py-1 rounded border border-gray-700 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span>Hal. {page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-2 py-1 rounded border border-gray-700 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
