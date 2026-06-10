'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Karyawan, ExpenseClaim, ExpenseClaimItem } from '@/app/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID').format(n);
}

function fmtDate(s: string) {
  if (!s) return '-';
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function fmtDateShort(s: string) {
  // For PDF: "21-Apr-26"
  if (!s) return '-';
  const d = new Date(s + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const yr = String(d.getFullYear()).slice(2);
  return `${day}-${months[d.getMonth()]}-${yr}`;
}

function fmtDateHeader(s: string) {
  // For PDF header: "8 May 2026"
  if (!s) return '-';
  const d = new Date(s + 'T00:00:00');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function extractDriveId(url: string): string | null {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  // might already be just an ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
  return null;
}

function driveProxyUrl(url: string) {
  const id = extractDriveId(url);
  if (!id) return url;
  return `/api/drive-file?id=${id}`;
}

function wa(s: string) {
  return (s || '').replace(/[^\x20-\xFF]/g, '').trim();
}

const STATUS_LABEL: Record<string, string> = {
  draft:     'Draft',
  submitted: 'Diajukan',
  approved:  'Disetujui',
  rejected:  'Ditolak',
};
const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
};

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function generateExpenseClaimPDF(
  claim: ExpenseClaim,
  imageScales: number[],   // 0.5 – 2.0 per receipt
) {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PW = 595.28;
  const PH = 841.89;
  const ML = 50; const MR = 50; const MT = 70; // margins
  const CW = PW - ML - MR;

  // ── PAGE 1: Summary table ──────────────────────────────────────────────────
  const p1 = pdfDoc.addPage([PW, PH]);
  let y = PH - MT;

  const drawText = (page: ReturnType<typeof pdfDoc.addPage>, text: string, x: number, yCur: number, size = 10, bold = false, color = rgb(0,0,0)) => {
    page.drawText(wa(text), { x, y: yCur, size, font: bold ? fontBold : font, color });
  };

  // Sort items by tanggal ASC untuk PDF
  const sortedItems = [...claim.items].sort((a, b) =>
    (a.tanggal || '').localeCompare(b.tanggal || '')
  );

  // Header (centered)
  const headerLines = [
    `Claim by : ${wa(claim.nama_pembuat)}`,
    ...(claim.from_person ? [`From : ${wa(claim.from_person)}`] : []),
    `To : ${wa(claim.to_person)}`,
    fmtDateHeader(claim.claim_date),
  ];
  for (const line of headerLines) {
    const w = font.widthOfTextAtSize(line, 11);
    drawText(p1, line, (PW - w) / 2, y, 11);
    y -= 18;
  }
  y -= 10;

  // Table columns: No | Tanggal | Description | Nominal
  const COL = { no: 25, tgl: 70, desc: CW - 25 - 70 - 85, nom: 85 };
  const ROW_H = 18;
  const TABLE_TOP = y;
  const COL_X = {
    no:   ML,
    tgl:  ML + COL.no,
    desc: ML + COL.no + COL.tgl,
    nom:  ML + COL.no + COL.tgl + COL.desc,
  };

  // Draw outer border + header row
  const drawHLine = (page: ReturnType<typeof pdfDoc.addPage>, yLine: number, x1 = ML, x2 = ML + CW) => {
    page.drawLine({ start: { x: x1, y: yLine }, end: { x: x2, y: yLine }, thickness: 0.5, color: rgb(0,0,0) });
  };
  const drawVLine = (page: ReturnType<typeof pdfDoc.addPage>, x: number, y1: number, y2: number) => {
    page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: 0.5, color: rgb(0,0,0) });
  };

  // Header row
  const headerRowY = y;
  p1.drawRectangle({ x: ML, y: headerRowY - ROW_H, width: CW, height: ROW_H, color: rgb(0.95, 0.95, 0.95) });
  drawHLine(p1, headerRowY);
  drawHLine(p1, headerRowY - ROW_H);
  drawText(p1, 'No',          COL_X.no   + 4, headerRowY - 13, 9, true);
  drawText(p1, 'Tanggal',     COL_X.tgl  + 4, headerRowY - 13, 9, true);
  drawText(p1, 'Description', COL_X.desc + 4, headerRowY - 13, 9, true);
  drawText(p1, 'Nominal',     COL_X.nom  + 4, headerRowY - 13, 9, true);
  y = headerRowY - ROW_H;

  // Data rows (items + 2 empty rows)
  const MIN_ROWS = Math.max(sortedItems.length + 2, 5);
  for (let i = 0; i < MIN_ROWS; i++) {
    const item = sortedItems[i];
    drawHLine(p1, y - ROW_H);
    if (item) {
      drawText(p1, String(i + 1),           COL_X.no   + 4, y - 13, 9);
      drawText(p1, fmtDateShort(item.tanggal), COL_X.tgl + 4, y - 13, 9);
      drawText(p1, wa(item.description),    COL_X.desc + 4, y - 13, 9);
      // Nominal right-aligned
      const nomStr = fmtRp(item.nominal);
      const nomW = font.widthOfTextAtSize(nomStr, 9);
      drawText(p1, nomStr, COL_X.nom + COL.nom - nomW - 4, y - 13, 9);
    }
    y -= ROW_H;
  }

  // TOTAL row
  drawHLine(p1, y - ROW_H);
  const totalStr = fmtRp(claim.total_nominal);
  const totalLabelW = fontBold.widthOfTextAtSize('TOTAL', 9);
  const totalW      = fontBold.widthOfTextAtSize(totalStr, 9);
  drawText(p1, 'TOTAL', COL_X.nom - totalLabelW - 8, y - 13, 9, true);
  drawText(p1, totalStr, COL_X.nom + COL.nom - totalW - 4, y - 13, 9, true);
  y -= ROW_H;

  // Vertical lines for table
  const tableBottom = y;
  const tableTop    = TABLE_TOP;
  [COL_X.no, COL_X.tgl, COL_X.desc, COL_X.nom, COL_X.nom + COL.nom].forEach(x =>
    drawVLine(p1, x, tableBottom, tableTop)
  );

  // ── PAGE 2+: Receipt images — urutan ikut sortedItems ─────────────────────
  // Kumpulkan item yang punya receipt_url, dalam urutan sortedItems
  const receiptItems = sortedItems
    .map((item, idx) => ({ item, origIdx: idx }))
    .filter(({ item }) => !!item.receipt_url);

  if (receiptItems.length > 0) {
    const imgPageMarginX = 40;
    const imgPageMarginY = 40;
    const imgContentW = PW - imgPageMarginX * 2;

    let curPage = pdfDoc.addPage([PW, PH]);
    let curX = imgPageMarginX;
    let curY = PH - imgPageMarginY;
    let rowH  = 0;

    for (let ri = 0; ri < receiptItems.length; ri++) {
      const { item, origIdx } = receiptItems[ri];
      const scale = imageScales[origIdx] ?? 0.9;
      const imgW  = imgContentW * Math.min(Math.max(scale, 0.3), 1.0);

      // Fetch image
      let embeddedImg;
      try {
        const proxyUrl = driveProxyUrl(item.receipt_url!);
        const resp = await fetch(proxyUrl);
        const buf  = new Uint8Array(await resp.arrayBuffer());
        const ct   = resp.headers.get('content-type') || '';
        if (ct.includes('png')) {
          embeddedImg = await pdfDoc.embedPng(buf);
        } else {
          embeddedImg = await pdfDoc.embedJpg(buf);
        }
      } catch {
        continue;
      }

      const aspect = embeddedImg.height / embeddedImg.width;
      const imgH   = imgW * aspect;

      // New row if not enough horizontal space
      if (curX + imgW > PW - imgPageMarginX && curX > imgPageMarginX) {
        curX  = imgPageMarginX;
        curY -= rowH + 16;
        rowH  = 0;
      }
      // New page if not enough vertical space
      if (curY - imgH < imgPageMarginY) {
        curPage = pdfDoc.addPage([PW, PH]);
        curX    = imgPageMarginX;
        curY    = PH - imgPageMarginY;
        rowH    = 0;
      }

      const drawY = curY - imgH;
      curPage.drawImage(embeddedImg, { x: curX, y: drawY, width: imgW, height: imgH });

      // Badge circle kuning — nomor = posisi di tabel (origIdx + 1)
      const R = 14;
      const cx = curX + R + 4;
      const cy = drawY + imgH - R - 4;
      curPage.drawCircle({ x: cx, y: cy, size: R, color: rgb(1, 0.78, 0), borderColor: rgb(0.4, 0.3, 0), borderWidth: 0.5 });
      const numStr = String(origIdx + 1);
      const nW = fontBold.widthOfTextAtSize(numStr, 11);
      curPage.drawText(numStr, { x: cx - nW / 2, y: cy - 5, size: 11, font: fontBold, color: rgb(0, 0, 0) });

      rowH  = Math.max(rowH, imgH);
      curX += imgW + 12;
    }
  }

  const bytes = await pdfDoc.save();
  const blob  = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `Claim-${wa(claim.nama_pembuat)}-${claim.claim_date}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ─── Empty item factory ────────────────────────────────────────────────────────
function emptyItem(): ExpenseClaimItem {
  return { tanggal: new Date().toISOString().slice(0, 10), description: '', nominal: 0 };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { currentUser: Karyawan | null }

export default function ExpenseClaimTab({ currentUser }: Props) {
  const [claims, setClaims]   = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Modal state
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseClaim | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<ExpenseClaim>>({
    to_person: '', claim_date: new Date().toISOString().slice(0, 10),
    items: [emptyItem()], receipt_urls: [], catatan: '',
  });
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null); // index item yang sedang upload
  const [saving, setSaving] = useState(false);
  const receiptInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // PDF export modal
  const [pdfTarget,    setPdfTarget]    = useState<ExpenseClaim | null>(null);
  const [imageScales,  setImageScales]  = useState<number[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'Finance';

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchClaims = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/expense-claim');
      if (!res.ok) throw new Error(await res.text());
      setClaims(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  // ── Open modal ────────────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null);
    setForm({
      from_person: '', to_person: '', claim_date: new Date().toISOString().slice(0, 10),
      items: [emptyItem()], receipt_urls: [], catatan: '',
    });
    setShowModal(true);
  }
  function openEdit(c: ExpenseClaim) {
    setEditTarget(c);
    setForm({ ...c });
    setShowModal(true);
  }

  // ── Item CRUD ──────────────────────────────────────────────────────────────
  function updateItem(idx: number, partial: Partial<ExpenseClaimItem>) {
    const items = [...(form.items ?? [])];
    items[idx] = { ...items[idx], ...partial };
    setForm(f => ({ ...f, items }));
  }
  function addItem() {
    setForm(f => ({ ...f, items: [...(f.items ?? []), emptyItem()] }));
  }
  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: (f.items ?? []).filter((_, i) => i !== idx) }));
  }
  function sortItemsByDate() {
    setForm(f => ({
      ...f,
      items: [...(f.items ?? [])].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '')),
    }));
  }

  // ── Upload receipt per item ───────────────────────────────────────────────
  async function uploadReceiptForItem(file: File, itemIdx: number) {
    setUploadingIdx(itemIdx);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('prefix', 'klaim');
      fd.append('serial', `item${itemIdx}`);
      const res = await fetch('/api/upload-google-drive', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      updateItem(itemIdx, { receipt_url: url });
    } catch (e) {
      alert('Gagal upload: ' + (e instanceof Error ? e.message : 'Error'));
    } finally { setUploadingIdx(null); }
  }

  function removeReceiptForItem(itemIdx: number) {
    updateItem(itemIdx, { receipt_url: undefined });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.to_person?.trim()) { alert('Kolom "To" wajib diisi'); return; }
    if (!form.claim_date) { alert('Tanggal klaim wajib diisi'); return; }
    const items = (form.items ?? []).filter(it => it.description.trim());
    if (items.length === 0) { alert('Minimal 1 item keterangan'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        items,
        created_by:   currentUser?.username ?? '',
        nama_pembuat: currentUser?.nama_karyawan ?? '',
      };
      const url    = editTarget ? `/api/expense-claim/${editTarget.id}` : '/api/expense-claim';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      setShowModal(false);
      await fetchClaims();
    } catch (e) {
      alert('Gagal simpan: ' + (e instanceof Error ? e.message : 'Error'));
    } finally { setSaving(false); }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Hapus klaim ini?')) return;
    const res = await fetch(`/api/expense-claim/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Gagal hapus'); return; }
    setClaims(prev => prev.filter(c => c.id !== id));
  }

  // ── Change status (admin only) ─────────────────────────────────────────────
  async function handleStatus(id: string, status: ExpenseClaim['status']) {
    const res = await fetch(`/api/expense-claim/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { alert('Gagal update status'); return; }
    const updated = await res.json();
    setClaims(prev => prev.map(c => c.id === id ? updated : c));
  }

  // ── Open PDF modal ─────────────────────────────────────────────────────────
  function openPdfExport(c: ExpenseClaim) {
    setPdfTarget(c);
    // scales array sesuai jumlah items (index sama dengan item index)
    setImageScales(c.items.map(() => 0.9));
  }

  async function handleGeneratePdf() {
    if (!pdfTarget) return;
    setGeneratingPdf(true);
    try { await generateExpenseClaimPDF(pdfTarget, imageScales); }
    catch (e) { alert('Gagal generate PDF: ' + (e instanceof Error ? e.message : 'Error')); }
    finally { setGeneratingPdf(false); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800">🧾 Klaim Biaya</h2>
          <p className="text-xs text-gray-500">Pengajuan reimbursement pengeluaran operasional</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#FFE500] hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm shadow transition"
        >
          + Buat Klaim Baru
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500 animate-pulse">Memuat data...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Claims list */}
      {!loading && claims.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧾</p>
          <p className="font-semibold">Belum ada klaim</p>
          <p className="text-sm">Klik &quot;Buat Klaim Baru&quot; untuk mulai</p>
        </div>
      )}

      <div className="space-y-3">
        {claims.map(c => (
          <ClaimCard
            key={c.id}
            claim={c}
            isAdmin={isAdmin}
            currentUsername={currentUser?.username ?? ''}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatus={handleStatus}
            onExportPdf={openPdfExport}
          />
        ))}
      </div>

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-10 pb-6 overflow-y-auto px-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800">{editTarget ? 'Edit Klaim' : 'Buat Klaim Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Header fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-form">From (Pengirim)</label>
                  <input className="input-form" value={form.from_person ?? ''} onChange={e => setForm(f => ({ ...f, from_person: e.target.value }))} placeholder="Nama / divisi pengirim" />
                </div>
                <div>
                  <label className="label-form">To (Penerima) *</label>
                  <input className="input-form" value={form.to_person ?? ''} onChange={e => setForm(f => ({ ...f, to_person: e.target.value }))} placeholder="Nama penerima / atasan" />
                </div>
                <div className="col-span-2">
                  <label className="label-form">Tanggal Klaim *</label>
                  <input type="date" className="input-form" value={form.claim_date ?? ''} onChange={e => setForm(f => ({ ...f, claim_date: e.target.value }))} />
                </div>
              </div>

              {/* Items table — tiap baris punya kolom upload foto */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-form mb-0">Detail Pengeluaran *</label>
                  <div className="flex gap-2">
                    <button onClick={sortItemsByDate} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-50 transition">↑ Sort Tanggal</button>
                    <button onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Tambah baris</button>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 w-5">No</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 w-28">Tanggal</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700">Keterangan</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-700 w-24">Nominal (Rp)</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-700 w-20">Bukti</th>
                        <th className="w-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.items ?? []).map((item, idx) => (
                        <tr key={idx} className="border-t align-middle">
                          <td className="px-2 py-1 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-1 py-1">
                            <input type="date" className="input-form text-xs py-1" value={item.tanggal} onChange={e => updateItem(idx, { tanggal: e.target.value })} />
                          </td>
                          <td className="px-1 py-1">
                            <input className="input-form text-xs py-1" value={item.description} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Keterangan pengeluaran" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="number" className="input-form text-xs py-1 text-right" value={item.nominal || ''} onChange={e => updateItem(idx, { nominal: Number(e.target.value) })} placeholder="0" min={0} />
                          </td>
                          {/* Kolom foto per baris */}
                          <td className="px-1 py-1 text-center">
                            <input
                              ref={el => { receiptInputRefs.current[idx] = el; }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) uploadReceiptForItem(f, idx);
                                e.target.value = '';
                              }}
                            />
                            {item.receipt_url ? (
                              <div className="relative inline-block group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={driveProxyUrl(item.receipt_url)}
                                  alt="bukti"
                                  className="w-10 h-10 object-cover rounded cursor-pointer border border-gray-200"
                                  onClick={() => window.open(driveProxyUrl(item.receipt_url!), '_blank')}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeReceiptForItem(idx)}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full hidden group-hover:flex items-center justify-center leading-none"
                                >×</button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => receiptInputRefs.current[idx]?.click()}
                                disabled={uploadingIdx === idx}
                                className="text-xs text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-400 rounded px-1.5 py-1 transition disabled:opacity-50"
                                title="Upload foto bukti"
                              >
                                {uploadingIdx === idx ? '⟳' : '📎'}
                              </button>
                            )}
                          </td>
                          <td className="px-1 py-1 text-center">
                            {(form.items ?? []).length > 1 && (
                              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-gray-50">
                        <td colSpan={3} className="px-2 py-2 text-right font-bold text-sm text-gray-700">TOTAL</td>
                        <td className="px-2 py-2 text-right font-bold text-sm">
                          Rp {fmtRp((form.items ?? []).reduce((s, i) => s + (Number(i.nominal) || 0), 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="label-form">Catatan (opsional)</label>
                <textarea rows={2} className="input-form resize-none" value={form.catatan ?? ''} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} placeholder="Catatan tambahan..." />
              </div>
            </div>

            <div className="px-5 py-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#FFE500] hover:bg-yellow-400 text-black font-bold rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Menyimpan...' : (editTarget ? 'Simpan Perubahan' : 'Buat Klaim')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Export Modal ── */}
      {pdfTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-10 pb-6 overflow-y-auto px-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800">📄 Export PDF — Klaim Biaya</h3>
              <button onClick={() => { setPdfTarget(null); }} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Claim summary */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-gray-500">Claim by:</span> <strong>{pdfTarget.nama_pembuat}</strong></p>
                {pdfTarget.from_person && <p><span className="text-gray-500">From:</span> <strong>{pdfTarget.from_person}</strong></p>}
                <p><span className="text-gray-500">To:</span> <strong>{pdfTarget.to_person}</strong></p>
                <p><span className="text-gray-500">Tanggal:</span> {fmtDateHeader(pdfTarget.claim_date)}</p>
                <p><span className="text-gray-500">Total:</span> <strong className="text-green-700">Rp {fmtRp(pdfTarget.total_nominal)}</strong></p>
              </div>

              {/* Image scales — per item (sorted by tanggal) */}
              {(() => {
                const sortedForPdf = [...pdfTarget.items]
                  .map((item, idx) => ({ item, origIdx: idx }))
                  .sort((a, b) => (a.item.tanggal || '').localeCompare(b.item.tanggal || ''))
                  .filter(({ item }) => !!item.receipt_url);
                return sortedForPdf.length > 0 ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Ukuran gambar bukti di PDF (urutan sesuai tabel)</p>
                    <div className="space-y-4">
                      {sortedForPdf.map(({ item, origIdx }) => (
                        <div key={origIdx} className="flex items-center gap-4">
                          <div className="relative flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={driveProxyUrl(item.receipt_url!)} alt={`Bukti ${origIdx+1}`} className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 bg-yellow-400 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{origIdx+1}</div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span className="truncate max-w-[180px]">#{origIdx+1} · {item.description || '(tanpa keterangan)'}</span>
                              <span className="font-semibold ml-2 flex-shrink-0">{Math.round((imageScales[origIdx] ?? 0.9) * 100)}%</span>
                            </div>
                            <input
                              type="range" min={30} max={100} step={5}
                              value={Math.round((imageScales[origIdx] ?? 0.9) * 100)}
                              onChange={e => {
                                const next = [...imageScales];
                                next[origIdx] = Number(e.target.value) / 100;
                                setImageScales(next);
                              }}
                              className="w-full accent-yellow-400"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                              <span>Kecil (30%)</span><span>Penuh (100%)</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Tidak ada foto bukti yang diunggah di item manapun.</p>
                );
              })()}
            </div>

            <div className="px-5 py-4 border-t flex gap-2 justify-end">
              <button onClick={() => setPdfTarget(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
                className="px-5 py-2 bg-[#FFE500] hover:bg-yellow-400 text-black font-bold rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {generatingPdf ? (
                  <><span className="animate-spin">⟳</span> Generating...</>
                ) : (
                  <>📄 Download PDF</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Claim Card ────────────────────────────────────────────────────────────────

interface ClaimCardProps {
  claim: ExpenseClaim;
  isAdmin: boolean;
  currentUsername: string;
  onEdit: (c: ExpenseClaim) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, status: ExpenseClaim['status']) => void;
  onExportPdf: (c: ExpenseClaim) => void;
}

function ClaimCard({ claim, isAdmin, currentUsername, onEdit, onDelete, onStatus, onExportPdf }: ClaimCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isOwner = claim.created_by === currentUsername;
  const canEdit = isOwner && claim.status === 'draft';

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
      {/* Card header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_COLOR[claim.status]}`}>
            {STATUS_LABEL[claim.status]}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-800 truncate">
              {claim.nama_pembuat}{claim.from_person ? ` (${claim.from_person})` : ''} → {claim.to_person}
            </p>
            <p className="text-xs text-gray-500">{fmtDate(claim.claim_date)} · {claim.items.length} item · Rp {new Intl.NumberFormat('id-ID').format(claim.total_nominal)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onExportPdf(claim); }}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition"
          >📄 PDF</button>
          {canEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(claim); }}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded transition"
            >✏️ Edit</button>
          )}
          {(isAdmin || isOwner) && claim.status === 'draft' && (
            <button
              onClick={e => { e.stopPropagation(); onStatus(claim.id!, 'submitted'); }}
              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition"
            >Ajukan</button>
          )}
          {isAdmin && claim.status === 'submitted' && (
            <>
              <button onClick={e => { e.stopPropagation(); onStatus(claim.id!, 'approved'); }} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded transition">✓ Setujui</button>
              <button onClick={e => { e.stopPropagation(); onStatus(claim.id!, 'rejected'); }} className="text-xs bg-red-400 hover:bg-red-500 text-white px-2 py-1 rounded transition">✕ Tolak</button>
            </>
          )}
          {(isAdmin || isOwner) && claim.status === 'draft' && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(claim.id!); }}
              className="text-xs text-red-400 hover:text-red-600 px-1 py-1 transition"
            >🗑</button>
          )}
          <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded: items + receipts */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-gray-50">
          {/* Items table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left pb-1 w-6">No</th>
                <th className="text-left pb-1 w-24">Tanggal</th>
                <th className="text-left pb-1">Keterangan</th>
                <th className="text-right pb-1">Nominal</th>
                <th className="text-center pb-1 w-8">📎</th>
              </tr>
            </thead>
            <tbody>
              {claim.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 text-gray-400 text-xs">{i+1}</td>
                  <td className="py-1 text-xs text-gray-600">{fmtDateShort(item.tanggal)}</td>
                  <td className="py-1">{item.description}</td>
                  <td className="py-1 text-right font-mono text-sm">{new Intl.NumberFormat('id-ID').format(item.nominal)}</td>
                  <td className="py-1 text-center">
                    {item.receipt_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={driveProxyUrl(item.receipt_url)}
                        alt="bukti"
                        className="w-7 h-7 object-cover rounded cursor-pointer border border-gray-200 inline-block"
                        onClick={() => window.open(driveProxyUrl(item.receipt_url!), '_blank')}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-2 text-right text-xs font-bold text-gray-700">TOTAL</td>
                <td className="pt-2 text-right font-bold font-mono">Rp {new Intl.NumberFormat('id-ID').format(claim.total_nominal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Receipts per item (sorted by tanggal) */}
          {(() => {
            const withPhoto = [...claim.items]
              .map((item, idx) => ({ item, origIdx: idx }))
              .sort((a, b) => (a.item.tanggal || '').localeCompare(b.item.tanggal || ''))
              .filter(({ item }) => !!item.receipt_url);
            return withPhoto.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Bukti Pembayaran ({withPhoto.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {withPhoto.map(({ item, origIdx }) => (
                    <div key={origIdx} className="relative rounded-lg overflow-hidden border border-gray-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={driveProxyUrl(item.receipt_url!)}
                        alt={`Bukti ${origIdx+1}`}
                        className="w-full h-28 object-cover cursor-pointer"
                        onClick={() => window.open(driveProxyUrl(item.receipt_url!), '_blank')}
                      />
                      <div className="absolute top-1 left-1 bg-yellow-400 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{origIdx+1}</div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] px-1 py-0.5 truncate">{item.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {claim.catatan && (
            <p className="text-xs text-gray-500 italic">Catatan: {claim.catatan}</p>
          )}
        </div>
      )}
    </div>
  );
}
