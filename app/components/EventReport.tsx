'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventItem { id: string; title: string; date: string; stock: number; }
interface KpiRow    { evaluation: string; target: string; result: string; }
interface LinkItem  { label: string; url: string; }

interface ReportData {
  period: string; venuePlatform: string; product: string;
  overview: string; backgroundObjective: string;
  organizer: string; budget: string; budgetNote: string;
  numberOfStaff: string; numberOfParticipants: string;
  fanLevels: string[]; contentTypes: string[]; ageGroups: string[]; funnels: string[];
  kpiRows: KpiRow[];
  selfEvaluation: string;
  photos: string[];   // max 9
  links: LinkItem[];
}

const FAN_LEVELS    = ['Non-Nikon', 'Potential fan', 'Light fan', 'Core fan'];
const CONTENT_TYPES = ['Photographer', 'Videographer', 'Hybrid user'];
const AGE_GROUPS    = ['< 19', '20-29', '30-39', '40-49', '50 over'];
const FUNNELS       = ['Awareness', 'Join', 'Evaluation', 'Purchase', 'Share'];

const emptyReport = (event: EventItem): ReportData => ({
  period: event.date, venuePlatform: '', product: '',
  overview: '', backgroundObjective: '',
  organizer: '', budget: '', budgetNote: '',
  numberOfStaff: '', numberOfParticipants: String(event.stock),
  fanLevels: [], contentTypes: [], ageGroups: [], funnels: [],
  kpiRows: [{ evaluation: '', target: '', result: '' }],
  selfEvaluation: '',
  photos: Array(9).fill(''),
  links: [{ label: '', url: '' }],
});

// ─── Print HTML builder ───────────────────────────────────────────────────────

