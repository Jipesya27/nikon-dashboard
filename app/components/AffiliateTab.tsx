'use client';

import React from 'react';
import { Affiliate, AffiliateSkema, AffiliatePenjualan } from '@/app/index';
import { GradientActionBtn, IconTrash, IconEdit } from '@/app/components/GradientActionBtn';

export interface AffiliateTabProps {
  affiliates: Affiliate[];
  affiliateView: 'list' | 'detail';
  setAffiliateView: (v: 'list' | 'detail') => void;
  selectedAffiliate: Affiliate | null;
  setSelectedAffiliate: React.Dispatch<React.SetStateAction<Affiliate | null>>;
  affiliateSkema: AffiliateSkema[];
  setAffiliateSkema: React.Dispatch<React.SetStateAction<AffiliateSkema[]>>;
  affiliatePenjualan: AffiliatePenjualan[];
  setAffiliatePenjualan: React.Dispatch<React.SetStateAction<AffiliatePenjualan[]>>;
  affiliateFormOpen: boolean;
  setAffiliateFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingAffiliateId: string | null;
  setEditingAffiliateId: (v: string | null) => void;
  affiliateFormData: Partial<Affiliate>;
  setAffiliateFormData: React.Dispatch<React.SetStateAction<Partial<Affiliate>>>;
  skemaFormData: { barang: string; nilai_barang: string; potongan_persen: string };
  setSkemaFormData: React.Dispatch<React.SetStateAction<{ barang: string; nilai_barang: string; potongan_persen: string }>>;
  penjualanFormData: { barang: string; harga_barang: string; persentase: string };
  setPenjualanFormData: React.Dispatch<React.SetStateAction<{ barang: string; harga_barang: string; persentase: string }>>;
  skemaFormOpen: boolean;
  setSkemaFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
  penjualanFormOpen: boolean;
  setPenjualanFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
  penjualanFotoFiles: File[];
  setPenjualanFotoFiles: React.Dispatch<React.SetStateAction<File[]>>;
  affiliateFotoProfilFile: File | null;
  setAffiliateFotoProfilFile: (v: File | null) => void;
  affiliateSearch: string;
  setAffiliateSearch: (v: string) => void;
  affiliateSaving: boolean;
  fetchAffiliates: () => Promise<void>;
  fetchAffiliateDetail: (id: string) => Promise<void>;
  saveAffiliate: () => Promise<void>;
  deleteAffiliate: (id: string) => Promise<void>;
  addSkema: () => Promise<void>;
  deleteSkema: (id: string) => Promise<void>;
  addPenjualan: () => Promise<void>;
  deletePenjualan: (id: string) => Promise<void>;
  proxyImg: (url: string | null | undefined) => string | null;
}

