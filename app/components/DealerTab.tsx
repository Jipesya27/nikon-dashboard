'use client';

import React from 'react';
import Image from 'next/image';

type DealerSheet = { headers: string[]; rows: string[][]; sheetName: string };

export interface DealerTabProps {
  dealerSheet: DealerSheet | null;
  setDealerSheet: (v: DealerSheet | null) => void;
  dealerLoading: boolean;
  dealerError: string;
  dealerSearch: string;
  setDealerSearch: (v: string) => void;
  dealerSelected: Set<number>;
  setDealerSelected: React.Dispatch<React.SetStateAction<Set<number>>>;
  dealerSortCol: number;
  setDealerSortCol: (v: number) => void;
  dealerSortDir: 'asc' | 'desc';
  setDealerSortDir: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  dealerColFilters: Record<number, string>;
  setDealerColFilters: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  dealerUnsyncedCount?: number;
  setDealerUnsyncedCount?: React.Dispatch<React.SetStateAction<number>>;
}

export default function DealerTab({
  dealerSheet, setDealerSheet,
  dealerLoading, dealerError,
  dealerSearch, setDealerSearch,
  dealerSelected, setDealerSelected,
  dealerSortCol, setDealerSortCol,
  dealerSortDir, setDealerSortDir,
  dealerColFilters, setDealerColFilters,
  dealerUnsyncedCount = 0,
  setDealerUnsyncedCount,
}: DealerTabProps) {
  const _findCol = (hdrs: string[], cands: string[]) => {
    const norm = (s: string) => s.toLowerCase().replace(/_/g, ' ');
    for (const c of cands) {
      const i = hdrs.findIndex(h => norm(h).includes(norm(c)));
      if (i >= 0) return i;
    }
    return -1;
  };
  const _isImg = (v: string) =>
    !!v && (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)/i.test(v) ||
      v.includes('drive.google.com') || v.includes('googleusercontent.com') || v.includes('docs.google.com/uc'));
  const _resolveImg = (url: string) => {
    if (!url) return '';
    const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m && (url.includes('drive.google.com') || url.includes('docs.google.com'))) return `/api/drive-file?id=${m[1]}`;
    return url;
  };

  const hdrs = dealerSheet?.headers ?? [];
  const colType = _findCol(hdrs, ['type barang', 'tipe barang', 'type', 'tipe', 'model', 'nama barang', 'barang']);
  const colSN   = _findCol(hdrs, ['serial number', 'serial', 'nomor seri', 's/n', 'sn', 'no seri']);
  const colFoto = _findCol(hdrs, ['foto kartu garansi', 'foto garansi', 'foto', 'image', 'gambar', 'link foto', 'url foto', 'link', 'url']);
  const colDate = _findCol(hdrs, ['tanggal pembelian', 'tanggal penjualan', 'tgl pembelian', 'tgl penjualan', 'tanggal', 'tgl', 'date']);

  const q = dealerSearch.toLowerCase();
  // Parse tanggal dari berbagai format ke timestamp (ms)
  const parseDate = (s: string): number => {
    if (!s) return 0;
    // ISO: 2026-06-11
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return new Date(s).getTime();
    // D/M/YYYY atau M/D/YYYY — coba D/M/YYYY dulu (format Indonesia)
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) return new Date(+slash[3], +slash[2] - 1, +slash[1]).getTime();
    // "11 Jun 2026" atau "Jun 11, 2026"
    const dt = Date.parse(s);
    if (!isNaN(dt)) return dt;
    return 0;
  };
  const isDateCol = (colIdx: number) => {
    if (colIdx < 0) return false;
    const h = (hdrs[colIdx] || '').toLowerCase();
    if (/tanggal|tgl|date|waktu/.test(h)) return true;
    // cek sample value
    const sample = (dealerSheet?.rows ?? []).slice(0, 5).map(r => r[colIdx] || '').find(v => v);
    return !!sample && /\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(sample);
  };
  const [syncLoading, setSyncLoading] = React.useState(false);
  const [syncMsg, setSyncMsg] = React.useState('');

  // Filter tanggal pembelian
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  // Kumpulkan semua bulan unik dari data untuk quick-pick
  const monthOptions = React.useMemo(() => {
    if (colDate < 0 || !dealerSheet) return [];
    const seen = new Set<string>();
    dealerSheet.rows.forEach(row => {
      const v = row[colDate] || '';
      if (!v) return;
      const ts = parseDate(v);
      if (!ts) return;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      seen.add(key);
    });
    return Array.from(seen).sort().reverse();
  }, [dealerSheet, colDate]);

  const [activeMonth, setActiveMonth] = React.useState<string | null>(null);

  const handleMonthPick = (m: string | null) => {
    if (m === null) { setActiveMonth(null); setDateFrom(''); setDateTo(''); return; }
    setActiveMonth(m);
    const [y, mo] = m.split('-').map(Number);
    const first = new Date(y, mo - 1, 1);
    const last  = new Date(y, mo, 0);
    setDateFrom(first.toISOString().slice(0, 10));
    setDateTo(last.toISOString().slice(0, 10));
  };

  const tsFrom = dateFrom ? new Date(dateFrom).getTime() : 0;
  const tsTo   = dateTo   ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;

  let filteredDealer = (dealerSheet?.rows ?? [])
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => {
      if (q && !row.some(c => c.toLowerCase().includes(q))) return false;
      for (const [ci, fv] of Object.entries(dealerColFilters)) {
        if (fv && !(row[Number(ci)] || '').toLowerCase().includes(fv.toLowerCase())) return false;
      }
      if ((dateFrom || dateTo) && colDate >= 0) {
        const ts = parseDate(row[colDate] || '');
        if (!ts || ts < tsFrom || ts > tsTo) return false;
      }
      return true;
    });

  if (dealerSortCol >= 0) {
    const dateSort = isDateCol(dealerSortCol);
    filteredDealer = [...filteredDealer].sort((a, b) => {
      const av = a.row[dealerSortCol] || '';
      const bv = b.row[dealerSortCol] || '';
      const cmp = dateSort
        ? parseDate(av) - parseDate(bv)
        : av.toLowerCase().localeCompare(bv.toLowerCase(), 'id', { numeric: true });
      return dealerSortDir === 'asc' ? cmp : -cmp;
    });
  }

  const allDealerIdx = filteredDealer.map(r => r.idx);
  const allDealerSel = allDealerIdx.length > 0 && allDealerIdx.every(i => dealerSelected.has(i));
  const selectedDealerRows = (dealerSheet?.rows ?? []).filter((_, i) => dealerSelected.has(i));

  const toggleDealerAll = () => {
    setDealerSelected(prev => {
      const next = new Set(prev);
      if (allDealerSel) allDealerIdx.forEach(i => next.delete(i));
      else allDealerIdx.forEach(i => next.add(i));
      return next;
    });
  };
  const toggleDealerRow = (idx: number) => {
    setDealerSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const doSync = async () => {
    setSyncLoading(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/transaksi-dealer/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal sync');
      setSyncMsg(`✓ ${json.message}`);
      // Reload data dari Supabase setelah sync
      const getRes = await fetch('/api/transaksi-dealer/sync');
      const getData = await getRes.json();
      if (!getData.error) {
        setDealerSheet({ headers: getData.headers, rows: getData.rows, sheetName: 'Supabase' });
        setDealerUnsyncedCount?.(0);
      }
    } catch (e: unknown) {
      setSyncMsg(`✗ ${e instanceof Error ? e.message : 'Error'}`);
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  };

  const doPrint = () => {
    if (selectedDealerRows.length === 0) return;
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const allCards = selectedDealerRows.map(row => {
      const tv = colType >= 0 ? (row[colType] || '-') : '-';
      const sv = colSN   >= 0 ? (row[colSN]   || '-') : '-';
      const fv = colFoto >= 0 ? row[colFoto]  : '';
      const fu = fv ? _resolveImg(fv) : '';
      const imgHtml = fu && _isImg(fv)
        ? `<img src="${esc(fu)}" alt="foto"/>`
        : `<span class="ph">foto kartu garansi</span>`;
      return `<div class="card"><table><tbody>
<tr><td class="lbl">Type</td><td class="type">${esc(tv)}</td></tr>
<tr><td class="lbl">S/N</td><td class="sn">${esc(sv)}</td></tr>
</tbody></table><div class="img">${imgHtml}</div></div>`;
    });
    const pages: string[] = [];
    for (let i = 0; i < allCards.length; i += 6) {
      pages.push(`<div class="pg">${allCards.slice(i, i + 6).join('')}</div>`);
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print Kartu Garansi Dealer</title><style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,sans-serif;font-size:7pt;background:#fff;}
.pg{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:2mm;width:200mm;height:287mm;page-break-after:always;}
.pg:last-child{page-break-after:auto;}
.card{border:1.5px solid #333;display:flex;flex-direction:column;overflow:hidden;}
table{width:100%;border-collapse:collapse;flex-shrink:0;}
td{border:1px solid #ccc;padding:1.5px 4px;vertical-align:middle;}
.lbl{background:#f0f0f0;font-weight:600;width:30%;}
.type{font-weight:700;color:#1a56db;}
.sn{font-weight:700;}
.img{flex:1;display:flex;align-items:center;justify-content:center;border-top:1px solid #ddd;background:#fafafa;overflow:hidden;min-height:0;}
.img img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
.ph{color:#1a56db;font-style:italic;}
.btn{display:block;margin:12px auto;padding:8px 28px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:11pt;}
@media print{.btn{display:none!important;}@page{size:A4 portrait;margin:5mm;}}
</style></head><body>
${pages.join('')}
<button class="btn" onclick="window.print()">🖨️ Print / Simpan PDF</button>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800">🏪 Transaksi Dealer</h2>
          {dealerSheet && <span className="text-xs text-gray-500">Sumber: {dealerSheet.sheetName} · {dealerSheet.rows.length} baris</span>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Cari..."
            value={dealerSearch}
            onChange={e => setDealerSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            onClick={() => { setDealerSheet(null); setDealerSelected(new Set()); setDealerSearch(''); setDealerSortCol(-1); setDealerSortDir('asc'); setDealerColFilters({}); setDateFrom(''); setDateTo(''); setActiveMonth(null); }}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm transition"
          >🔄 Refresh</button>
          <button
            onClick={doPrint}
            disabled={dealerSelected.size === 0}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition shadow"
          >🖨️ Print Terpilih ({dealerSelected.size})</button>
          <button
            onClick={doSync}
            disabled={syncLoading}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition shadow flex items-center gap-1.5"
          >
            {syncLoading ? <span className="animate-spin">⏳</span> : '☁️'} Sync ke Supabase
          </button>
          {syncMsg && <span className={`text-xs font-semibold ${syncMsg.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{syncMsg}</span>}
        </div>
      </div>

      {/* ===== FILTER TANGGAL PEMBELIAN ===== */}
      {dealerSheet && colDate >= 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Tanggal Pembelian
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5 text-sm">
                <label className="text-xs text-gray-500">Dari</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setActiveMonth(null); }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <label className="text-xs text-gray-500">Sampai</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setActiveMonth(null); }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); setActiveMonth(null); }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 transition"
                >✕ Reset</button>
              )}
            </div>
          </div>

          {/* Quick-pick bulan */}
          {monthOptions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleMonthPick(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${activeMonth === null && !dateFrom && !dateTo ? 'bg-yellow-400 border-yellow-400 text-gray-900' : 'bg-white border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-yellow-700'}`}
              >Semua</button>
              {monthOptions.slice(0, 18).map(m => {
                const [y, mo] = m.split('-');
                const label = new Date(+y, +mo - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                const isActive = activeMonth === m;
                return (
                  <button
                    key={m}
                    onClick={() => handleMonthPick(isActive ? null : m)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${isActive ? 'bg-yellow-400 border-yellow-400 text-gray-900' : 'bg-white border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-yellow-700'}`}
                  >{label}</button>
                );
              })}
            </div>
          )}

          {(dateFrom || dateTo) && (
            <p className="text-xs text-gray-400">
              Menampilkan <b className="text-gray-700">{filteredDealer.length}</b> baris
              {dateFrom && dateTo ? ` dari ${new Date(dateFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s/d ${new Date(dateTo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
            </p>
          )}
        </div>
      )}

      {dealerUnsyncedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          <span><b>{dealerUnsyncedCount} baris</b> di Google Sheets belum tersync ke Supabase.</span>
          <button
            onClick={doSync}
            disabled={syncLoading}
            className="ml-auto px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition"
          >{syncLoading ? '⏳ Sync...' : '☁️ Sync Sekarang'}</button>
        </div>
      )}

      {dealerLoading && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <p>Memuat data dari Supabase...</p>
        </div>
      )}

      {dealerError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <p className="font-bold mb-1">❌ Gagal memuat data</p>
          <p className="text-sm">{dealerError}</p>
          <button onClick={() => { setDealerSheet(null); setDealerSelected(new Set()); }} className="mt-2 text-xs underline text-red-600">Coba lagi</button>
        </div>
      )}

      {!dealerLoading && !dealerError && dealerSheet && (
        <>
          {dealerSheet.rows.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p>Tidak ada data di sheet ini.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-center w-10">
                        <input type="checkbox" checked={allDealerSel} onChange={toggleDealerAll} className="w-4 h-4 accent-blue-600" />
                      </th>
                      <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-10">#</th>
                      {hdrs.map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (dealerSortCol === i) setDealerSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            else { setDealerSortCol(i); setDealerSortDir('asc'); }
                          }}
                        >
                          <span className="flex items-center gap-1">
                            {h}
                            <span className={`text-xs ${dealerSortCol === i ? 'text-yellow-600 font-bold' : 'text-gray-300'}`}>
                              {dealerSortCol === i ? (dealerSortDir === 'asc' ? '▲' : '▼') : '⇅'}
                            </span>
                          </span>
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-yellow-50 border-b border-yellow-200">
                      <td className="px-2 py-1.5 text-center">
                        {Object.values(dealerColFilters).some(v => v) && (
                          <button
                            onClick={() => setDealerColFilters({})}
                            title="Hapus semua filter"
                            className="text-red-400 hover:text-red-600 text-xs font-bold"
                          >✕</button>
                        )}
                      </td>
                      <td className="px-2 py-1" />
                      {hdrs.map((_, i) => (
                        <td key={i} className="px-2 py-1">
                          <input
                            type="text"
                            placeholder="filter..."
                            value={dealerColFilters[i] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setDealerColFilters(prev => ({ ...prev, [i]: val }));
                            }}
                            className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-white"
                          />
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDealer.map(({ row, idx }) => {
                      const checked = dealerSelected.has(idx);
                      return (
                        <tr
                          key={idx}
                          onClick={() => toggleDealerRow(idx)}
                          className={`border-t border-gray-100 cursor-pointer transition-colors ${checked ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={checked} onChange={() => toggleDealerRow(idx)} className="w-4 h-4 accent-blue-600" />
                          </td>
                          <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                          {row.map((cell, ci) => {
                            const isImg = ci === colFoto && _isImg(cell);
                            return (
                              <td key={ci} className="px-3 py-2 text-gray-800 whitespace-nowrap max-w-[200px] truncate">
                                {isImg ? (
                                  <a href={_resolveImg(cell)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 underline text-xs">📷 Lihat Foto</a>
                                ) : cell || <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                Menampilkan {filteredDealer.length} dari {dealerSheet.rows.length} baris
                {dealerSelected.size > 0 && <span className="text-blue-600 font-semibold ml-2">· {dealerSelected.size} dipilih untuk print</span>}
              </div>
            </div>
          )}

          {/* Preview print */}
          {dealerSelected.size > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">Preview Print — 2 kartu per baris</h3>
                <button onClick={doPrint} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition shadow">🖨️ Print ke PDF</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selectedDealerRows.map((row, i) => {
                  const tv = colType >= 0 ? (row[colType] || '-') : '-';
                  const sv = colSN   >= 0 ? (row[colSN]   || '-') : '-';
                  const fv = colFoto >= 0 ? row[colFoto]  : '';
                  const fu = fv ? _resolveImg(fv) : '';
                  return (
                    <div key={i} className="border border-gray-300 bg-white rounded overflow-hidden shadow-sm">
                      <table className="w-full text-xs border-collapse">
                        <tbody>
                          <tr>
                            <td className="border border-gray-200 px-2 py-1.5 bg-gray-50 font-semibold w-2/5 text-gray-600">Type Barang</td>
                            <td className="border border-gray-200 px-2 py-1.5 font-bold text-blue-700">{tv}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-200 px-2 py-1.5 bg-gray-50 font-semibold text-gray-600">Serial Number</td>
                            <td className="border border-gray-200 px-2 py-1.5 font-bold text-gray-800">{sv}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="h-36 flex items-center justify-center border-t border-gray-200 bg-gray-50">
                        {fu && _isImg(fv) ? (
                          <div className="relative w-full h-full">
                            <Image src={fu} alt="foto kartu garansi" fill style={{ objectFit: 'contain' }} unoptimized />
                          </div>
                        ) : (
                          <span className="text-blue-500 italic text-xs">foto kartu garansi</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