function buildPrintHTML(
  selectedEvents: EventItem[],
  reports: Record<string, ReportData>
): string {
  const L = (t: string, colspan = 1, rowspan = 1) =>
    `<td colspan="${colspan}" rowspan="${rowspan}" style="background:#F9C6A0;font-weight:bold;font-size:9pt;padding:5px 7px;border:1px solid #000;vertical-align:top;white-space:nowrap">${t}</td>`;
  const V = (t: string, colspan = 1, rowspan = 1) =>
    `<td colspan="${colspan}" rowspan="${rowspan}" style="background:#fff;font-size:9pt;padding:5px 7px;border:1px solid #000;vertical-align:top">${t}</td>`;
  const SH = (t: string, colspan = 1) =>
    `<td colspan="${colspan}" style="background:#F9C6A0;font-weight:bold;font-size:9pt;padding:4px 7px;border:1px solid #000;text-align:center">${t}</td>`;

  const pages = selectedEvents.map((ev, idx) => {
    const r = reports[ev.id] ?? emptyReport(ev);
    const pageNum = idx + 1;
    const validPhotos = r.photos.filter(p => p.trim() !== '');
    const has9 = validPhotos.length >= 9;

    // Checkbox list HTML
    const checks = (items: string[], selected: string[], style = '') =>
      items.map(item => {
        const checked = selected.includes(item);
        return `<div style="display:flex;align-items:center;gap:4px;font-size:8.5pt;margin-bottom:2px;${style}">
          <span style="font-weight:bold;color:${checked ? '#000' : 'transparent'}">✔</span>
          <span style="color:${checked ? '#E6693A' : '#555'}">${item}</span>
        </div>`;
      }).join('');

    // Photo grid
    const photoCell = (src: string) => src
      ? `<td style="padding:2px;border:none"><img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block"/></td>`
      : `<td style="padding:2px;border:none;background:#f0f0f0"></td>`;

    // Documentation cell (bottom-right when < 9 photos)
    const docCell = `<td style="padding:8px 12px;border:none;vertical-align:top">
      <p style="font-weight:bold;font-size:11pt;margin:0 0 8px">Event Documentation</p>
      ${r.links.filter(l => l.url).map(l =>
        `<a href="${l.url}" style="color:#0563C1;font-size:9pt;word-break:break-all;display:block;margin-bottom:4px">${l.label || l.url}</a>`
      ).join('')}
    </td>`;

    const photoRows = has9
      ? `<tr>
          ${[0,1,2].map(i => photoCell(r.photos[i] ?? '')).join('')}
        </tr>
        <tr>
          ${[3,4,5].map(i => photoCell(r.photos[i] ?? '')).join('')}
        </tr>
        <tr>
          ${[6,7,8].map(i => photoCell(r.photos[i] ?? '')).join('')}
        </tr>`
      : `<tr>
          ${[0,1,2].map(i => photoCell(r.photos[i] ?? '')).join('')}
        </tr>
        <tr>
          ${[3,4,5].map(i => photoCell(r.photos[i] ?? '')).join('')}
        </tr>
        <tr>
          ${[6,7].map(i => photoCell(r.photos[i] ?? '')).join('')}
          ${docCell}
        </tr>`;

    const docBelow = has9 && r.links.filter(l => l.url).length > 0
      ? `<div style="margin-top:12px">
          <p style="font-weight:bold;font-size:11pt;margin:0 0 8px">Event Documentation</p>
          ${r.links.filter(l => l.url).map(l =>
            `<a href="${l.url}" style="color:#0563C1;font-size:9pt;word-break:break-all;display:block;margin-bottom:4px">${l.label || l.url}</a>`
          ).join('')}
        </div>`
      : '';

    const footer = (n: number) =>
      `<div style="text-align:right;font-size:8pt;color:#aaa;margin-top:8px">Confidential &nbsp; ${n}</div>`;

    return `
      <!-- EVENT ${pageNum}: PAGE 1 (TABLE) -->
      <div style="width:100%;page-break-after:always;font-family:Arial,sans-serif;padding:0 0 8px">
        <div style="background:#FFE500;padding:8px 12px;font-size:14pt;font-weight:bold;margin-bottom:4px">
          Indonesia: <span style="font-weight:normal">(${ev.title})</span>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            ${L('Period')}${V(r.period || ev.date)}
            ${L('Venue/Platform')}${V(r.venuePlatform, 1)}
            ${L('Product')}${V(r.product)}
          </tr>
          <tr>${L('Overview')}${V(r.overview, 5)}</tr>
          <tr>${L('Background / Objective')}${V(r.backgroundObjective, 5)}</tr>
          <tr>
            ${L('Organizer / Collaborator')}${V(r.organizer)}
            ${L('Budget')}${V(r.budget)}
            <td style="background:#F9C6A0;font-size:7pt;padding:4px 6px;border:1px solid #000;vertical-align:top">
              Is it expensive or cheap compared to other activities?
            </td>
            ${V(r.budgetNote)}
          </tr>
          <tr>
            ${L('Number of staff')}${V(r.numberOfStaff)}
            ${L('Number of participants')}${V(r.numberOfParticipants, 3)}
          </tr>
          <tr>
            ${L('Target', 1, 2)}
            ${SH('Fan level')}${SH('Content Type')}${SH('Age')}${SH('Funnel', 2)}
          </tr>
          <tr>
            ${V(checks(FAN_LEVELS, r.fanLevels))}
            ${V(checks(CONTENT_TYPES, r.contentTypes))}
            ${V(checks(AGE_GROUPS, r.ageGroups))}
            ${V(checks(FUNNELS, r.funnels), 2)}
          </tr>
          <tr>
            ${L('KPI')}
            ${SH('Evaluation items')}${SH('Specific numerical targets', 2)}${SH('Result', 2)}
          </tr>
          ${r.kpiRows.map(row => `<tr>
            <td style="background:#fff;border:1px solid #000"></td>
            ${V(row.evaluation)}${V(row.target, 2)}${V(row.result, 2)}
          </tr>`).join('')}
          <tr>${L('Self-evaluation / Future Action')}${V(r.selfEvaluation, 5)}</tr>
        </table>
        ${footer(pageNum * 2 - 1)}
      </div>

      <!-- EVENT ${pageNum}: PAGE 2 (DOCUMENTATION) -->
      <div style="width:100%;page-break-after:always;font-family:Arial,sans-serif">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          ${photoRows}
        </table>
        ${docBelow}
        ${footer(pageNum * 2)}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html><html><head><title>Nikon Event Report</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { margin:0; padding:0; font-family: Arial, sans-serif; }
    img { max-width:100%; display:block; }
    a { color:#0563C1; }
    td { word-break: break-word; }
  </style>
  </head><body>${pages}</body></html>`;
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

const inp = "w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white";
const ta  = `${inp} resize-none`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function CheckGroup({ title, options, selected, onChange }: {
  title: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
              selected.includes(opt)
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {selected.includes(opt) ? '✔ ' : ''}{opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventReport() {
  const [events,      setEvents]      = useState<EventItem[]>([]);
  const [reports,     setReports]     = useState<Record<string, ReportData>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [dirty,       setDirty]       = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [search,      setSearch]      = useState('');
  const [section,     setSection]     = useState<'basic' | 'target' | 'kpi' | 'docs'>('basic');
  const printRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  // Load events + existing reports
  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: evData }, rpRes] = await Promise.all([
          supabase.from('events').select('id, title, date, stock').order('created_at', { ascending: false }),
          fetch('/api/event-reports'),
        ]);
        if (evData) setEvents(evData as EventItem[]);
        if (rpRes.ok) {
          const d = await rpRes.json();
          setReports(d.reports ?? {});
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const getReport = useCallback((ev: EventItem): ReportData =>
    reports[ev.id] ?? emptyReport(ev),
  [reports]);

  const patchReport = (id: string, patch: Partial<ReportData>) => {
    setReports(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? emptyReport(events.find(e => e.id === id)!)), ...patch },
    }));
    setDirty(prev => new Set([...prev, id]));
  };

  const saveReport = async (id: string) => {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    setSaving(true);
    try {
      const res = await fetch('/api/event-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, report: getReport(ev) }),
      });
      if (!res.ok) throw new Error('Gagal');
      setDirty(prev => { const s = new Set(prev); s.delete(id); return s; });
      showToast('Tersimpan ✓');
    } catch { showToast('Gagal menyimpan!', false); }
    finally { setSaving(false); }
  };

  const deleteReport = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/event-reports?eventId=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal');
      setReports(prev => { const n = { ...prev }; delete n[id]; return n; });
      setDirty(prev => { const s = new Set(prev); s.delete(id); return s; });
      setConfirmDel(false);
      showToast('Report dihapus');
    } catch { showToast('Gagal menghapus!', false); }
    finally { setDeleting(false); }
  };

  const discardChanges = async (id: string) => {
    try {
      const res = await fetch(`/api/event-reports?eventId=${id}`);
      const d = await res.json();
      setReports(prev => ({ ...prev, [id]: d.report }));
      setDirty(prev => { const s = new Set(prev); s.delete(id); return s; });
      showToast('Perubahan dibatalkan');
    } catch { showToast('Gagal mengambil data tersimpan', false); }
  };

  const exportPDF = () => {
    const selected = events.filter(e => selectedIds.has(e.id));
    if (!selected.length) { showToast('Pilih minimal 1 event dulu', false); return; }
    const html = buildPrintHTML(selected, reports);
    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) { showToast('Popup diblokir browser. Izinkan popup lalu coba lagi.', false); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 700);
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── Report form (editing panel) ───────────────────────────────────────────

  const renderForm = () => {
    if (!editingId) return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold">Pilih event untuk mengisi laporan</p>
          <p className="text-xs mt-1 text-gray-300">Klik nama event di panel kiri</p>
        </div>
      </div>
    );

    const ev = events.find(e => e.id === editingId);
    if (!ev) return null;
    const r = getReport(ev);
    const p = <T,>(key: keyof ReportData, val: T) => patchReport(editingId, { [key]: val } as Partial<ReportData>);
    const isDirty = dirty.has(editingId);
    const isSaved = !!reports[editingId] && !isDirty;

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Form header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-gray-800">{ev.title}</h2>
                {isSaved
                  ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ Tersimpan</span>
                  : reports[editingId]
                    ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">● Ada perubahan</span>
                    : <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">+ Baru</span>
                }
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{ev.date}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Discard — hanya jika ada perubahan dan ada data tersimpan */}
              {isDirty && reports[editingId] && (
                <button onClick={() => discardChanges(editingId)}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg transition">
                  ↺ Discard
                </button>
              )}
              {/* Save */}
              <button onClick={() => saveReport(editingId)} disabled={saving || !isDirty}
                className="bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">
                {saving ? '⏳...' : '💾 Simpan'}
              </button>
              {/* Delete — hanya jika report sudah tersimpan di DB */}
              {reports[editingId] && !confirmDel && (
                <button onClick={() => setConfirmDel(true)}
                  className="text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 text-xs font-bold px-2.5 py-1.5 rounded-lg transition">
                  🗑
                </button>
              )}
            </div>
          </div>
          {/* Confirm delete */}
          {confirmDel && (
            <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span className="text-xs text-red-700 font-semibold flex-1">Hapus report ini secara permanen?</span>
              <button onClick={() => deleteReport(editingId)} disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition">
                {deleting ? '⏳...' : 'Ya, Hapus'}
              </button>
              <button onClick={() => setConfirmDel(false)}
                className="text-gray-500 hover:text-gray-700 text-xs border border-gray-200 px-3 py-1 rounded-lg transition">
                Batal
              </button>
            </div>
          )}
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-gray-200 bg-white shrink-0 px-4">
          {(['basic', 'target', 'kpi', 'docs'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${section === s ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {s === 'basic' ? 'Informasi' : s === 'target' ? 'Target' : s === 'kpi' ? 'KPI' : 'Dokumentasi'}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">

          {section === 'basic' && <>
            <div className="grid grid-cols-3 gap-3">
              <Row label="Period / Tanggal">
                <input className={inp} value={r.period} onChange={e => p('period', e.target.value)} placeholder={ev.date} />
              </Row>
              <Row label="Venue / Platform">
                <input className={inp} value={r.venuePlatform} onChange={e => p('venuePlatform', e.target.value)} />
              </Row>
              <Row label="Produk">
                <input className={inp} value={r.product} onChange={e => p('product', e.target.value)} />
              </Row>
            </div>
            <Row label="Overview">
              <textarea className={ta} rows={3} value={r.overview} onChange={e => p('overview', e.target.value)} />
            </Row>
            <Row label="Background / Objective">
              <textarea className={ta} rows={4} value={r.backgroundObjective} onChange={e => p('backgroundObjective', e.target.value)} />
            </Row>
            <div className="grid grid-cols-2 gap-3">
              <Row label="Organizer / Collaborator">
                <input className={inp} value={r.organizer} onChange={e => p('organizer', e.target.value)} />
              </Row>
              <Row label="Budget">
                <input className={inp} value={r.budget} onChange={e => p('budget', e.target.value)} placeholder="Rp 0" />
              </Row>
            </div>
            <Row label="Catatan Budget (mahal/murah dibanding aktivitas lain?)">
              <input className={inp} value={r.budgetNote} onChange={e => p('budgetNote', e.target.value)} />
            </Row>
            <div className="grid grid-cols-2 gap-3">
              <Row label="Jumlah Staff">
                <input className={inp} value={r.numberOfStaff} onChange={e => p('numberOfStaff', e.target.value)} type="number" min={0} />
              </Row>
              <Row label="Jumlah Peserta">
                <input className={inp} value={r.numberOfParticipants} onChange={e => p('numberOfParticipants', e.target.value)} />
              </Row>
            </div>
            <Row label="Self-evaluation / Future Action">
              <textarea className={ta} rows={4} value={r.selfEvaluation} onChange={e => p('selfEvaluation', e.target.value)} />
            </Row>
          </>}

          {section === 'target' && (
            <div className="space-y-4">
              <CheckGroup title="Fan Level" options={FAN_LEVELS} selected={r.fanLevels} onChange={v => p('fanLevels', v)} />
              <CheckGroup title="Content Type" options={CONTENT_TYPES} selected={r.contentTypes} onChange={v => p('contentTypes', v)} />
              <CheckGroup title="Age Group" options={AGE_GROUPS} selected={r.ageGroups} onChange={v => p('ageGroups', v)} />
              <CheckGroup title="Funnel" options={FUNNELS} selected={r.funnels} onChange={v => p('funnels', v)} />
            </div>
          )}

          {section === 'kpi' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-200">
                <span>Evaluation Item</span><span>Target</span><span>Result</span>
              </div>
              {r.kpiRows.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 items-center">
                  <input className={inp} placeholder="e.g. Attendance" value={row.evaluation}
                    onChange={e => p('kpiRows', r.kpiRows.map((x, j) => j === i ? { ...x, evaluation: e.target.value } : x))} />
                  <input className={inp} placeholder="100" value={row.target}
                    onChange={e => p('kpiRows', r.kpiRows.map((x, j) => j === i ? { ...x, target: e.target.value } : x))} />
                  <div className="flex gap-1">
                    <input className={`${inp} flex-1`} placeholder="80" value={row.result}
                      onChange={e => p('kpiRows', r.kpiRows.map((x, j) => j === i ? { ...x, result: e.target.value } : x))} />
                    {r.kpiRows.length > 1 && (
                      <button onClick={() => p('kpiRows', r.kpiRows.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={() => p('kpiRows', [...r.kpiRows, { evaluation: '', target: '', result: '' }])}
                className="text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded px-3 py-1.5 w-full hover:border-gray-400 transition">
                + Tambah Baris KPI
              </button>
            </div>
          )}

          {section === 'docs' && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Foto Dokumentasi (maks. 9)</p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="space-y-1">
                      <div className={`aspect-video rounded border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center relative ${r.photos[i] ? '' : 'border-dashed'}`}>
                        {r.photos[i]
                          ? <img src={r.photos[i]} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : <span className="text-2xl text-gray-300">🖼</span>
                        }
                        {r.photos[i] && (
                          <button onClick={() => p('photos', r.photos.map((x, j) => j === i ? '' : x))}
                            className="absolute top-1 right-1 bg-black/60 text-white text-[10px] rounded px-1 hover:bg-black">✕</button>
                        )}
                      </div>
                      <input className={inp} placeholder={`URL foto ${i + 1}`} value={r.photos[i] ?? ''}
                        onChange={e => p('photos', r.photos.map((x, j) => j === i ? e.target.value : x))} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Lampiran / Link Dokumentasi</p>
                <div className="space-y-2">
                  {r.links.map((link, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className={`${inp} w-32 shrink-0`} placeholder="Label (opsional)" value={link.label}
                        onChange={e => p('links', r.links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                      <input className={`${inp} flex-1`} placeholder="https://..." value={link.url}
                        onChange={e => p('links', r.links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                      {link.url && <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline shrink-0">↗</a>}
                      {r.links.length > 1 && (
                        <button onClick={() => p('links', r.links.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 text-xs shrink-0">✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => p('links', [...r.links, { label: '', url: '' }])}
                    className="text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded px-3 py-1.5 w-full hover:border-gray-400 transition">
                    + Tambah Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700" />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-120px)] text-gray-900 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-xs font-bold ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Left: event list ── */}
      <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">Daftar Event</p>
            <span className="text-[10px] text-gray-400">{selectedIds.size} dipilih untuk PDF</span>
          </div>
          <input
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
            placeholder="Cari event..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <p className="text-xs text-gray-400 p-4 text-center">Tidak ada event</p>
          ) : filteredEvents.map(ev => {
            const hasReport = !!reports[ev.id];
            const isDirtyEv = dirty.has(ev.id);
            return (
              <div
                key={ev.id}
                onClick={() => setEditingId(ev.id)}
                className={`flex items-start gap-2 px-3 py-2.5 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition ${editingId === ev.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(ev.id)}
                  onChange={e => { e.stopPropagation(); toggleSelect(ev.id); }}
                  className="mt-0.5 shrink-0 accent-orange-500"
                  onClick={e => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{ev.title}</p>
                  <p className="text-[10px] text-gray-400">{ev.date}</p>
                  <div className="flex gap-1 mt-0.5">
                    {hasReport && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">✓ Data</span>}
                    {isDirtyEv && <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">● Unsaved</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Export button */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          <button
            onClick={() => {
              const all = filteredEvents.map(e => e.id);
              const allSelected = all.every(id => selectedIds.has(id));
              setSelectedIds(allSelected ? new Set() : new Set(all));
            }}
            className="w-full text-xs text-gray-500 hover:text-gray-700 py-1.5 border border-dashed border-gray-300 rounded hover:border-gray-400 transition"
          >
            {filteredEvents.every(e => selectedIds.has(e.id)) ? '☐ Batal pilih semua' : '☑ Pilih semua'}
          </button>
          <button
            onClick={exportPDF}
            disabled={selectedIds.size === 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            📄 Export PDF ({selectedIds.size} event)
          </button>
        </div>
      </div>

      {/* ── Right: form editor ── */}
      {renderForm()}
    </div>
  );
}
