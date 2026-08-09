'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/app/components/ConfirmModal';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  typeof window !== 'undefined' ? (window.location.origin + '/api/admin/sb') : (process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
);

async function sbWrite<T = unknown>(opts: {
  action: 'insert' | 'update' | 'delete';
  table: string;
  data?: unknown;
  match?: Record<string, unknown>;
}): Promise<{ data: T[] | null; error: { message: string } | null }> {
  try {
    const res = await fetch('/api/admin/sb-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const out = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) return { data: null, error: { message: out.error || JSON.stringify(out) } };
    return { data: (out.data as T[]) ?? null, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } };
  }
}

type Product = {
  id: string;
  created_at: string;
  nama_produk: string;
  gambar_url?: string | null;
  detail?: string | null;
  harga: number;
  harga_promo?: number | null;
  link_pembelian?: string | null;
  is_active: boolean;
  urutan: number;
};

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function driveThumb(url?: string | null) {
  if (!url) return null;
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]{10,100})/) || url.match(/\/d\/([a-zA-Z0-9_-]{10,100})\//);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w400` : url;
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

const emptyForm = { nama_produk: '', detail: '', harga: '', harga_promo: '', link_pembelian: '', gambar_url: '', is_active: true, urutan: '' };

export default function AltaSolutionAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [gambarFile, setGambarFile] = useState<File | null>(null);
  const gambarRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message?: string; onConfirm: () => void }>({ open: false, onConfirm: () => {} });
  const askConfirm = (message: string, fn: () => void) => setConfirmModal({ open: true, message, onConfirm: fn });
  const closeConfirm = () => setConfirmModal(m => ({ ...m, open: false }));

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('altasolution_products').select('*').order('urutan').order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/altasolution/upload', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Upload gagal');
    return d.url;
  }

  function openModal(p?: Product) {
    setEditing(p || null);
    setForm(p
      ? {
          nama_produk: p.nama_produk,
          detail: p.detail || '',
          harga: String(p.harga ?? ''),
          harga_promo: p.harga_promo != null ? String(p.harga_promo) : '',
          link_pembelian: p.link_pembelian || '',
          gambar_url: p.gambar_url || '',
          is_active: p.is_active,
          urutan: String(p.urutan ?? (products.length + 1)),
        }
      : { ...emptyForm, urutan: String(products.length + 1) }
    );
    setGambarFile(null);
    setShowModal(true);
  }

  async function saveProduct() {
    if (!form.nama_produk.trim()) { alert('Nama produk wajib diisi'); return; }
    if (!form.harga) { alert('Harga wajib diisi'); return; }
    setSaving(true);
    try {
      let gambar_url = form.gambar_url;
      if (gambarFile) gambar_url = await uploadFile(gambarFile);

      const payload = {
        nama_produk: form.nama_produk.trim(),
        detail: form.detail.trim() || null,
        harga: Number(form.harga) || 0,
        harga_promo: form.harga_promo !== '' ? Number(form.harga_promo) : null,
        link_pembelian: form.link_pembelian.trim() || null,
        gambar_url: gambar_url || null,
        is_active: form.is_active,
        urutan: Number(form.urutan) || 1,
      };

      if (editing) {
        const { error } = await sbWrite({ action: 'update', table: 'altasolution_products', data: payload, match: { id: editing.id } });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sbWrite({ action: 'insert', table: 'altasolution_products', data: payload });
        if (error) throw new Error(error.message);
      }
      setShowModal(false);
      fetchProducts();
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function deleteProduct(id: string) {
    askConfirm('Hapus produk ini?', async () => {
      closeConfirm();
      const { error } = await sbWrite({ action: 'delete', table: 'altasolution_products', match: { id } });
      if (error) { alert(error.message); return; }
      fetchProducts();
    });
  }

  async function toggleActive(p: Product) {
    await sbWrite({ action: 'update', table: 'altasolution_products', data: { is_active: !p.is_active }, match: { id: p.id } });
    fetchProducts();
  }

  const filtered = products.filter(p => p.nama_produk.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE500]/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#b8a000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900">Admin AltaSolution</h1>
              <p className="text-xs text-gray-400">Kelola produk marketplace altanikindo.com/altasolution</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/altasolution" target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 font-semibold border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition">
              Lihat Halaman Publik →
            </a>
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-800 font-semibold border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition">
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cari produk..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFE500] bg-white flex-1 min-w-[220px]" />
          <button onClick={() => openModal()}
            className="bg-[#FFE500] hover:bg-yellow-300 text-black px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm shrink-0">
            + Tambah Produk
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#FFE500] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <div className="text-3xl mb-2">📭</div>
            {products.length === 0 ? 'Belum ada produk. Klik "+ Tambah Produk" untuk mulai.' : 'Produk tidak ditemukan'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(p => {
              const hasPromo = p.harga_promo != null && p.harga_promo > 0 && p.harga_promo < p.harga;
              const disc = hasPromo ? Math.round((1 - (p.harga_promo as number) / p.harga) * 100) : 0;
              return (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col transition ${p.is_active ? 'border-gray-100 hover:border-[#FFE500]/40' : 'border-gray-100 opacity-50'}`}>
                  <div className="relative bg-gray-50 aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => p.gambar_url && setLightbox(driveThumb(p.gambar_url))}>
                    {p.gambar_url ? (
                      <img src={driveThumb(p.gambar_url) || p.gambar_url} alt={p.nama_produk} className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200 text-3xl">📦</div>
                    )}
                    {disc > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">-{disc}%</div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">#{p.urutan}</div>
                    {!p.is_active && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-gray-700 text-[10px] font-bold px-2 py-1 rounded-full">NONAKTIF</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1 gap-1">
                    <h3 className="font-bold text-sm text-gray-900 leading-snug">{p.nama_produk}</h3>
                    {p.detail && <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 flex-1">{p.detail}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        {hasPromo && <div className="text-[10px] text-gray-300 line-through">{fmtRp(p.harga)}</div>}
                        <div className="text-sm font-black text-[#b8a000]">{fmtRp(hasPromo ? (p.harga_promo as number) : p.harga)}</div>
                      </div>
                      {p.link_pembelian && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">🔗 Link</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-50">
                      <button onClick={() => openModal(p)} className="flex-1 text-xs text-gray-500 hover:text-gray-800 font-semibold py-1 rounded hover:bg-gray-100 transition">Edit</button>
                      <button onClick={() => toggleActive(p)} className={`flex-1 text-xs font-semibold py-1 rounded transition ${p.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button onClick={() => deleteProduct(p.id)} className="flex-1 text-xs text-red-400 hover:text-red-600 font-semibold py-1 rounded hover:bg-red-50 transition">Hapus</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Tambah/Edit Produk */}
      {showModal && (
        <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-black text-gray-900">{editing ? 'Edit Produk' : 'Tambah Produk'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Nama Produk *</label>
                  <input value={form.nama_produk} onChange={e => setForm(f => ({ ...f, nama_produk: e.target.value }))} placeholder="Nama lengkap produk" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Urutan Tampil</label>
                  <input type="number" min={1} value={form.urutan} onChange={e => setForm(f => ({ ...f, urutan: e.target.value }))} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Detail Produk</label>
                <textarea rows={4} value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="Deskripsi, spesifikasi, fitur, dll." className={inputCls + ' resize-none'} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Harga (Rp) *</label>
                  <input type="number" min={0} value={form.harga} onChange={e => setForm(f => ({ ...f, harga: e.target.value }))} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Harga Promo (Rp)</label>
                  <input type="number" min={0} value={form.harga_promo} onChange={e => setForm(f => ({ ...f, harga_promo: e.target.value }))} placeholder="Kosongkan jika tidak ada promo" className={inputCls} />
                </div>
              </div>
              {form.harga && form.harga_promo && Number(form.harga_promo) > 0 && Number(form.harga_promo) < Number(form.harga) && (
                <div className="bg-[#FFE500]/10 border border-[#FFE500]/30 rounded-lg px-4 py-2 text-sm flex gap-4">
                  <span className="text-gray-400 line-through">{fmtRp(Number(form.harga))}</span>
                  <span className="font-black text-[#b8a000]">{fmtRp(Number(form.harga_promo))}</span>
                  <span className="text-red-500 font-bold ml-auto">-{Math.round((1 - Number(form.harga_promo) / Number(form.harga)) * 100)}%</span>
                </div>
              )}

              <div>
                <label className={labelCls}>Link Pembelian (opsional)</label>
                <input value={form.link_pembelian} onChange={e => setForm(f => ({ ...f, link_pembelian: e.target.value }))} placeholder="https://tokopedia.com/... atau https://wa.me/..." className={inputCls} />
                <p className="text-[11px] text-gray-400 mt-1">Jika kosong, tombol "Beli" di halaman publik akan mengarah ke WhatsApp CS.</p>
              </div>

              <div>
                <label className={labelCls}>Gambar Produk</label>
                {gambarFile ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <img src={URL.createObjectURL(gambarFile)} alt="preview" className="w-16 h-12 object-contain rounded bg-white" />
                    <span className="text-sm text-green-700 flex-1 truncate">{gambarFile.name}</span>
                    <button onClick={() => setGambarFile(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </div>
                ) : form.gambar_url ? (
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <img src={driveThumb(form.gambar_url) || form.gambar_url} alt="current" className="w-16 h-12 object-contain rounded bg-white" />
                    <span className="text-xs text-gray-500 flex-1">Gambar saat ini</span>
                    <button onClick={() => setForm(f => ({ ...f, gambar_url: '' }))} className="text-gray-400 hover:text-gray-600 text-xs">Hapus</button>
                    <button onClick={() => gambarRef.current?.click()} className="text-blue-500 hover:text-blue-700 text-xs font-semibold">Ganti</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => gambarRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 hover:border-[#FFE500]/50 rounded-lg py-5 flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition text-sm">
                    <span className="text-xl">📸</span>
                    <span className="font-semibold">Upload gambar produk</span>
                    <span className="text-xs">JPG, PNG, WEBP · Maks 10MB</span>
                  </button>
                )}
                <input ref={gambarRef} type="file" accept="image/*" className="hidden" onChange={e => setGambarFile(e.target.files?.[0] || null)} />
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#FFE500] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-5"></div>
                </label>
                <span className="text-sm font-semibold text-gray-700">Aktif di halaman publik</span>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                <button onClick={saveProduct} disabled={saving} className="flex-1 py-2.5 bg-[#FFE500] hover:bg-yellow-300 text-black rounded-xl text-sm font-black transition disabled:opacity-50">
                  {saving ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="preview" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold">✕</button>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.open} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={closeConfirm} />
    </div>
  );
}
