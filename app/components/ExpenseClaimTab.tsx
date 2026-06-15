'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Karyawan, ExpenseClaim, ExpenseClaimItem } from '@/app/index';
import { GradientActionBtn, IconCheck, IconTrash, IconEdit } from '@/app/components/GradientActionBtn';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID').format(n);
}

function fmtDate(s: string) {
  if (!s) return '-';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
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

// ─── Image layout types & helpers ─────────────────────────────────────────────

type ImgLayout = { x: number; y: number; w: number; h: number; page: number; rotation: number };

const PDF_W = 595.28;
const PDF_H = 841.89;
const CANVAS_W   = 420; // UI pixels for A4 width
const CANVAS_SC  = CANVAS_W / PDF_W;
const CANVAS_H   = Math.round(PDF_H * CANVAS_SC);
const PAGE_GAP_PX = 24; // gap between A4 pages in the flat canvas (UI pixels)

function autoLayout(
  items: { origIdx: number }[],
  aspects: Record<number, number>,
): ImgLayout[] {
  const MX = 40, MY = 40, GAP = 12, DEFAULT_W = 230;
  const layouts: ImgLayout[] = [];
  let curX = MX, curY = MY, rowH = 0, page = 0;
  for (const { origIdx } of items) {
    const aspect = aspects[origIdx] ?? 0.75;
    const w = DEFAULT_W, h = w * aspect;
    if (curX + w > PDF_W - MX && curX > MX) { curX = MX; curY += rowH + GAP; rowH = 0; }
    if (curY + h > PDF_H - MY) { page++; curX = MX; curY = MY; rowH = 0; }
    layouts.push({ x: curX, y: curY, w, h, page, rotation: 0 });
    rowH = Math.max(rowH, h); curX += w + GAP;
  }
  return layouts;
}

function DatePickerInput({ value, onChange, className }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const displayValue = value ? (() => {
    const d = new Date(value + 'T00:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  })() : '';
  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        className="input-form flex items-center min-h-[38px] cursor-pointer select-none"
        onClick={() => {
          const el = inputRef.current;
          if (!el) return;
          if (typeof el.showPicker === 'function') el.showPicker();
          else el.click();
        }}
      >
        {displayValue || <span className="text-gray-400 text-sm">Pilih tanggal</span>}
      </div>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        tabIndex={-1}
      />
    </div>
  );
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
  receiptLayouts: ImgLayout[],
) {
  const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');

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

  // ── PAGE 2+: Receipt images at absolute positions ─────────────────────────
  const receiptItemsForPdf = sortedItems
    .map((item, idx) => ({ item, origIdx: idx }))
    .filter(({ item }) => !!item.receipt_url);

  if (receiptItemsForPdf.length > 0 && receiptLayouts.length > 0) {
    const numImgPages = Math.max(...receiptLayouts.map(l => l.page)) + 1;
    const imgPages: ReturnType<typeof pdfDoc.addPage>[] = [];
    for (let p = 0; p < numImgPages; p++) imgPages.push(pdfDoc.addPage([PW, PH]));

    for (let ri = 0; ri < receiptItemsForPdf.length; ri++) {
      const { item, origIdx } = receiptItemsForPdf[ri];
      const layout = receiptLayouts[ri];
      if (!layout) continue;
      const page = imgPages[layout.page];
      if (!page) continue;

      let embeddedImg;
      try {
        const proxyUrl = driveProxyUrl(item.receipt_url!);
        const resp = await fetch(proxyUrl);
        const buf  = new Uint8Array(await resp.arrayBuffer());
        const ct   = resp.headers.get('content-type') || '';
        embeddedImg = ct.includes('png') ? await pdfDoc.embedPng(buf) : await pdfDoc.embedJpg(buf);
      } catch { continue; }

      // PDF y=0 is bottom; convert from top-origin
      // Handle rotation: layout.w/h are the displayed bounding box after rotation
      const rot = layout.rotation ?? 0;
      const needsSwap = rot === 90 || rot === 270;
      const origW = needsSwap ? layout.h : layout.w;
      const origH = needsSwap ? layout.w : layout.h;
      // Center of displayed box in PDF coords (y from bottom)
      const cxPdf = layout.x + layout.w / 2;
      const cyPdf = (PH - layout.y - layout.h) + layout.h / 2;
      // Anchor point (bottom-left of pre-rotation image) so rotation is around center
      let ancX: number, ancY: number;
      if      (rot ===   0) { ancX = cxPdf - origW/2; ancY = cyPdf - origH/2; }
      else if (rot ===  90) { ancX = cxPdf + origH/2; ancY = cyPdf - origW/2; }
      else if (rot === 180) { ancX = cxPdf + origW/2; ancY = cyPdf + origH/2; }
      else                  { ancX = cxPdf - origH/2; ancY = cyPdf + origW/2; }
      page.drawImage(embeddedImg, { x: ancX, y: ancY, width: origW, height: origH, rotate: degrees(rot) });

      const R = 14;
      const cx = layout.x + R + 4;
      const cy = (PH - layout.y - layout.h) + layout.h - R - 4;
      page.drawCircle({ x: cx, y: cy, size: R, color: rgb(1, 0.78, 0), borderColor: rgb(0.4, 0.3, 0), borderWidth: 0.5 });
      const numStr = String(origIdx + 1);
      const nW = fontBold.widthOfTextAtSize(numStr, 11);
      page.drawText(numStr, { x: cx - nW / 2, y: cy - 5, size: 11, font: fontBold, color: rgb(0, 0, 0) });
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
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);
  const [receiptModal, setReceiptModal] = useState<{
    idx: number;
    tanggal: string;
    description: string;
    nominal: number;
    file: File | null;
    previewUrl: string | null;
    existingUrl?: string;
  } | null>(null);
  const [imgZoom,    setImgZoom]    = useState(1);
  const [imgOffset,  setImgOffset]  = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart     = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastTouchDist = useRef<number | null>(null);

  // PDF export modal
  const [pdfTarget,      setPdfTarget]      = useState<ExpenseClaim | null>(null);
  const [imageLayouts,   setImageLayouts]   = useState<ImgLayout[]>([]);
  const [aspectRatios,   setAspectRatios]   = useState<Record<number, number>>({});
  const [loadingLayouts, setLoadingLayouts] = useState(false);
  const [generatingPdf,  setGeneratingPdf]  = useState(false);
  const [pdfTab,         setPdfTab]         = useState<'layout'|'preview'>('layout');
  const layoutDragRef = useRef<{
    type: 'move' | 'resize';
    imgIdx: number;
    startMX: number; startMY: number;
    startX: number; startY: number;
    startW: number; startH: number;
    startPage: number;
  } | null>(null);

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

  // ── Receipt upload modal ──────────────────────────────────────────────────
  function openReceiptModal(idx: number) {
    const item = (form.items ?? [])[idx];
    if (!item) return;
    setImgZoom(1); setImgOffset({ x: 0, y: 0 });
    setReceiptModal({
      idx,
      tanggal: item.tanggal,
      description: item.description,
      nominal: item.nominal,
      file: null,
      previewUrl: item.receipt_url ? driveProxyUrl(item.receipt_url) : null,
      existingUrl: item.receipt_url,
    });
  }

  function closeReceiptModal() {
    if (receiptModal?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(receiptModal.previewUrl);
    }
    setReceiptModal(null);
    setImgZoom(1); setImgOffset({ x: 0, y: 0 });
  }

  function removeReceiptInModal() {
    if (receiptModal?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(receiptModal.previewUrl);
    }
    setReceiptModal(m => m ? { ...m, file: null, previewUrl: null, existingUrl: undefined } : null);
  }

  // ── Image zoom / pan handlers ─────────────────────────────────────────────
  function onImgWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setImgZoom(z => {
      const next = Math.min(Math.max(z * factor, 1), 5);
      if (next <= 1) { setImgOffset({ x: 0, y: 0 }); return 1; }
      return next;
    });
  }
  function onImgMouseDown(e: React.MouseEvent) {
    if (imgZoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: imgOffset.x, oy: imgOffset.y };
  }
  function onImgMouseMove(e: React.MouseEvent) {
    if (!isDragging || !dragStart.current) return;
    setImgOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.x, y: dragStart.current.oy + e.clientY - dragStart.current.y });
  }
  function onImgMouseUp() { setIsDragging(false); dragStart.current = null; }
  function onImgDblClick() { setImgZoom(1); setImgOffset({ x: 0, y: 0 }); }
  function onImgTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      lastTouchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    } else if (e.touches.length === 1 && imgZoom > 1) {
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: imgOffset.x, oy: imgOffset.y };
    }
  }
  function onImgTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ratio = dist / lastTouchDist.current;
      lastTouchDist.current = dist;
      setImgZoom(z => { const next = Math.min(Math.max(z * ratio, 1), 5); if (next <= 1) setImgOffset({ x: 0, y: 0 }); return next; });
    } else if (e.touches.length === 1 && dragStart.current) {
      setImgOffset({ x: dragStart.current.ox + e.touches[0].clientX - dragStart.current.x, y: dragStart.current.oy + e.touches[0].clientY - dragStart.current.y });
    }
  }
  function onImgTouchEnd() { lastTouchDist.current = null; dragStart.current = null; setIsDragging(false); }

  async function handleSaveReceipt() {
    if (!receiptModal) return;
    const { idx, tanggal, description, nominal, file, existingUrl } = receiptModal;
    let receipt_url: string | undefined = existingUrl;

    if (file) {
      setUploadingIdx(idx);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('prefix', 'klaim');
        fd.append('serial', `item${idx}`);
        const res = await fetch('/api/upload-google-drive', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
        receipt_url = (await res.json()).url;
      } catch (e) {
        alert('Gagal upload: ' + (e instanceof Error ? e.message : 'Error'));
        setUploadingIdx(null);
        return;
      }
      setUploadingIdx(null);
    }

    const items = [...(form.items ?? [])];
    items[idx] = { ...items[idx], tanggal, description, nominal, receipt_url };
    setForm(f => ({ ...f, items }));
    if (receiptModal.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(receiptModal.previewUrl);
    setReceiptModal(null);
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
    setPdfTab('layout');
    setImageLayouts([]);
    setAspectRatios({});
    setLoadingLayouts(true);

    const sorted = [...c.items].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
    const receipts = sorted
      .map((item, idx) => ({ item, origIdx: idx }))
      .filter(({ item }) => !!item.receipt_url);

    if (receipts.length === 0) { setLoadingLayouts(false); return; }

    const aspects: Record<number, number> = {};
    Promise.all(receipts.map(({ item, origIdx }) =>
      new Promise<void>(resolve => {
        const img = new window.Image();
        img.onload  = () => { aspects[origIdx] = img.naturalHeight / img.naturalWidth; resolve(); };
        img.onerror = () => { aspects[origIdx] = 0.75; resolve(); };
        img.src = driveProxyUrl(item.receipt_url!);
      })
    )).then(() => {
      setAspectRatios(aspects);
      setImageLayouts(autoLayout(receipts, aspects));
      setLoadingLayouts(false);
    });
  }

  async function handleGeneratePdf() {
    if (!pdfTarget) return;
    setGeneratingPdf(true);
    try { await generateExpenseClaimPDF(pdfTarget, imageLayouts); }
    catch (e) { alert('Gagal generate PDF: ' + (e instanceof Error ? e.message : 'Error')); }
    finally { setGeneratingPdf(false); }
  }

  // ── Layout drag handlers ───────────────────────────────────────────────────
  function onLayoutPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    imgIdx: number,
    type: 'move' | 'resize',
  ) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const layout = imageLayouts[imgIdx];
    layoutDragRef.current = {
      type, imgIdx,
      startMX: e.clientX, startMY: e.clientY,
      startX: layout.x,   startY: layout.y,
      startW: layout.w,   startH: layout.h,
      startPage: layout.page,
    };
  }

  function onLayoutPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!layoutDragRef.current) return;
    const d = layoutDragRef.current;
    setImageLayouts(prev => {
      const next = [...prev];
      const lay  = next[d.imgIdx];
      if (d.type === 'move') {
        // Use flat-canvas coords so images can cross page boundaries
        const PAGE_TOTAL_PX = CANVAS_H + PAGE_GAP_PX;
        const startTotalTop = d.startPage * PAGE_TOTAL_PX + d.startY * CANVAS_SC;
        const newTotalTop   = startTotalTop + (e.clientY - d.startMY);
        const newTotalLeft  = d.startX * CANVAS_SC + (e.clientX - d.startMX);

        const newPage = Math.max(0, Math.min(9, Math.floor(newTotalTop / PAGE_TOTAL_PX)));
        const yPx     = newTotalTop - newPage * PAGE_TOTAL_PX;

        next[d.imgIdx] = {
          ...lay,
          x:    Math.max(0, Math.min(PDF_W - lay.w, newTotalLeft / CANVAS_SC)),
          y:    Math.max(0, Math.min(PDF_H - lay.h, yPx / CANVAS_SC)),
          page: newPage,
        };
      } else {
        const aspect = d.startH / d.startW;
        const dx = (e.clientX - d.startMX) / CANVAS_SC;
        const newW = Math.max(50, Math.min(PDF_W - d.startX, d.startW + dx));
        next[d.imgIdx] = { ...lay, w: newW, h: newW * aspect };
      }
      return next;
    });
  }

  function onLayoutPointerUp() { layoutDragRef.current = null; }

  function rotateLayout(imgIdx: number) {
    setImageLayouts(prev => {
      const next   = [...prev];
      const lay    = next[imgIdx];
      const newRot = ((lay.rotation ?? 0) + 90) % 360;
      // When crossing 0↔90 or 180↔270 the displayed bounding box swaps w/h
      const wasSwap = (lay.rotation ?? 0) === 90 || (lay.rotation ?? 0) === 270;
      const willSwap = newRot === 90 || newRot === 270;
      const newW = wasSwap !== willSwap ? lay.h : lay.w;
      const newH = wasSwap !== willSwap ? lay.w : lay.h;
      next[imgIdx] = { ...lay, rotation: newRot, w: newW, h: newH };
      return next;
    });
  }

  function moveToPage(imgIdx: number, delta: number) {
    setImageLayouts(prev => {
      const next = [...prev];
      const lay  = next[imgIdx];
      next[imgIdx] = { ...lay, page: Math.max(0, Math.min(9, lay.page + delta)) };
      return next;
    });
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
                  <DatePickerInput value={form.claim_date ?? ''} onChange={v => setForm(f => ({ ...f, claim_date: v }))} />
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
                            <DatePickerInput value={item.tanggal} onChange={v => updateItem(idx, { tanggal: v })} className="text-xs" />
                          </td>
                          <td className="px-1 py-1">
                            <input className="input-form text-xs py-1" value={item.description} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Keterangan pengeluaran" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="number" className="input-form text-xs py-1 text-right" value={item.nominal || ''} onChange={e => updateItem(idx, { nominal: Number(e.target.value) })} placeholder="0" min={0} />
                          </td>
                          {/* Kolom foto per baris */}
                          <td className="px-1 py-1 text-center">
                            {item.receipt_url ? (
                              <button
                                type="button"
                                onClick={() => openReceiptModal(idx)}
                                title="Edit bukti"
                                className="relative inline-block"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={driveProxyUrl(item.receipt_url)}
                                  alt="bukti"
                                  className="w-10 h-10 object-cover rounded border border-gray-200"
                                />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openReceiptModal(idx)}
                                className="text-xs text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-400 rounded px-1.5 py-1 transition"
                                title="Upload foto bukti"
                              >
                                📎
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

      {/* ── Receipt Upload Modal ── */}
      {receiptModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800">📎 Upload Bukti</h3>
              <button onClick={closeReceiptModal} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Large image frame */}
              <div
                className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden relative select-none"
                style={{ cursor: !receiptModal.previewUrl ? 'pointer' : imgZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
                onClick={() => { if (!receiptModal.previewUrl || imgZoom <= 1) receiptFileInputRef.current?.click(); }}
                onWheel={receiptModal.previewUrl ? onImgWheel : undefined}
                onMouseDown={receiptModal.previewUrl ? onImgMouseDown : undefined}
                onMouseMove={receiptModal.previewUrl ? onImgMouseMove : undefined}
                onMouseUp={receiptModal.previewUrl ? onImgMouseUp : undefined}
                onMouseLeave={receiptModal.previewUrl ? onImgMouseUp : undefined}
                onDoubleClick={receiptModal.previewUrl ? onImgDblClick : undefined}
                onTouchStart={receiptModal.previewUrl ? onImgTouchStart : undefined}
                onTouchMove={receiptModal.previewUrl ? onImgTouchMove : undefined}
                onTouchEnd={receiptModal.previewUrl ? onImgTouchEnd : undefined}
              >
                {receiptModal.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={receiptModal.previewUrl}
                    alt="preview"
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none"
                    style={{
                      transform: `scale(${imgZoom}) translate(${imgOffset.x / imgZoom}px, ${imgOffset.y / imgZoom}px)`,
                      transformOrigin: 'center',
                      transition: isDragging ? 'none' : 'transform 0.15s ease',
                    }}
                  />
                ) : (
                  <div className="text-center text-gray-400 space-y-2 pointer-events-none">
                    <p className="text-4xl">📷</p>
                    <p className="text-sm font-medium">Klik untuk pilih gambar</p>
                  </div>
                )}
                {uploadingIdx === receiptModal.idx && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="animate-spin text-3xl">⟳</span>
                  </div>
                )}
                {/* Zoom badge — klik untuk reset */}
                {receiptModal.previewUrl && imgZoom > 1 && (
                  <button
                    type="button"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setImgZoom(1); setImgOffset({ x: 0, y: 0 }); }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1 rounded-full transition"
                  >
                    {Math.round(imgZoom * 100)}% ✕
                  </button>
                )}
                {/* Hint saat zoom = 1 */}
                {receiptModal.previewUrl && imgZoom === 1 && uploadingIdx !== receiptModal.idx && (
                  <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                    <span className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">Scroll/pinch zoom · klik ganti foto</span>
                  </div>
                )}
              </div>
              <input
                ref={receiptFileInputRef}
                type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (receiptModal.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(receiptModal.previewUrl);
                    const url = URL.createObjectURL(f);
                    setImgZoom(1); setImgOffset({ x: 0, y: 0 });
                    setReceiptModal(m => m ? { ...m, file: f, previewUrl: url } : null);
                  }
                  e.target.value = '';
                }}
              />
              {receiptModal.previewUrl && (
                <button type="button" onClick={removeReceiptInModal} className="text-xs text-red-500 hover:text-red-700 underline">
                  Hapus foto
                </button>
              )}
              {/* Fields */}
              <div>
                <label className="label-form">Tanggal</label>
                <DatePickerInput value={receiptModal.tanggal} onChange={v => setReceiptModal(m => m ? { ...m, tanggal: v } : null)} />
              </div>
              <div>
                <label className="label-form">Keterangan</label>
                <input className="input-form" value={receiptModal.description} placeholder="Keterangan pengeluaran"
                  onChange={e => setReceiptModal(m => m ? { ...m, description: e.target.value } : null)} />
              </div>
              <div>
                <label className="label-form">Nominal (Rp)</label>
                <input type="number" className="input-form text-right" value={receiptModal.nominal || ''} placeholder="0" min={0}
                  onChange={e => setReceiptModal(m => m ? { ...m, nominal: Number(e.target.value) } : null)} />
              </div>
            </div>
            <div className="px-5 py-4 border-t flex gap-2 justify-end">
              <button onClick={closeReceiptModal} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button
                onClick={handleSaveReceipt}
                disabled={uploadingIdx !== null}
                className="px-5 py-2 bg-[#FFE500] hover:bg-yellow-400 text-black font-bold rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {uploadingIdx !== null ? <><span className="animate-spin">⟳</span> Mengupload...</> : 'Simpan'}
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

            {/* Tabs */}
            <div className="flex border-b px-5">
              {(['layout', 'preview'] as const).map(t => (
                <button key={t} onClick={() => setPdfTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${pdfTab === t ? 'border-[#FFE500] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                  {t === 'layout' ? '📐 Layout A4' : '👁 Preview Tabel'}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 space-y-4">

            {/* ── Preview tab ── */}
            {pdfTab === 'preview' && (() => {
              const sortedItems = [...pdfTarget.items].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
              const receiptItems = sortedItems.map((item, idx) => ({ item, origIdx: idx })).filter(({ item }) => !!item.receipt_url);
              return (
                <div className="space-y-4">
                  {/* Page 1 preview */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 font-medium">Halaman 1 — Tabel</div>
                    <div className="p-4 bg-white text-xs font-mono space-y-1">
                      <div className="text-center space-y-0.5 mb-3">
                        <p><strong>Claim by : {pdfTarget.nama_pembuat}</strong></p>
                        {pdfTarget.from_person && <p>From : {pdfTarget.from_person}</p>}
                        <p>To : {pdfTarget.to_person}</p>
                        <p>{fmtDateHeader(pdfTarget.claim_date)}</p>
                      </div>
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-1 py-0.5 text-left w-6">No</th>
                            <th className="border border-gray-300 px-1 py-0.5 text-left w-20">Tanggal</th>
                            <th className="border border-gray-300 px-1 py-0.5 text-left">Description</th>
                            <th className="border border-gray-300 px-1 py-0.5 text-right w-20">Nominal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedItems.map((item, i) => (
                            <tr key={i}>
                              <td className="border border-gray-300 px-1 py-0.5">{i + 1}</td>
                              <td className="border border-gray-300 px-1 py-0.5">{fmtDateShort(item.tanggal)}</td>
                              <td className="border border-gray-300 px-1 py-0.5">{item.description}</td>
                              <td className="border border-gray-300 px-1 py-0.5 text-right">{fmtRp(item.nominal)}</td>
                            </tr>
                          ))}
                          {[...Array(Math.max(0, 2 - (sortedItems.length < 3 ? sortedItems.length : 0)))].map((_, i) => (
                            <tr key={`empty-${i}`}><td className="border border-gray-300 px-1 py-0.5">&nbsp;</td><td className="border border-gray-300 px-1 py-0.5"></td><td className="border border-gray-300 px-1 py-0.5"></td><td className="border border-gray-300 px-1 py-0.5"></td></tr>
                          ))}
                          <tr className="bg-gray-50 font-bold">
                            <td className="border border-gray-300 px-1 py-0.5" colSpan={3} align="right">TOTAL</td>
                            <td className="border border-gray-300 px-1 py-0.5 text-right">{fmtRp(pdfTarget.total_nominal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Page 2 preview */}
                  {receiptItems.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 font-medium">Halaman 2+ — Foto Bukti ({receiptItems.length} foto)</div>
                      <div className="p-3 bg-white flex flex-wrap gap-3">
                        {receiptItems.map(({ item, origIdx }) => (
                          <div key={origIdx} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={driveProxyUrl(item.receipt_url!)} alt={`Bukti ${origIdx+1}`}
                              style={{ width: '144px' }}
                              className="rounded border border-gray-200 object-cover max-h-40" />
                            <span className="absolute top-1 left-1 bg-yellow-400 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">{origIdx + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
              {/* ── Layout tab ── */}
              {pdfTab === 'layout' && (() => {
                const sorted = [...pdfTarget.items].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
                const receiptItems = sorted
                  .map((item, idx) => ({ item, origIdx: idx }))
                  .filter(({ item }) => !!item.receipt_url);

                if (receiptItems.length === 0) {
                  return <p className="text-sm text-gray-500 italic">Tidak ada foto bukti yang diunggah di item manapun.</p>;
                }

                const numPages = imageLayouts.length > 0
                  ? Math.max(...imageLayouts.map(l => l.page)) + 1
                  : 1;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Drag untuk pindah/antar-hal · ↻ putar · ◄► ganti hal · sudut kanan bawah = resize</p>
                      <button
                        onClick={() => setImageLayouts(autoLayout(receiptItems, aspectRatios))}
                        className="text-xs text-blue-600 hover:underline border border-blue-200 px-2 py-0.5 rounded"
                      >
                        ↺ Reset
                      </button>
                    </div>

                    {loadingLayouts ? (
                      <div className="flex items-center justify-center py-10 text-gray-400">
                        <span className="animate-spin mr-2 text-xl">⟳</span> Memuat gambar...
                      </div>
                    ) : (
                      /* ── Flat multi-page canvas (all pages stacked, images drag across) ── */
                      <div
                        className="overflow-y-auto mx-auto"
                        style={{ width: CANVAS_W, maxHeight: 540 }}
                      >
                        <div
                          className="relative"
                          style={{ width: CANVAS_W, height: numPages * (CANVAS_H + PAGE_GAP_PX) - PAGE_GAP_PX }}
                        >
                          {/* A4 page backgrounds */}
                          {Array.from({ length: numPages }).map((_, pageIdx) => (
                            <div
                              key={pageIdx}
                              className="absolute bg-white shadow border border-gray-300"
                              style={{
                                left: 0, width: CANVAS_W,
                                top: pageIdx * (CANVAS_H + PAGE_GAP_PX),
                                height: CANVAS_H,
                              }}
                            >
                              <div className="absolute inset-0 pointer-events-none" style={{
                                backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
                                backgroundSize: `${Math.round(50 * CANVAS_SC)}px ${Math.round(50 * CANVAS_SC)}px`,
                              }} />
                              <div className="absolute top-1 right-2 text-[9px] text-gray-400 pointer-events-none">
                                Hal.{pageIdx + 2}
                              </div>
                            </div>
                          ))}

                          {/* Images — flat layer so drag crosses page boundaries */}
                          {receiptItems.map(({ item, origIdx }, imgIdx) => {
                            const layout = imageLayouts[imgIdx];
                            if (!layout) return null;
                            const rot      = layout.rotation ?? 0;
                            const needsSwap = rot === 90 || rot === 270;
                            const boxW = layout.w * CANVAS_SC;
                            const boxH = layout.h * CANVAS_SC;
                            const imgW = needsSwap ? boxH : boxW;
                            const imgH = needsSwap ? boxW : boxH;
                            const totalTop = layout.page * (CANVAS_H + PAGE_GAP_PX) + layout.y * CANVAS_SC;
                            return (
                              <div
                                key={origIdx}
                                className="absolute border-2 border-blue-400 rounded shadow-md select-none overflow-hidden"
                                style={{
                                  left: layout.x * CANVAS_SC,
                                  top:  totalTop,
                                  width:  boxW,
                                  height: boxH,
                                  cursor: 'move',
                                  touchAction: 'none',
                                  zIndex: 10,
                                }}
                                onPointerDown={e => onLayoutPointerDown(e, imgIdx, 'move')}
                                onPointerMove={onLayoutPointerMove}
                                onPointerUp={onLayoutPointerUp}
                              >
                                {/* Image with rotation */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={driveProxyUrl(item.receipt_url!)}
                                  alt={`Bukti ${origIdx + 1}`}
                                  draggable={false}
                                  style={{
                                    position: 'absolute',
                                    width: imgW, height: imgH,
                                    top: '50%', left: '50%',
                                    transform: `translate(-50%,-50%) rotate(${rot}deg)`,
                                    objectFit: 'cover',
                                    pointerEvents: 'none',
                                  }}
                                />
                                {/* Number badge */}
                                <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow pointer-events-none z-10">
                                  {origIdx + 1}
                                </div>
                                {/* Rotate button — top right */}
                                <button
                                  className="absolute top-1 right-1 bg-white/80 hover:bg-yellow-300 text-gray-800 text-xs w-5 h-5 rounded-full flex items-center justify-center shadow z-10"
                                  style={{ touchAction: 'none' }}
                                  title="Putar 90°"
                                  onPointerDown={e => e.stopPropagation()}
                                  onClick={e => { e.stopPropagation(); rotateLayout(imgIdx); }}
                                >↻</button>
                                {/* Page nav — bottom bar (leaves gap for resize handle) */}
                                <div
                                  className="absolute bottom-0 left-0 right-5 flex items-center justify-center gap-0.5 bg-black/50 py-0.5 z-10"
                                  onPointerDown={e => e.stopPropagation()}
                                >
                                  <button
                                    className="text-white text-[10px] px-1 hover:text-yellow-400 disabled:opacity-30"
                                    disabled={layout.page === 0}
                                    onClick={e => { e.stopPropagation(); moveToPage(imgIdx, -1); }}
                                  >◄</button>
                                  <span className="text-white text-[10px] min-w-[36px] text-center">
                                    Hal.{layout.page + 2}
                                  </span>
                                  <button
                                    className="text-white text-[10px] px-1 hover:text-yellow-400"
                                    onClick={e => { e.stopPropagation(); moveToPage(imgIdx, 1); }}
                                  >►</button>
                                </div>
                                {/* Resize handle — bottom right */}
                                <div
                                  className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 hover:bg-blue-600 flex items-center justify-center z-20"
                                  style={{ cursor: 'se-resize', touchAction: 'none' }}
                                  onPointerDown={e => { e.stopPropagation(); onLayoutPointerDown(e, imgIdx, 'resize'); }}
                                  onPointerMove={onLayoutPointerMove}
                                  onPointerUp={onLayoutPointerUp}
                                >
                                  <svg width="10" height="10" viewBox="0 0 10 10" className="pointer-events-none">
                                    <path d="M 2 8 L 8 2 M 5 8 L 8 5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                                  </svg>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
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
  const canEdit = isAdmin || (isOwner && claim.status === 'draft');
  const canDelete = isAdmin || (isOwner && claim.status === 'draft');

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
              <GradientActionBtn onClick={() => onStatus(claim.id!, 'approved')} label="Setujui" gradientFrom="#10B981" gradientTo="#34D399" icon={IconCheck} />
              <GradientActionBtn onClick={() => onStatus(claim.id!, 'rejected')} label="Tolak" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
            </>
          )}
          {isAdmin && claim.status === 'approved' && (
            <GradientActionBtn onClick={() => onStatus(claim.id!, 'submitted')} label="Buka" gradientFrom="#F59E0B" gradientTo="#FBBF24" icon={IconEdit} />
          )}
          {canDelete && (
            <GradientActionBtn onClick={() => onDelete(claim.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
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
                  <td className="py-1 text-xs text-gray-600">{fmtDate(item.tanggal)}</td>
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