export default function AffiliateTab({
  affiliates, affiliateView, setAffiliateView,
  selectedAffiliate, setSelectedAffiliate,
  affiliateSkema, setAffiliateSkema,
  affiliatePenjualan, setAffiliatePenjualan,
  affiliateFormOpen, setAffiliateFormOpen,
  editingAffiliateId, setEditingAffiliateId,
  affiliateFormData, setAffiliateFormData,
  skemaFormData, setSkemaFormData,
  penjualanFormData, setPenjualanFormData,
  skemaFormOpen, setSkemaFormOpen,
  penjualanFormOpen, setPenjualanFormOpen,
  penjualanFotoFiles, setPenjualanFotoFiles,
  affiliateFotoProfilFile, setAffiliateFotoProfilFile,
  affiliateSearch, setAffiliateSearch,
  affiliateSaving,
  fetchAffiliates, fetchAffiliateDetail,
  saveAffiliate, deleteAffiliate,
  addSkema, deleteSkema,
  addPenjualan, deletePenjualan,
  proxyImg,
}: AffiliateTabProps) {
  const fmtRp = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));

  const sisal = affiliateSkema.reduce((acc, s) => acc + s.nilai_barang - (s.nilai_barang * s.potongan_persen / 100), 0);
  let running = sisal;
  const penjualanWithSisa = affiliatePenjualan.map(p => {
    const nominal = p.harga_barang * p.persentase / 100;
    running -= nominal;
    return { ...p, nominal, sisa_kontrak: running };
  });

  const doPrintAffiliate = () => {
    if (!selectedAffiliate) return;
    const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));

    const skemaRows = affiliateSkema.map(s => {
      const pot = s.nilai_barang * s.potongan_persen / 100;
      const sisa = s.nilai_barang - pot;
      return `<tr>
        <td>${s.barang}</td>
        <td class="r">${fmt(s.nilai_barang)}</td>
        <td class="c">${s.potongan_persen}%</td>
        <td class="r">${fmt(pot)}</td>
        <td class="r">${fmt(sisa)}</td>
      </tr>`;
    }).join('');

    let runPrint = sisal;
    const penjualanRows = affiliatePenjualan.map((p, i) => {
      const nom = p.harga_barang * p.persentase / 100;
      runPrint -= nom;
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${p.barang}</td>
        <td class="r">${fmt(p.harga_barang)}</td>
        <td class="c">${p.persentase}%</td>
        <td class="r">${fmt(nom)}</td>
        <td class="r">${fmt(runPrint)}</td>
      </tr>`;
    }).join('');

    const emptyRows = Array.from({ length: Math.max(0, 3 - affiliatePenjualan.length) },
      () => `<tr>${'<td>&nbsp;</td>'.repeat(6)}</tr>`).join('');

    const fotoSection = affiliatePenjualan.filter(p => p.foto_urls && p.foto_urls.length > 0).map(p => {
      const imgs = (p.foto_urls || []).map(url => {
        const proxyUrl = proxyImg(url);
        const src = proxyUrl ? `${window.location.origin}${proxyUrl}` : url;
        return `<img src="${src}" style="width:120px;height:100px;object-fit:cover;border:1px solid #ccc;border-radius:4px;" />`;
      }).join('');
      return `<div style="margin-bottom:10px"><strong>${p.barang}</strong><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">${imgs}</div></div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 12mm; font-size: 10pt; }
  p.title { font-weight: 700; font-size: 11pt; margin: 0 0 6px; }
  p.subtitle { font-weight: 700; font-size: 10pt; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #FFE500; border: 1px solid #999; padding: 5px 8px; font-weight: 700; text-align: center; }
  td { border: 1px solid #ccc; padding: 4px 8px; }
  td.r { text-align: right; }
  td.c { text-align: center; }
  @page { size: A4 portrait; margin: 12mm; }
</style></head><body>
<p class="title">SKEMA AFFILIATE (${selectedAffiliate.nama})</p>
<table><thead><tr>
  <th>Barang yang diambil</th>
  <th>Nilai barang yang diambil</th>
  <th>Potongan %</th>
  <th>Potongan Rp</th>
  <th>Sisa</th>
</tr></thead><tbody>${skemaRows}</tbody></table>

<p class="subtitle">Penjualan Affiliate</p>
<table><thead><tr>
  <th>No</th><th>Barang Affiliator</th><th>Harga Barang</th>
  <th>Persentase %</th><th>Nominal</th><th>Sisa Kontrak</th>
</tr></thead><tbody>${penjualanRows}${emptyRows}</tbody></table>
${fotoSection ? `<p class="subtitle">Foto Barang Affiliator</p>${fotoSection}` : ''}
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Popup diblokir browser. Izinkan popup untuk mencetak.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  // ---- DETAIL VIEW ----
  if (affiliateView === 'detail' && selectedAffiliate) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => { setAffiliateView('list'); setSelectedAffiliate(null); setAffiliateSkema([]); setAffiliatePenjualan([]); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition">
            ← Kembali
          </button>
          {selectedAffiliate.foto_profil ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxyImg(selectedAffiliate.foto_profil) || selectedAffiliate.foto_profil} alt={selectedAffiliate.nama} className="w-10 h-10 object-cover rounded-full border-2 border-yellow-400 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black text-base shrink-0">{selectedAffiliate.nama.charAt(0).toUpperCase()}</div>
          )}
          <h2 className="text-lg font-bold text-gray-800">{selectedAffiliate.nama}</h2>
          <span className="text-xs text-gray-400">{selectedAffiliate.phone}</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => { setAffiliateFormData(selectedAffiliate); setEditingAffiliateId(selectedAffiliate.id); setAffiliateFotoProfilFile(null); setAffiliateFormOpen(true); setAffiliateView('list'); }}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm transition">✏️ Edit</button>
            <button onClick={doPrintAffiliate}
              className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-sm font-bold shadow transition">🖨️ Cetak PDF</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { label: 'Alamat', value: selectedAffiliate.alamat },
            { label: 'Kontrak', value: `${selectedAffiliate.awal_kontrak || '-'} s/d ${selectedAffiliate.akhir_kontrak || '-'}` },
            { label: 'Fee ≤ 6 Jam', value: selectedAffiliate.fee_max_6_jam ? `Rp ${fmtRp(selectedAffiliate.fee_max_6_jam)}` : '-' },
            { label: 'Fee > 6 Jam', value: selectedAffiliate.fee_diatas_6_jam ? `Rp ${fmtRp(selectedAffiliate.fee_diatas_6_jam)}` : '-' },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{f.label}</p>
              <p className="font-semibold text-gray-800">{f.value || '-'}</p>
            </div>
          ))}
          {selectedAffiliate.map && (
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Maps</p>
              <a href={selectedAffiliate.map} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Buka Maps</a>
            </div>
          )}
        </div>

        {/* SKEMA */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <h3 className="font-bold text-gray-800">📋 Skema Affiliate</h3>
            <button onClick={() => setSkemaFormOpen(o => !o)}
              className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-bold transition">
              {skemaFormOpen ? '✕ Batal' : '+ Tambah Baris'}
            </button>
          </div>
          {skemaFormOpen && (
            <div className="flex flex-wrap gap-2 p-3 bg-yellow-50 border-b border-yellow-100">
              <input placeholder="Barang yang diambil *" value={skemaFormData.barang} onChange={e => setSkemaFormData(f => ({ ...f, barang: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm flex-1 min-w-40" />
              <input placeholder="Nilai Barang *" type="number" value={skemaFormData.nilai_barang} onChange={e => setSkemaFormData(f => ({ ...f, nilai_barang: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36" />
              <input placeholder="Potongan %" type="number" value={skemaFormData.potongan_persen} onChange={e => setSkemaFormData(f => ({ ...f, potongan_persen: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28" />
              <button onClick={addSkema} disabled={affiliateSaving}
                className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black rounded text-sm font-bold transition">
                {affiliateSaving ? '...' : 'Simpan'}
              </button>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-yellow-400">
              <tr>
                {['Barang yang diambil','Nilai Barang','Potongan %','Potongan Rp','Sisa',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affiliateSkema.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">Belum ada data skema.</td></tr>
              )}
              {affiliateSkema.map(s => {
                const pot = s.nilai_barang * s.potongan_persen / 100;
                const sisa = s.nilai_barang - pot;
                return (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{s.barang}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtRp(s.nilai_barang)}</td>
                    <td className="px-3 py-2 text-center">{s.potongan_persen}%</td>
                    <td className="px-3 py-2 text-right font-mono text-orange-600">{fmtRp(pot)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-green-700">{fmtRp(sisa)}</td>
                    <td className="px-3 py-2 text-center">
                      <GradientActionBtn onClick={() => deleteSkema(s.id)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                    </td>
                  </tr>
                );
              })}
              {affiliateSkema.length > 0 && (
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td className="px-3 py-2 font-bold text-gray-700" colSpan={4}>Total Sisa Target</td>
                  <td className="px-3 py-2 text-right font-bold font-mono text-green-700">{fmtRp(sisal)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PENJUALAN */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <h3 className="font-bold text-gray-800">🛒 Penjualan Affiliate</h3>
            <button onClick={() => setPenjualanFormOpen(o => !o)}
              className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-bold transition">
              {penjualanFormOpen ? '✕ Batal' : '+ Tambah Baris'}
            </button>
          </div>
          {penjualanFormOpen && (
            <div className="p-3 bg-yellow-50 border-b border-yellow-100 space-y-2">
              <div className="flex flex-wrap gap-2">
                <input placeholder="Barang Affiliator *" value={penjualanFormData.barang} onChange={e => setPenjualanFormData(f => ({ ...f, barang: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm flex-1 min-w-40" />
                <input placeholder="Harga Barang *" type="number" value={penjualanFormData.harga_barang} onChange={e => setPenjualanFormData(f => ({ ...f, harga_barang: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36" />
                <input placeholder="Persentase %" type="number" step="0.1" value={penjualanFormData.persentase} onChange={e => setPenjualanFormData(f => ({ ...f, persentase: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-gray-600">Foto bukti penjualan (maks 6):</label>
                <input type="file" accept="image/*" multiple
                  onChange={e => {
                    const files = Array.from(e.target.files || []).slice(0, 6);
                    setPenjualanFotoFiles(files);
                    e.target.value = '';
                  }}
                  className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-yellow-400 file:text-black file:text-xs file:font-bold file:cursor-pointer" />
                {penjualanFotoFiles.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {penjualanFotoFiles.map((f, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(f)} alt="" className="w-12 h-12 object-cover rounded border border-gray-300" />
                        <button onClick={() => setPenjualanFotoFiles(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center leading-none">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={addPenjualan} disabled={affiliateSaving}
                  className="ml-auto px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black rounded text-sm font-bold transition">
                  {affiliateSaving ? '...' : 'Simpan'}
                </button>
              </div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-yellow-400">
              <tr>
                {['No','Barang Affiliator','Harga Barang','Persentase %','Nominal','Sisa Kontrak','Foto',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {penjualanWithSisa.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-gray-400 text-xs">Belum ada data penjualan.</td></tr>
              )}
              {penjualanWithSisa.map((p, i) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2">{p.barang}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtRp(p.harga_barang)}</td>
                  <td className="px-3 py-2 text-center">{p.persentase}%</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-700 font-semibold">{fmtRp(p.nominal)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-green-700">{fmtRp(p.sisa_kontrak)}</td>
                  <td className="px-3 py-2">
                    {p.foto_urls && p.foto_urls.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {p.foto_urls.map((url, fi) => {
                          const src = proxyImg(url) || url;
                          return (
                            <a key={fi} href={url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt={`foto ${fi + 1}`} className="w-10 h-10 object-cover rounded border border-gray-200 hover:opacity-80 transition" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </a>
                          );
                        })}
                      </div>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <GradientActionBtn onClick={() => deletePenjualan(p.id)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---- LIST VIEW ----
  const filteredAffiliates = affiliates.filter(a => {
    const q = affiliateSearch.toLowerCase();
    return !q || a.nama.toLowerCase().includes(q) || a.phone.includes(q) || (a.alamat || '').toLowerCase().includes(q);
  });

  const CARD_PALETTES = [
    { from: '#1e40af', to: '#3b82f6', avatar: '#2563eb', btn: '#1e40af' },
    { from: '#065f46', to: '#10b981', avatar: '#059669', btn: '#065f46' },
    { from: '#6d28d9', to: '#a78bfa', avatar: '#7c3aed', btn: '#5b21b6' },
    { from: '#be123c', to: '#fb7185', avatar: '#e11d48', btn: '#9f1239' },
    { from: '#0f766e', to: '#2dd4bf', avatar: '#0d9488', btn: '#0f766e' },
    { from: '#92400e', to: '#fbbf24', avatar: '#b45309', btn: '#78350f' },
    { from: '#9d174d', to: '#f472b6', avatar: '#db2777', btn: '#831843' },
    { from: '#1e3a5f', to: '#60a5fa', avatar: '#1d4ed8', btn: '#1e3a5f' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-800">🤝 Daftar Affiliate</h2>
        <input type="text" placeholder="Cari nama / phone..." value={affiliateSearch} onChange={e => setAffiliateSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        <button onClick={fetchAffiliates} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm transition">🔄</button>
        <button onClick={() => { setAffiliateFormData({}); setEditingAffiliateId(null); setAffiliateFormOpen(o => !o); }}
          className="ml-auto px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition shadow">
          {affiliateFormOpen && !editingAffiliateId ? '✕ Batal' : '+ Tambah Affiliate'}
        </button>
      </div>

      {affiliateFormOpen && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-gray-700 text-sm">{editingAffiliateId ? '✏️ Edit Affiliate' : '➕ Tambah Affiliate Baru'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'nama', label: 'Nama *', type: 'text' },
              { key: 'phone', label: 'Phone *', type: 'text' },
              { key: 'alamat', label: 'Alamat', type: 'text' },
              { key: 'map', label: 'Link Maps', type: 'url' },
              { key: 'awal_kontrak', label: 'Awal Kontrak', type: 'date' },
              { key: 'akhir_kontrak', label: 'Akhir Kontrak', type: 'date' },
              { key: 'fee_max_6_jam', label: 'Fee ≤ 6 Jam (Rp)', type: 'number' },
              { key: 'fee_diatas_6_jam', label: 'Fee > 6 Jam (Rp)', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                <input type={f.type} value={(affiliateFormData[f.key as keyof Affiliate] as string) || ''}
                  onChange={e => setAffiliateFormData(prev => ({ ...prev, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || null : e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Foto Profil</label>
              {affiliateFormData.foto_profil && !affiliateFotoProfilFile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proxyImg(affiliateFormData.foto_profil as string) || affiliateFormData.foto_profil as string} alt="foto profil" className="w-14 h-14 object-cover rounded-full border-2 border-yellow-400 mb-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              {affiliateFotoProfilFile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(affiliateFotoProfilFile)} alt="preview" className="w-14 h-14 object-cover rounded-full border-2 border-blue-400 mb-1" />
              )}
              <input type="file" accept="image/*"
                onChange={e => setAffiliateFotoProfilFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-600 file:mr-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-yellow-400 file:text-black file:text-xs file:font-bold file:cursor-pointer" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setAffiliateFormOpen(false); setAffiliateFormData({}); setEditingAffiliateId(null); }}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-sm transition">Batal</button>
            <button onClick={saveAffiliate} disabled={affiliateSaving}
              className="px-6 py-1.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black rounded font-bold text-sm transition shadow">
              {affiliateSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {affiliates.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🤝</div>
          <p className="font-semibold">Belum ada data affiliate.</p>
          <p className="text-sm mt-1">Klik &quot;+ Tambah Affiliate&quot; untuk mulai.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAffiliates.map((a, idx) => {
              const pal = CARD_PALETTES[idx % CARD_PALETTES.length];
              const isActive = a.akhir_kontrak ? new Date(a.akhir_kontrak) >= new Date() : true;
              const initials = a.nama.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="h-16 relative" style={{ background: `linear-gradient(to right, ${pal.from}, ${pal.to})` }}>
                    <div className="absolute top-1 right-2 text-xs font-bold px-2 py-0.5 rounded-full shadow"
                      style={{ background: isActive ? '#16a34a' : '#dc2626', color: '#fff' }}>
                      {isActive ? 'AKTIF' : 'NONAKTIF'}
                    </div>
                    <div className="absolute -bottom-8 left-4">
                      {a.foto_profil ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={proxyImg(a.foto_profil) || a.foto_profil} alt={a.nama}
                          className="w-16 h-16 object-cover rounded-full border-4 border-white shadow-md"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-16 h-16 rounded-full border-4 border-white shadow-md flex items-center justify-center font-bold text-white text-xl"
                          style={{ background: pal.avatar }}>{initials}</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-10 pb-4 px-4 flex flex-col flex-1">
                    <p className="font-bold text-gray-900 text-base leading-tight truncate">{a.nama}</p>
                    <p className="text-xs text-gray-500 mt-0.5">📞 {a.phone}</p>
                    {a.alamat && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">📍 {a.alamat}</p>
                    )}
                    {a.map && (
                      <a href={a.map} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-0.5 truncate">🗺️ Lihat Maps</a>
                    )}

                    <div className="border-t border-dashed border-gray-200 my-3" />

                    <div className="space-y-1.5 text-xs text-gray-600 flex-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-semibold uppercase tracking-wide">Kontrak</span>
                        <span className="text-right font-mono text-gray-700">
                          {a.awal_kontrak ? a.awal_kontrak : '—'}<br/>
                          {a.akhir_kontrak ? `s/d ${a.akhir_kontrak}` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-semibold uppercase tracking-wide">Fee ≤6Jam</span>
                        <span className="font-mono font-semibold text-gray-800">{a.fee_max_6_jam ? `Rp ${fmtRp(a.fee_max_6_jam)}` : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-semibold uppercase tracking-wide">Fee &gt;6Jam</span>
                        <span className="font-mono font-semibold text-gray-800">{a.fee_diatas_6_jam ? `Rp ${fmtRp(a.fee_diatas_6_jam)}` : '—'}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-1.5">
                      <button onClick={async () => {
                        setSelectedAffiliate(a);
                        setAffiliateView('detail');
                        await fetchAffiliateDetail(a.id);
                      }} className="flex-1 py-1.5 text-white rounded-lg text-xs font-bold transition shadow-sm hover:opacity-90"
                        style={{ background: pal.btn }}>
                        Detail
                      </button>
                      <GradientActionBtn onClick={() => { setAffiliateFormData(a); setEditingAffiliateId(a.id); setAffiliateFotoProfilFile(null); setAffiliateFormOpen(true); }} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                      <GradientActionBtn onClick={() => deleteAffiliate(a.id)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 text-right mt-1">{filteredAffiliates.length} affiliate</p>
        </>
      )}
    </div>
  );
}
