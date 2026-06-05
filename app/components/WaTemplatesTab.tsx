'use client';

/**
 * WaTemplatesTab — Manajemen Meta WhatsApp Message Templates
 * Fitur:
 *   - Lihat semua template (status, kategori, isi pesan)
 *   - Buat template baru (UTILITY/AUTHENTICATION)
 *   - Hapus template
 *   - Refresh status dari Meta
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'IN_APPEAL';
type TemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

interface TemplateComponent {
  type: string;
  text?: string;
  add_security_recommendation?: boolean;
  buttons?: { type: string; text?: string; otp_type?: string }[];
}

interface WaTemplate {
  id: string;
  name: string;
  status: TemplateStatus;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];
  rejected_reason?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<TemplateStatus, string> = {
  APPROVED:  'bg-green-100 text-green-800 border-green-200',
  PENDING:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  REJECTED:  'bg-red-100 text-red-800 border-red-200',
  PAUSED:    'bg-gray-100 text-gray-600 border-gray-200',
  DISABLED:  'bg-gray-100 text-gray-600 border-gray-200',
  IN_APPEAL: 'bg-blue-100 text-blue-800 border-blue-200',
};
const STATUS_ICON: Record<TemplateStatus, string> = {
  APPROVED:  '✅',
  PENDING:   '⏳',
  REJECTED:  '❌',
  PAUSED:    '⏸️',
  DISABLED:  '🚫',
  IN_APPEAL: '🔄',
};
const CAT_STYLE: Record<TemplateCategory, string> = {
  UTILITY:        'bg-blue-50 text-blue-700 border-blue-200',
  MARKETING:      'bg-purple-50 text-purple-700 border-purple-200',
  AUTHENTICATION: 'bg-orange-50 text-orange-700 border-orange-200',
};

function getBodyText(components: TemplateComponent[]): string {
  const body = components.find(c => c.type === 'BODY');
  if (!body) return '—';
  if (body.add_security_recommendation) return '[Kode OTP otomatis dari Meta]';
  return body.text || '—';
}

function countParams(text: string): number {
  const m = text.match(/\{\{\d+\}\}/g);
  if (!m) return 0;
  const nums = m.map(x => parseInt(x.replace(/[^0-9]/g, ''), 10));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

// ─── Create Form state type ───────────────────────────────────────────────────

interface ButtonItem {
  type: 'URL' | 'QUICK_REPLY';
  text: string;
  url: string;
}

interface FormState {
  name: string;
  category: TemplateCategory;
  body: string;
  examples: string[];
  isAuth: boolean;
  hasDocHeader: boolean;
  buttons: ButtonItem[];
}

const INIT_FORM: FormState = {
  name: '',
  category: 'UTILITY',
  body: '',
  examples: [],
  isAuth: false,
  hasDocHeader: false,
  buttons: [],
};

const REQUIRED_TEMPLATES = [
  { name: 'notif_garansi_received',  cat: 'UTILITY',        params: 0, desc: 'Konfirmasi penerimaan form garansi',                                    urlInParam: false },
  { name: 'notif_garansi_approved',  cat: 'UTILITY',        params: 5, desc: 'Garansi disetujui — nama, produk, S/N, masa garansi, jenis garansi',    urlInParam: false },
  { name: 'notif_garansi_rejected',  cat: 'UTILITY',        params: 3, desc: 'Garansi ditolak — nama, produk, alasan',                                urlInParam: false },
  { name: 'notif_claim_received',    cat: 'UTILITY',        params: 0, desc: 'Konfirmasi penerimaan form claim promo',                                 urlInParam: false },
  { name: 'notif_claim_approved',    cat: 'UTILITY',        params: 3, desc: 'Claim disetujui — nama penerima, produk, S/N',                          urlInParam: false },
  { name: 'notif_claim_rejected',    cat: 'UTILITY',        params: 3, desc: 'Claim ditolak — nama, produk, alasan',                                  urlInParam: false },
  { name: 'notif_daftar_event',      cat: 'UTILITY',        params: 2, desc: 'Registrasi event diterima — nama, judul event',                         urlInParam: false },
  { name: 'notif_event_approved',    cat: 'UTILITY',        params: 3, desc: 'Tiket event — nama, event, URL tiket (⚠️ gunakan tombol URL)',          urlInParam: true  },
  { name: 'notif_event_rejected',    cat: 'UTILITY',        params: 3, desc: 'Event ditolak — nama, event, alasan',                                   urlInParam: false },
  { name: 'notif_event_attendance',  cat: 'UTILITY',        params: 2, desc: 'Kehadiran dikonfirmasi — nama, event',                                  urlInParam: false },
  { name: 'notif_deposit_refund',    cat: 'UTILITY',        params: 3, desc: 'Deposit dikembalikan — nama, event, URL bukti (⚠️ gunakan tombol URL)', urlInParam: true  },
  { name: 'notif_kode_akun',         cat: 'AUTHENTICATION', params: 0, desc: 'Kode akses / reset password karyawan (AUTHENTICATION, OTP button)',     urlInParam: false },
] as const;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WaTemplatesTab() {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState<FormState>(INIT_FORM);
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveOk, setSaveOk]         = useState('');
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null); // template name to confirm
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRequired, setShowRequired] = useState(false);
  const prevParamCount = useRef(0);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/wa-templates', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Gagal memuat template'); return; }
      const sorted = [...(json.data || [])].sort((a: WaTemplate, b: WaTemplate) => a.name.localeCompare(b.name));
      setTemplates(sorted);
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Auto-update param examples when body changes ──────────────────────────

  useEffect(() => {
    if (form.isAuth) return;
    const n = countParams(form.body);
    if (n === prevParamCount.current) return;
    prevParamCount.current = n;
    setForm(f => {
      const ex = [...f.examples];
      while (ex.length < n) ex.push('');
      return { ...f, examples: ex.slice(0, n) };
    });
  }, [form.body, form.isAuth]);

  // ── Category toggle ────────────────────────────────────────────────────────

  const handleCategoryChange = (cat: TemplateCategory) => {
    const isAuth = cat === 'AUTHENTICATION';
    setForm(f => ({
      ...f,
      category: cat,
      isAuth,
      body: isAuth ? '' : f.body,
      examples: isAuth ? [] : f.examples,
      buttons: isAuth ? [] : f.buttons,
    }));
    prevParamCount.current = 0;
  };

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setFormError('');
    const name = form.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) { setFormError('Nama template wajib diisi.'); return; }
    if (!/^[a-z0-9_]+$/.test(name)) { setFormError('Nama hanya boleh huruf kecil, angka, dan underscore.'); return; }

    let payload: Record<string, unknown>;

    if (form.isAuth) {
      // AUTHENTICATION template: OTP button only, no body text
      payload = {
        name,
        language: 'id',
        category: 'AUTHENTICATION',
        components: [
          { type: 'BODY', add_security_recommendation: true },
          { type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE', text: 'Salin Kode' }] },
        ],
      };
    } else {
      if (!form.body.trim()) { setFormError('Isi pesan (body) wajib diisi.'); return; }
      const paramCount = countParams(form.body);
      if (paramCount > 0 && form.examples.some(e => !e.trim())) {
        setFormError(`Isi semua ${paramCount} contoh nilai untuk variabel {{1}}–{{${paramCount}}}.`);
        return;
      }
      for (let bi = 0; bi < form.buttons.length; bi++) {
        const btn = form.buttons[bi];
        if (!btn.text.trim()) { setFormError(`Teks tombol ${bi + 1} wajib diisi.`); return; }
        if (btn.type === 'URL' && !btn.url.trim()) { setFormError(`URL untuk tombol ${bi + 1} wajib diisi.`); return; }
      }
      const components: TemplateComponent[] = [];
      if (form.hasDocHeader) {
        components.push({
          type: 'HEADER',
          format: 'DOCUMENT',
          example: { header_handle: ['https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF2.pdf'] },
        } as unknown as TemplateComponent);
      }
      components.push({
        type: 'BODY',
        text: form.body.trim(),
        ...(paramCount > 0 && {
          example: { body_text: [form.examples.slice(0, paramCount).map(e => e.trim())] },
        } as unknown as TemplateComponent),
      });
      if (form.buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: form.buttons.map(b => ({
            type: b.type,
            text: b.text.trim(),
            ...(b.type === 'URL' ? { url: b.url.trim() } : {}),
          })),
        });
      }
      payload = { name, language: 'id', category: form.category, components };
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/wa-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error || 'Gagal membuat template.'); return; }
      setSaveOk(`Template "${name}" berhasil dibuat (${json.status || 'PENDING'}).`);
      setShowCreate(false);
      setForm(INIT_FORM);
      prevParamCount.current = 0;
      fetchTemplates();
    } catch {
      setFormError('Gagal terhubung ke server.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (name: string) => {
    setDeleting(name);
    setConfirmDel(null);
    try {
      const res = await fetch(`/api/admin/wa-templates?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Gagal menghapus template.'); return; }
      setSaveOk(`Template "${name}" dihapus. Meta memproses dalam ~1 menit.`);
      fetchTemplates();
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setDeleting(null);
    }
  };

  // ── Counts ─────────────────────────────────────────────────────────────────

  const counts = {
    total:    templates.length,
    approved: templates.filter(t => t.status === 'APPROVED').length,
    pending:  templates.filter(t => t.status === 'PENDING').length,
    rejected: templates.filter(t => t.status === 'REJECTED').length,
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in text-gray-900">

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border-2 border-yellow-300 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Meta WhatsApp Message Templates</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Template digunakan untuk notifikasi outbound ke konsumen di luar jendela 24 jam.
                Setiap perubahan langsung terhubung ke akun Meta Anda.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setSaveOk(''); fetchTemplates(); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
            <button
              onClick={() => { setShowCreate(true); setFormError(''); setSaveOk(''); setForm(INIT_FORM); prevParamCount.current = 0; }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFE500] hover:bg-[#E5CE00] text-black text-sm font-bold shadow-sm transition"
            >
              + Buat Template
            </button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-3 mt-4">
          {[
            { label: 'Total', value: counts.total, cls: 'bg-gray-100 text-gray-700' },
            { label: 'Aktif', value: counts.approved, cls: 'bg-green-100 text-green-700' },
            { label: 'Review', value: counts.pending,  cls: 'bg-yellow-100 text-yellow-700' },
            { label: 'Ditolak', value: counts.rejected, cls: 'bg-red-100 text-red-700' },
          ].map(s => (
            <span key={s.label} className={`px-3 py-1 rounded-full text-xs font-bold ${s.cls}`}>
              {s.label}: {s.value}
            </span>
          ))}
        </div>

        {/* Alerts */}
        {error   && <p className="mt-3 text-sm text-red-600 font-semibold">⚠️ {error}</p>}
        {saveOk  && <p className="mt-3 text-sm text-green-600 font-semibold">✅ {saveOk}</p>}
      </div>

      {/* ── Template list ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && templates.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <span className="animate-spin text-lg">🔄</span> Memuat template dari Meta...
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm">Belum ada template. Klik &ldquo;Buat Template&rdquo; untuk memulai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 w-5/12">Nama Template</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 w-1/12">Kategori</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 w-2/12">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 w-3/12">Isi Pesan</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-700 w-1/12">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {templates.map(t => {
                  const bodyText = getBodyText(t.components);
                  const isExpanded = expandedId === t.id;
                  return (
                    <React.Fragment key={t.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : t.id)}
                              className="text-gray-400 hover:text-gray-600 text-xs leading-none"
                              title={isExpanded ? 'Tutup detail' : 'Lihat detail'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <span className="font-mono font-bold text-gray-900 text-xs">{t.name}</span>
                          </div>
                          <div className="pl-6 mt-0.5">
                            <span className="text-[10px] text-gray-400">{t.language} · ID: {t.id}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${CAT_STYLE[t.category] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {t.category}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_STYLE[t.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {STATUS_ICON[t.status]} {t.status}
                          </span>
                          {t.status === 'REJECTED' && t.rejected_reason && (
                            <p className="text-[10px] text-red-500 mt-0.5 max-w-[160px] leading-snug">{t.rejected_reason}</p>
                          )}
                        </td>

                        {/* Body preview */}
                        <td className="px-4 py-3">
                          <p className="text-gray-600 text-xs line-clamp-2 leading-snug max-w-xs" title={bodyText}>
                            {bodyText}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          {confirmDel === t.name ? (
                            <span className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDelete(t.name)}
                                disabled={deleting === t.name}
                                className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                              >
                                {deleting === t.name ? '...' : 'Yakin?'}
                              </button>
                              <button onClick={() => setConfirmDel(null)} className="text-xs text-gray-400 hover:text-gray-600">Batal</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDel(t.name)}
                              disabled={!!deleting}
                              className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline disabled:opacity-40"
                            >
                              Hapus
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-8 py-4">
                            <div className="space-y-3">
                              {t.components.map((c, i) => (
                                <div key={i} className="space-y-1">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{c.type}</p>
                                  {c.text && (
                                    <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed">{c.text}</pre>
                                  )}
                                  {c.add_security_recommendation && (
                                    <p className="text-xs text-orange-600 font-semibold italic">🔒 Rekomendasi keamanan OTP otomatis ditambahkan</p>
                                  )}
                                  {c.buttons && c.buttons.map((btn, j) => (
                                    <span key={j} className="inline-block mr-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg font-semibold">
                                      🔘 {btn.text || btn.type} {btn.otp_type ? `(${btn.otp_type})` : ''}
                                    </span>
                                  ))}
                                </div>
                              ))}
                              {t.status === 'REJECTED' && t.rejected_reason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <p className="text-xs font-bold text-red-700">Alasan Penolakan:</p>
                                  <p className="text-xs text-red-600 mt-1">{t.rejected_reason}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Info box ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-gray-700 space-y-1.5">
        <p className="font-bold text-blue-800">ℹ️ Panduan Template</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li><span className="font-semibold">UTILITY</span> — notifikasi transaksional (konfirmasi, approval, reminder). Review Meta 1–24 jam.</li>
          <li><span className="font-semibold">AUTHENTICATION</span> — kode OTP / akses sementara. Approved otomatis, format baku dari Meta.</li>
          <li><span className="font-semibold">MARKETING</span> — promosi &amp; penawaran. Memerlukan persetujuan Meta, lebih ketat.</li>
          <li>Gunakan <code className="bg-white px-1 rounded border border-gray-200">{'{{1}}'}</code> <code className="bg-white px-1 rounded border border-gray-200">{'{{2}}'}</code> dst. untuk variabel dinamis.</li>
          <li>Template yang dihapus mengunci bahasa Indonesia ~1 menit. Gunakan nama berbeda jika perlu dibuat ulang segera.</li>
        </ul>
      </div>

      {/* ── Required Templates Checklist ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowRequired(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-sm font-bold text-gray-900">Template yang Dibutuhkan Sistem</span>
            <span className="text-xs text-gray-500">({REQUIRED_TEMPLATES.length} template)</span>
          </div>
          <span className="text-gray-400 text-xs">{showRequired ? '▲ Sembunyikan' : '▼ Lihat Checklist'}</span>
        </button>
        {showRequired && (
          <div className="px-5 pb-5">
            <p className="text-xs text-gray-500 mb-3">
              Template ini harus dibuat di Meta agar notifikasi sistem berjalan.
              <span className="text-green-600 font-semibold"> ✅ = sudah ada</span>, <span className="text-red-500 font-semibold">❌ = belum dibuat</span>.
            </p>
            <div className="space-y-1.5">
              {REQUIRED_TEMPLATES.map(t => {
                const exists = templates.some(mt => mt.name === t.name);
                return (
                  <div key={t.name} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${exists ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className="mt-0.5 shrink-0 text-sm">{exists ? '✅' : '❌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-gray-800">{t.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.cat === 'AUTHENTICATION' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {t.cat}
                        </span>
                        {t.params > 0 && (
                          <span className="text-[10px] text-gray-500">{t.params} param</span>
                        )}
                        {t.urlInParam && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">⚠️ URL</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Buat Template Baru</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nama Template <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  placeholder="contoh: notif_event_promo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">Huruf kecil, angka, dan underscore saja. Tidak bisa diubah setelah dibuat.</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Kategori <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UTILITY', 'AUTHENTICATION', 'MARKETING'] as TemplateCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`py-2.5 px-2 rounded-lg border-2 text-xs font-bold transition-all ${
                        form.category === cat
                          ? cat === 'UTILITY' ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : cat === 'AUTHENTICATION' ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {cat === 'UTILITY' ? '📋' : cat === 'AUTHENTICATION' ? '🔐' : '📢'} {cat}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {form.isAuth
                    ? '🔐 AUTHENTICATION: Format OTP baku dari Meta — tombol "Salin Kode" otomatis. Langsung APPROVED.'
                    : form.category === 'UTILITY'
                    ? '📋 UTILITY: Notifikasi transaksional. Review Meta 1–24 jam.'
                    : '📢 MARKETING: Promosi/penawaran. Review lebih ketat oleh Meta.'}
                </p>
              </div>

              {/* Header Document toggle */}
              {!form.isAuth && (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => setForm(f => ({ ...f, hasDocHeader: !f.hasDocHeader }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.hasDocHeader ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.hasDocHeader ? 'translate-x-5' : ''}`} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-700">Header Dokumen (PDF)</span>
                      <p className="text-[11px] text-gray-400">Aktifkan untuk mengirim file PDF sebagai lampiran di WhatsApp.</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Body text (not for AUTHENTICATION) */}
              {!form.isAuth && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Isi Pesan (Body) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={form.body}
                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder={`Halo {{1}},\n\nPesanan Anda untuk {{2}} telah dikonfirmasi.\n\nTerima kasih.`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono leading-relaxed resize-y"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Gunakan <code>{'{{1}}'}</code> <code>{'{{2}}'}</code> dst. untuk variabel. Variabel harus berurutan mulai dari 1.
                  </p>
                </div>
              )}

              {/* Auth info box */}
              {form.isAuth && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-orange-800">🔐 Template AUTHENTICATION — Format Otomatis</p>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    Meta menggunakan format baku: <em>&ldquo;[kode] adalah kode akses sementara Anda. Demi keamanan Anda, jangan bagikan kode ini.&rdquo;</em>
                  </p>
                  <p className="text-xs text-orange-700">
                    Tombol <strong>Salin Kode</strong> akan otomatis ditambahkan. Template ini langsung APPROVED tanpa review.
                  </p>
                  <p className="text-xs text-orange-700">
                    Untuk mengirim, gunakan fungsi <code className="bg-white px-1 rounded border border-orange-200">sendWAOtpTemplate()</code> dari <code>notify.ts</code>.
                  </p>
                </div>
              )}

              {/* Example values */}
              {!form.isAuth && form.examples.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Contoh Nilai untuk Variabel{' '}
                    <span className="text-gray-400 font-normal">(wajib untuk persetujuan Meta)</span>
                  </label>
                  <div className="space-y-2">
                    {form.examples.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 w-8 flex-shrink-0">{`{{${i + 1}}}`}</span>
                        <input
                          type="text"
                          value={ex}
                          onChange={e => setForm(f => {
                            const ex2 = [...f.examples];
                            ex2[i] = e.target.value;
                            return { ...f, examples: ex2 };
                          })}
                          placeholder={`Contoh nilai untuk {{${i + 1}}}`}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              {!form.isAuth && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Tombol CTA <span className="text-gray-400 font-normal">(opsional, maks. 3)</span>
                    </label>
                    {form.buttons.length < 3 && (
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, buttons: [...f.buttons, { type: 'URL', text: '', url: '' }] }))}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">
                        + Tambah Tombol
                      </button>
                    )}
                  </div>
                  {form.buttons.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Belum ada tombol. Tambahkan untuk template yang menyertakan link.</p>
                  )}
                  <div className="space-y-2">
                    {form.buttons.map((btn, bi) => (
                      <div key={bi} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <select
                            value={btn.type}
                            onChange={e => setForm(f => {
                              const b = [...f.buttons];
                              b[bi] = { ...b[bi], type: e.target.value as 'URL' | 'QUICK_REPLY', url: '' };
                              return { ...f, buttons: b };
                            })}
                            className="text-xs font-bold border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400">
                            <option value="URL">🔗 URL</option>
                            <option value="QUICK_REPLY">↩ Quick Reply</option>
                          </select>
                          <button type="button"
                            onClick={() => setForm(f => ({ ...f, buttons: f.buttons.filter((_, j) => j !== bi) }))}
                            className="text-xs text-gray-400 hover:text-red-500 transition ml-auto">
                            Hapus
                          </button>
                        </div>
                        <input type="text" value={btn.text} maxLength={25}
                          onChange={e => setForm(f => { const b = [...f.buttons]; b[bi] = { ...b[bi], text: e.target.value }; return { ...f, buttons: b }; })}
                          placeholder="Teks tombol (maks. 25 karakter)"
                          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                        {btn.type === 'URL' && (
                          <input type="url" value={btn.url}
                            onChange={e => setForm(f => { const b = [...f.buttons]; b[bi] = { ...b[bi], url: e.target.value }; return { ...f, buttons: b }; })}
                            placeholder="https://example.com/halaman"
                            className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                        )}
                      </div>
                    ))}
                  </div>
                  {form.buttons.some(b => b.type === 'URL') && (
                    <p className="text-[11px] text-amber-600 mt-1.5">⚠️ URL harus dapat diakses secara publik agar Meta dapat memverifikasinya saat review template.</p>
                  )}
                </div>
              )}

              {/* Preview */}
              {!form.isAuth && form.body.trim() && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1.5">Preview Pesan</p>
                  <div className="bg-[#f0fdf4] border border-green-200 rounded-xl p-3">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {form.body.replace(/\{\{(\d+)\}\}/g, (_, n) => {
                        const val = form.examples[parseInt(n, 10) - 1];
                        return val ? `[${val}]` : `{{${n}}}`;
                      })}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-semibold">
                  ⚠️ {formError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#FFE500] hover:bg-[#E5CE00] text-black text-sm font-bold shadow-sm disabled:opacity-60 transition"
              >
                {saving ? 'Mengirim ke Meta...' : 'Buat Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
