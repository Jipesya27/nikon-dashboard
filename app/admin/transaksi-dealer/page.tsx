'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';

interface SheetData {
  headers: string[];
  rows: string[][];
  sheetName: string;
}

// Cari index kolom secara case-insensitive berdasarkan kandidat nama
function findColIdx(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(c.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function isImageUrl(val: string): boolean {
  if (!val) return false;
  return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)/i.test(val) ||
    val.includes('drive.google.com') ||
    val.includes('googleusercontent.com') ||
    val.includes('docs.google.com/uc');
}

function driveThumb(url: string): string {
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return `/api/drive-file?id=${m[1]}`;
  const m2 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m2) return `/api/drive-file?id=${m2[1]}`;
  return url;
}

function resolveImg(url: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com') || url.includes('docs.google.com/uc')) return driveThumb(url);
  return url;
}

export default function TransaksiDealerPage() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPrintMode, setIsPrintMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/transaksi-dealer');
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Gagal memuat data');
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error tidak diketahui');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Deteksi kolom penting
  const colIdx = useMemo(() => {
    if (!data) return { type: -1, sn: -1, foto: -1 };
    const h = data.headers;
    return {
      type: findColIdx(h, ['type barang', 'tipe barang', 'type', 'tipe', 'model', 'nama barang', 'barang']),
      sn: findColIdx(h, ['serial number', 'serial', 'nomor seri', 's/n', 'sn', 'no seri']),
      foto: findColIdx(h, ['foto kartu garansi', 'foto garansi', 'foto', 'image', 'gambar', 'link foto', 'url foto', 'link', 'url']),
    };
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => !q || row.some(c => c.toLowerCase().includes(q)));
  }, [data, search]);

  const allFilteredIdx = filteredRows.map(r => r.idx);
  const allSelected = allFilteredIdx.length > 0 && allFilteredIdx.every(i => selected.has(i));

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        allFilteredIdx.forEach(i => next.delete(i));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        allFilteredIdx.forEach(i => next.add(i));
        return next;
      });
    }
  }

  function toggleRow(idx: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  const selectedRows = data ? data.rows.filter((_, i) => selected.has(i)) : [];

  function handlePrint() {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 200);
  }

  // Kolom yang ditampilkan di tabel (semua selain foto jika berupa URL panjang)
  const tableHeaders = data?.headers ?? [];

  return (
    <>
      {/* Print-only style */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; inset: 0; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      {/* Print area — hidden di layar kecuali mode print */}
      <div id="print-area" ref={printRef} style={{ display: isPrintMode ? 'block' : 'none' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8mm',
          padding: '0',
        }}>
          {selectedRows.map((row, i) => {
            const typeVal = colIdx.type >= 0 ? (row[colIdx.type] || '-') : '-';
            const snVal = colIdx.sn >= 0 ? (row[colIdx.sn] || '-') : '-';
            const fotoVal = colIdx.foto >= 0 ? row[colIdx.foto] : '';
            const fotoUrl = fotoVal ? resolveImg(fotoVal) : '';

            return (
              <div key={i} style={{
                border: '1.5px solid #333',
                pageBreakInside: 'avoid',
                fontFamily: 'Arial, sans-serif',
                fontSize: '10pt',
              }}>
                {/* Header tabel */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #333', padding: '3px 6px', width: '40%', background: '#f5f5f5', fontWeight: 600 }}>Type Barang</td>
                      <td style={{ border: '1px solid #333', padding: '3px 6px', fontWeight: 700, color: '#1a56db' }}>{typeVal}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #333', padding: '3px 6px', background: '#f5f5f5', fontWeight: 600 }}>Serial Number</td>
                      <td style={{ border: '1px solid #333', padding: '3px 6px', fontWeight: 700 }}>{snVal}</td>
                    </tr>
                  </tbody>
                </table>
                {/* Foto area */}
                <div style={{
                  height: '52mm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTop: '1px solid #ddd',
                  background: '#fafafa',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {fotoUrl && isImageUrl(fotoVal) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoUrl}
                      alt="foto kartu garansi"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ color: '#1a56db', fontStyle: 'italic', fontSize: '9pt' }}>
                      foto kartu garansi
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* UI utama (tidak tercetak) */}
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <div className="shadow rounded overflow-hidden">
            <Image src="/nikon-logo.svg" alt="Nikon" width={80} height={32} className="h-8 w-auto" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Transaksi Dealer</h1>
            <p className="text-xs text-gray-400">Data dari Google Spreadsheet</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={fetchData}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handlePrint}
              disabled={selected.size === 0}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-bold transition"
            >
              🖨️ Print Terpilih ({selected.size})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Cari..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm w-72 focus:outline-none focus:border-blue-500"
            />
            {data && (
              <span className="text-xs text-gray-400">
                {filteredRows.length} dari {data.rows.length} baris
                {selected.size > 0 && <span className="text-blue-400"> · {selected.size} dipilih</span>}
              </span>
            )}
          </div>

          {loading && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">⏳</div>
              <p>Memuat data dari Google Sheets...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
              <p className="font-bold mb-1">❌ Gagal memuat data</p>
              <p className="text-sm">{error}</p>
              <button onClick={fetchData} className="mt-2 text-xs underline">Coba lagi</button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {data.rows.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <div className="text-4xl mb-3">📭</div>
                  <p>Tidak ada data di sheet ini.</p>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-800 text-gray-300">
                          <th className="px-3 py-2.5 text-center w-10">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleAll}
                              className="w-4 h-4 accent-blue-500"
                            />
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-400 w-10">#</th>
                          {tableHeaders.map((h, i) => (
                            <th key={i} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map(({ row, idx }) => {
                          const isChecked = selected.has(idx);
                          const fotoVal = colIdx.foto >= 0 ? row[colIdx.foto] : '';
                          return (
                            <tr
                              key={idx}
                              onClick={() => toggleRow(idx)}
                              className={`border-t border-gray-800 cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'hover:bg-gray-800/60'
                              }`}
                            >
                              <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleRow(idx)}
                                  className="w-4 h-4 accent-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                              {row.map((cell, ci) => {
                                const isImg = ci === colIdx.foto && isImageUrl(cell);
                                return (
                                  <td key={ci} className="px-3 py-2 text-gray-200 whitespace-nowrap max-w-[220px] truncate">
                                    {isImg ? (
                                      <a
                                        href={resolveImg(cell)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="text-blue-400 underline text-xs"
                                      >
                                        📷 Lihat Foto
                                      </a>
                                    ) : cell || (
                                      <span className="text-gray-600">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              {/* Preview mini foto kartu garansi jika ada */}
                              {colIdx.foto >= 0 && fotoVal && isImageUrl(fotoVal) && (
                                <td className="px-3 py-2">
                                  {/* sudah ditampilkan di kolom foto */}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Preview print cards */}
              {selected.size > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-300">
                      Preview Print — {selected.size} item dipilih (2 per baris)
                    </h2>
                    <button
                      onClick={handlePrint}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold transition"
                    >
                      🖨️ Print ke PDF
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRows.map((row, i) => {
                      const typeVal = colIdx.type >= 0 ? (row[colIdx.type] || '-') : '-';
                      const snVal = colIdx.sn >= 0 ? (row[colIdx.sn] || '-') : '-';
                      const fotoVal = colIdx.foto >= 0 ? row[colIdx.foto] : '';
                      const fotoUrl = fotoVal ? resolveImg(fotoVal) : '';

                      return (
                        <div key={i} className="border border-gray-600 bg-white text-gray-900 rounded overflow-hidden">
                          <table className="w-full text-xs border-collapse">
                            <tbody>
                              <tr>
                                <td className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold w-2/5">Type Barang</td>
                                <td className="border border-gray-300 px-2 py-1 font-bold text-blue-700">{typeVal}</td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold">Serial Number</td>
                                <td className="border border-gray-300 px-2 py-1 font-bold">{snVal}</td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="h-40 flex items-center justify-center border-t border-gray-300 bg-gray-50">
                            {fotoUrl && isImageUrl(fotoVal) ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={fotoUrl}
                                  alt="foto kartu garansi"
                                  fill
                                  style={{ objectFit: 'contain' }}
                                  unoptimized
                                />
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
      </div>
    </>
  );
}
