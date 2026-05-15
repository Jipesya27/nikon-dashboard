'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
   DEFAULT_TEMPLATES,
   DB_KEY_PREFIX,
   TEMPLATE_CATEGORIES,
   applyTemplate,
} from '../lib/chatbotTemplate';

const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Sample preview values for each variable
const PREVIEW_SAMPLES: Record<string, string> = {
   nama: 'Budi Santoso',
   pass: 'abc123xyz',
   user: 'budi.santoso',
   idx: '1',
   barang: 'Nikon Z50 Kit',
   sn: 'SN123456789',
   catatan: 'Handle dengan hati-hati',
   nomor_seri: 'SN123456789',
   tipe_barang: 'Nikon Z50',
   status_mkt: 'Disetujui',
   status_fa: 'Disetujui',
   jasa_kirim: 'JNE',
   nomor_resi: 'JNE1234567890',
   catatan_mkt: 'Hadiah dikirim hari ini',
   seri: 'SN123456789',
   barang2: 'Nikon Z50',
   jenis: 'Spare Part 50%',
   lama: '2 Tahun',
   sisa: '1 Tahun 6 Bulan',
   eventTitle: 'Nikon Photography Workshop',
   ticketLink: 'https://example.com/ticket/123',
   reason: 'Bukti transfer tidak valid',
   refundLink: 'https://example.com/refund/123',
   eventName: 'Nikon Photography Workshop',
};

function getSampleVars(vars: string[]): Record<string, string> {
   const result: Record<string, string> = {};
   for (const v of vars) {
      result[v] = PREVIEW_SAMPLES[v] ?? `{${v}}`;
   }
   return result;
}

export default function ChatbotPage() {
   const [dbTemplates, setDbTemplates] = useState<Record<string, string>>({});
   const [editKey, setEditKey] = useState<string | null>(null);
   const [editText, setEditText] = useState('');
   const [saving, setSaving] = useState(false);
   const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
   const [loading, setLoading] = useState(true);
   const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
   const [previewKey, setPreviewKey] = useState<string | null>(null);
   const [activeCategory, setActiveCategory] = useState<string>('Semua');

   const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
   }, []);

   const loadFromDB = useCallback(async () => {
      setLoading(true);
      const { data } = await supabase
         .from('pengaturan_bot')
         .select('nama_pengaturan, description')
         .like('nama_pengaturan', `${DB_KEY_PREFIX}%`);

      const result: Record<string, string> = {};
      const keys = new Set<string>();
      for (const row of (data || []) as { nama_pengaturan: string; description: string | null }[]) {
         const key = row.nama_pengaturan.replace(DB_KEY_PREFIX, '');
         if (row.description) {
            result[key] = row.description;
            keys.add(key);
         }
      }
      setDbTemplates(result);
      setSavedKeys(keys);
      setLoading(false);
   }, []);

   useEffect(() => { loadFromDB(); }, [loadFromDB]);

   const openEdit = (key: string) => {
      setEditKey(key);
      setEditText(dbTemplates[key] ?? DEFAULT_TEMPLATES[key]?.template ?? '');
      setPreviewKey(null);
   };

   const cancelEdit = () => { setEditKey(null); setEditText(''); };

   const saveTemplate = async () => {
      if (!editKey) return;
      setSaving(true);
      const dbKey = `${DB_KEY_PREFIX}${editKey}`;
      const { error } = await supabase
         .from('pengaturan_bot')
         .upsert(
            { nama_pengaturan: dbKey, description: editText, url_file: null },
            { onConflict: 'nama_pengaturan' },
         );
      if (error) {
         showToast('Gagal menyimpan: ' + error.message, 'error');
      } else {
         setDbTemplates(prev => ({ ...prev, [editKey]: editText }));
         setSavedKeys(prev => new Set([...prev, editKey]));
         showToast('Template berhasil disimpan ✓');
         setEditKey(null);
         setEditText('');
      }
      setSaving(false);
   };

   const resetToDefault = async (key: string) => {
      if (!confirm(`Reset template "${DEFAULT_TEMPLATES[key]?.label}" ke default? Perubahan custom akan hilang.`)) return;
      const dbKey = `${DB_KEY_PREFIX}${key}`;
      await supabase.from('pengaturan_bot').delete().eq('nama_pengaturan', dbKey);
      setDbTemplates(prev => { const n = { ...prev }; delete n[key]; return n; });
      setSavedKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
      showToast('Template direset ke default');
   };

   const allKeys = Object.keys(DEFAULT_TEMPLATES);
   const filteredKeys = activeCategory === 'Semua'
      ? allKeys
      : allKeys.filter(k => DEFAULT_TEMPLATES[k].category === activeCategory);

   const currentTemplate = editKey
      ? (dbTemplates[editKey] ?? DEFAULT_TEMPLATES[editKey]?.template ?? '')
      : '';
   const previewText = editKey
      ? applyTemplate(editText, getSampleVars(DEFAULT_TEMPLATES[editKey]?.vars ?? []))
      : previewKey
         ? applyTemplate(dbTemplates[previewKey] ?? DEFAULT_TEMPLATES[previewKey]?.template ?? '', getSampleVars(DEFAULT_TEMPLATES[previewKey]?.vars ?? []))
         : '';

   return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
         {/* Header */}
         <header className="bg-gray-900 border-b-4 border-[#FFE500] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
            <div className="flex items-center gap-4">
               <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium transition flex items-center gap-1">
                  ← Dashboard
               </Link>
               <div className="w-px h-5 bg-gray-600" />
               <div>
                  <h1 className="text-white font-bold text-lg flex items-center gap-2">🤖 Editor Teks Chatbot</h1>
                  <p className="text-gray-400 text-xs">Kelola teks pesan WhatsApp yang dikirim ke konsumen</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               {loading && <span className="text-gray-400 text-xs animate-pulse">Memuat...</span>}
               <span className="text-xs text-gray-500">{savedKeys.size} template dikustomisasi</span>
            </div>
         </header>

         {/* Toast */}
         {toast && (
            <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-bold transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
               {toast.msg}
            </div>
         )}

         <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Syntax guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
               <h3 className="font-bold text-blue-900 mb-2 text-sm">📖 Panduan Sintaks Template</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-800">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                     <code className="font-bold text-blue-700">{'{nama}'}</code>
                     <p className="mt-1">Placeholder — diganti nilai variabel saat pesan dikirim.</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                     <code className="font-bold text-blue-700">{'{?catatan}...{/?catatan}'}</code>
                     <p className="mt-1">Kondisional — konten hanya muncul jika variabel tidak kosong.</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                     <code className="font-bold text-blue-700">*teks*</code> <span className="mx-1">dan</span> <code className="font-bold text-blue-700">`kode`</code>
                     <p className="mt-1">Format WhatsApp — bold dan monospace.</p>
                  </div>
               </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-5">
               {['Semua', ...TEMPLATE_CATEGORIES].map(cat => (
                  <button
                     key={cat}
                     onClick={() => setActiveCategory(cat)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeCategory === cat ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                  >
                     {cat}
                  </button>
               ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               {/* Template list */}
               <div className="space-y-3">
                  {filteredKeys.map(key => {
                     const info = DEFAULT_TEMPLATES[key];
                     const isCustomized = savedKeys.has(key);
                     const isEditing = editKey === key;
                     return (
                        <div key={key} className={`bg-white rounded-xl border-2 shadow-sm transition-all ${isEditing ? 'border-[#FFE500] shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
                           <div className="p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                 <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                       <h3 className="font-bold text-sm text-slate-800">{info.label}</h3>
                                       {isCustomized && (
                                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">✏️ Custom</span>
                                       )}
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400">{key}</span>
                                 </div>
                                 <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">{info.category}</span>
                              </div>

                              {/* Variables */}
                              {info.vars.length > 0 && (
                                 <div className="flex flex-wrap gap-1 mb-3">
                                    {info.vars.map(v => (
                                       <code key={v} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono">{`{${v}}`}</code>
                                    ))}
                                 </div>
                              )}

                              {/* Current template preview (collapsed) */}
                              {!isEditing && (
                                 <pre className="text-[10px] text-gray-500 bg-gray-50 rounded-lg p-2 max-h-16 overflow-hidden whitespace-pre-wrap font-sans leading-relaxed border border-gray-100">
                                    {(dbTemplates[key] ?? info.template).substring(0, 120)}{(dbTemplates[key] ?? info.template).length > 120 ? '…' : ''}
                                 </pre>
                              )}

                              {/* Action buttons */}
                              <div className="flex gap-2 mt-3">
                                 <button
                                    onClick={() => openEdit(key)}
                                    className="bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                 >
                                    ✏️ Edit
                                 </button>
                                 <button
                                    onClick={() => setPreviewKey(previewKey === key ? null : key)}
                                    className="border border-gray-300 hover:bg-gray-100 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                 >
                                    {previewKey === key ? '▲ Tutup' : '👁 Preview'}
                                 </button>
                                 {isCustomized && (
                                    <button
                                       onClick={() => resetToDefault(key)}
                                       className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 transition ml-auto"
                                       title="Reset ke default"
                                    >
                                       ↩ Reset
                                    </button>
                                 )}
                              </div>

                              {/* Preview panel */}
                              {previewKey === key && !isEditing && (
                                 <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-green-700 mb-1 uppercase tracking-wider">Preview (dengan data contoh)</p>
                                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{previewText}</pre>
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>

               {/* Edit panel — sticky */}
               <div className="lg:sticky lg:top-24 lg:self-start">
                  {editKey ? (
                     <div className="bg-white rounded-xl border-2 border-[#FFE500] shadow-lg">
                        <div className="bg-gray-900 rounded-t-xl px-5 py-3 flex items-center justify-between">
                           <div>
                              <h3 className="text-white font-bold text-sm">{DEFAULT_TEMPLATES[editKey]?.label}</h3>
                              <p className="text-gray-400 text-[10px] font-mono">{editKey}</p>
                           </div>
                           <button onClick={cancelEdit} className="text-gray-400 hover:text-white text-lg leading-none transition">✕</button>
                        </div>

                        <div className="p-5 space-y-4">
                           {/* Variables reference */}
                           {DEFAULT_TEMPLATES[editKey]?.vars.length > 0 && (
                              <div>
                                 <p className="text-xs font-bold text-gray-600 mb-1.5">Variabel tersedia:</p>
                                 <div className="flex flex-wrap gap-1">
                                    {DEFAULT_TEMPLATES[editKey].vars.map(v => (
                                       <button
                                          key={v}
                                          onClick={() => setEditText(prev => prev + `{${v}}`)}
                                          title={`Klik untuk sisipkan {${v}}`}
                                          className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono cursor-pointer transition"
                                       >
                                          {`{${v}}`}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {/* Textarea */}
                           <div>
                              <div className="flex items-center justify-between mb-1.5">
                                 <label className="text-xs font-bold text-gray-700">Teks Template</label>
                                 <button
                                    onClick={() => setEditText(DEFAULT_TEMPLATES[editKey]?.template ?? '')}
                                    className="text-[10px] text-gray-400 hover:text-gray-600 transition"
                                 >
                                    ↩ Isi ulang default
                                 </button>
                              </div>
                              <textarea
                                 value={editText}
                                 onChange={e => setEditText(e.target.value)}
                                 rows={10}
                                 className="w-full border border-gray-300 rounded-lg p-3 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#FFE500] focus:border-transparent"
                                 placeholder="Tulis template di sini..."
                                 spellCheck={false}
                              />
                              <p className="text-[10px] text-gray-400 mt-1">{editText.length} karakter · gunakan \n untuk baris baru</p>
                           </div>

                           {/* Live preview */}
                           <div>
                              <p className="text-xs font-bold text-gray-700 mb-1.5">Preview langsung (data contoh)</p>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-20">
                                 <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                                    {applyTemplate(editText, getSampleVars(DEFAULT_TEMPLATES[editKey]?.vars ?? []))}
                                 </pre>
                              </div>
                           </div>

                           {/* Diff view jika ada custom */}
                           {savedKeys.has(editKey) && dbTemplates[editKey] !== editText && (
                              <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                 ⚠️ Ada perubahan yang belum disimpan
                              </div>
                           )}
                           {!savedKeys.has(editKey) && editText !== currentTemplate && (
                              <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2">
                                 ℹ️ Sedang mengedit template default
                              </div>
                           )}

                           {/* Save / Cancel */}
                           <div className="flex gap-2 pt-1">
                              <button
                                 onClick={saveTemplate}
                                 disabled={saving}
                                 className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold text-sm py-2.5 rounded-lg transition"
                              >
                                 {saving ? '⏳ Menyimpan...' : '💾 Simpan Template'}
                              </button>
                              <button
                                 onClick={cancelEdit}
                                 className="border border-gray-300 hover:bg-gray-100 font-bold text-sm px-4 py-2.5 rounded-lg transition"
                              >
                                 Batal
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
                        <div className="text-4xl mb-3">🤖</div>
                        <p className="font-bold text-sm">Pilih template untuk diedit</p>
                        <p className="text-xs mt-1">Klik tombol Edit pada template di sebelah kiri</p>
                     </div>
                  )}

                  {/* Info box */}
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                     <h4 className="font-bold text-yellow-800 text-xs mb-2">⚡ Cara Kerja</h4>
                     <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                        <li>Template disimpan di database Supabase</li>
                        <li>Jika tidak ada custom, sistem pakai teks default</li>
                        <li>Perubahan langsung aktif tanpa restart</li>
                        <li>Tombol Reset mengembalikan ke teks bawaan</li>
                     </ul>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
