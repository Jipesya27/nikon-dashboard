'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  typeof window !== 'undefined' ? (window.location.origin + '/api/admin/sb') : (process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
);

async function sbWrite<T = unknown>(opts: {
  action: 'insert' | 'update' | 'delete' | 'upsert';
  table: string;
  data?: unknown;
  match?: Record<string, unknown>;
  select?: string;
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

// ─── Types ───────────────────────────────────────────────────────────────────

type Promo = {
  id: string;
  created_at: string;
  judul: string;
  banner_url?: string;
  tanggal_mulai?: string;
  tanggal_berakhir?: string;
  is_active: boolean;
};

type PromoItem = {
  id: string;
  promo_id: string;
  kode_barang: string;
  nama_barang: string;
  gambar_url?: string;
  spek?: string;
  stock: number;
  harga_normal: number;
  harga_promo: number;
  urutan: number;
};

type Order = {
  id: string;
  created_at: string;
  nama_pembeli: string;
  nomor_wa: string;
  alamat: string;
  kodepos?: string;
  nama_barang_snapshot: string;
  harga_promo_snapshot: number;
  harga_transfer: number;
  kode_unik: number;
  status: string;
  bukti_transfer_url?: string;
  nota_kamera_url?: string;
  garansi_kamera_url?: string;
  invoice_token: string;
  promo_item_id: string;
};

type SubView = 'promo' | 'items' | 'orders';

type CurrentUser = { role?: string; nama?: string } | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function fmtDatetime(d: string) {
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

function driveProxyUrl(url?: string | null) {
  if (!url) return null;
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]{10,100})/) || url.match(/\/d\/([a-zA-Z0-9_-]{10,100})\//);
  return m ? `/api/drive-file?id=${m[1]}` : url;
}

function driveThumb(url?: string | null) {
  if (!url) return null;
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]{10,100})/) || url.match(/\/d\/([a-zA-Z0-9_-]{10,100})\//);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w400` : url;
}

const ORDER_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  menunggu_pembayaran: { label: 'Menunggu Bayar', cls: 'bg-amber-100 text-amber-700' },
  menunggu_verifikasi: { label: 'Menunggu Verifikasi', cls: 'bg-blue-100 text-blue-700' },
  diproses: { label: 'Diproses', cls: 'bg-purple-100 text-purple-700' },
  dikirim: { label: 'Dikirim', cls: 'bg-cyan-100 text-cyan-700' },
  selesai: { label: 'Selesai', cls: 'bg-green-100 text-green-700' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-red-100 text-red-700' },
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PromoDatacolorTab({ currentUser }: { currentUser: CurrentUser }) {
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';
  const [subView, setSubView] = useState<SubView>('promo');

  // Promo state
  const [promos, setPromos] = useState<Promo[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [promoForm, setPromoForm] = useState({ judul: '', tanggal_mulai: '', tanggal_berakhir: '', is_active: true, banner_url: '' });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [promoSaving, setPromoSaving] = useState(false);

  // Items state
  const [items, setItems] = useState<PromoItem[]>([]);
  const [itemsPromoId, setItemsPromoId] = useState<string>('');
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PromoItem | null>(null);
  const [itemForm, setItemForm] = useState({ kode_barang: '', nama_barang: '', spek: '', stock: '', harga_normal: '', harga_promo: '', urutan: '', gambar_url: '' });
  const [gambarFile, setGambarFile] = useState<File | null>(null);
  const gambarRef = useRef<HTMLInputElement>(null);
  const [itemSaving, setItemSaving] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Image lightbox
  const [lightbox, setLightbox] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchPromos = useCallback(async () => {
    setPromoLoading(true);
    const { data } = await supabase.from('promo_datacolor').select('*').order('created_at', { ascending: false });
    setPromos(data || []);
    setPromoLoading(false);
  }, []);

  const fetchItems = useCallback(async (promoId: string) => {
    setItemsLoading(true);
    const { data } = await supabase.from('promo_datacolor_items').select('*').eq('promo_id', promoId).order('urutan');
    setItems(data || []);
    setItemsLoading(false);
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    const { data } = await supabase.from('promo_datacolor_orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
    setOrdersLoading(false);
  }, []);

  useEffect(() => {
    if (subView === 'promo') fetchPromos();
    if (subView === 'items') { fetchPromos(); if (itemsPromoId) fetchItems(itemsPromoId); }
    if (subView === 'orders') fetchOrders();
  }, [subView]);

  useEffect(() => {
    if (subView === 'items' && itemsPromoId) fetchItems(itemsPromoId);
  }, [itemsPromoId]);

  // ── Upload file ──────────────────────────────────────────────────────────────

  async function uploadFile(file: File, prefix: string): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('prefix', prefix);
    const r = await fetch('/api/promo/upload', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Upload gagal');
    return d.url;
  }

  // ── Promo CRUD ───────────────────────────────────────────────────────────────

  function openPromoModal(p?: Promo) {
    setEditingPromo(p || null);
    setPromoForm(p
      ? { judul: p.judul, tanggal_mulai: p.tanggal_mulai || '', tanggal_berakhir: p.tanggal_berakhir || '', is_active: p.is_active, banner_url: p.banner_url || '' }
      : { judul: '', tanggal_mulai: '', tanggal_berakhir: '', is_active: true, banner_url: '' }
    );
    setBannerFile(null);
    setShowPromoModal(true);
  }

  async function savePromo() {
    if (!promoForm.judul.trim()) { alert('Judul wajib diisi'); return; }
    setPromoSaving(true);
    try {
      let banner_url = promoForm.banner_url;
      if (bannerFile) banner_url = await uploadFile(bannerFile, 'Banner');

      const payload = {
        judul: promoForm.judul.trim(),
        tanggal_mulai: promoForm.tanggal_mulai || null,
        tanggal_berakhir: promoForm.tanggal_berakhir || null,
        is_active: promoForm.is_active,
        banner_url: banner_url || null,
      };

      if (editingPromo) {
        const { error } = await sbWrite({ action: 'update', table: 'promo_datacolor', data: payload, match: { id: editingPromo.id } });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sbWrite({ action: 'insert', table: 'promo_datacolor', data: payload });
        if (error) throw new Error(error.message);
      }
      setShowPromoModal(false);
      fetchPromos();
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    } finally {
      setPromoSaving(false);
    }
  }

  async function deletePromo(id: string) {
    if (!confirm('Hapus promo ini beserta semua itemnya?')) return;
    const { error } = await sbWrite({ action: 'delete', table: 'promo_datacolor', match: { id } });
    if (error) { alert(error.message); return; }
    fetchPromos();
  }

  async function toggleActive(p: Promo) {
    await sbWrite({ action: 'update', table: 'promo_datacolor', data: { is_active: !p.is_active }, match: { id: p.id } });
    fetchPromos();
  }

  // ── Item CRUD ────────────────────────────────────────────────────────────────

  function openItemModal(item?: PromoItem) {
    setEditingItem(item || null);
    setItemForm(item
      ? { kode_barang: item.kode_barang, nama_barang: item.nama_barang, spek: item.spek || '', stock: String(item.stock ?? ''), harga_normal: String(item.harga_normal), harga_promo: String(item.harga_promo), urutan: String(item.urutan), gambar_url: item.gambar_url || '' }
      : { kode_barang: '', nama_barang: '', spek: '', stock: '', harga_normal: '', harga_promo: '', urutan: String((items.length || 0) + 1), gambar_url: '' }
    );
    setGambarFile(null);
    setShowItemModal(true);
  }

  async function saveItem() {
    if (!itemsPromoId) { alert('Pilih promo terlebih dahulu'); return; }
    if (!itemForm.nama_barang.trim()) { alert('Nama barang wajib diisi'); return; }
    if (!itemForm.harga_promo) { alert('Harga promo wajib diisi'); return; }
    setItemSaving(true);
    try {
      let gambar_url = itemForm.gambar_url;
      if (gambarFile) gambar_url = await uploadFile(gambarFile, 'Produk');

      const payload = {
        promo_id: itemsPromoId,
        kode_barang: itemForm.kode_barang.trim() || null,
        nama_barang: itemForm.nama_barang.trim(),
        spek: itemForm.spek.trim() || null,
        stock: itemForm.stock !== '' ? Number(itemForm.stock) : null,
        harga_normal: Number(itemForm.harga_normal) || 0,
        harga_promo: Number(itemForm.harga_promo),
        urutan: Number(itemForm.urutan) || 1,
        gambar_url: gambar_url || null,
      };

      if (editingItem) {
        const { error } = await sbWrite({ action: 'update', table: 'promo_datacolor_items', data: payload, match: { id: editingItem.id } });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sbWrite({ action: 'insert', table: 'promo_datacolor_items', data: payload });
        if (error) throw new Error(error.message);
      }
      setShowItemModal(false);
      fetchItems(itemsPromoId);
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    } finally {
      setItemSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Hapus produk ini?')) return;
    await sbWrite({ action: 'delete', table: 'promo_datacolor_items', match: { id } });
    fetchItems(itemsPromoId);
  }

  // ── Order actions ─────────────────────────────────────────────────────────────

  async function updateOrderStatus(orderId: string, status: string) {
    setStatusUpdating(true);
    const { error } = await sbWrite({ action: 'update', table: 'promo_datacolor_orders', data: { status }, match: { id: orderId } });
    if (error) { alert(error.message); }
    else {
      setViewingOrder(v => v ? { ...v, status } : v);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    }
    setStatusUpdating(false);
  }

  const filteredOrders = orders.filter(o => {
    const q = orderSearch.toLowerCase();
    const matchQ = !q || o.nama_pembeli.toLowerCase().includes(q) || o.nomor_wa.includes(q) || o.nama_barang_snapshot.toLowerCase().includes(q) || o.id.includes(q);
    const matchStatus = !orderStatusFilter || o.status === orderStatusFilter;
    return matchQ && matchStatus;
  });

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-[#FFE500]/15 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#b8a000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-black text-gray-900">Promo Datacolor</h2>
          <p className="text-xs text-gray-400">Kelola promo, produk, dan order pembelian</p>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['promo', '🎯 Promo'], ['items', '📦 Produk'], ['orders', '🛒 Orders']] as [SubView, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setSubView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${subView === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── VIEW: PROMO ─────────────────────────────────────────────── */}
      {subView === 'promo' && (
        <div className="space-y-4">
          {isAdmin && (
            <button onClick={() => openPromoModal()}
              className="bg-[#FFE500] hover:bg-yellow-300 text-black px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
              + Tambah Promo Baru
            </button>
          )}
          {promoLoading ? <LoadingSpinner /> : promos.length === 0 ? (
            <EmptyState label="Belum ada promo" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {promos.map(p => (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${p.is_active ? 'border-[#FFE500]/50' : 'border-gray-100'}`}>
                  {p.banner_url ? (
                    <div className="h-32 bg-gray-100 overflow-hidden cursor-pointer" onClick={() => setLightbox(driveThumb(p.banner_url))}>
                      <img src={driveThumb(p.banner_url) || p.banner_url} alt="banner" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-300 text-3xl">🎁</div>
                  )}
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-gray-900 leading-snug flex-1">{p.judul}</h3>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {p.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{fmtDate(p.tanggal_mulai)} — {fmtDate(p.tanggal_berakhir)}</p>
                    <div className="flex gap-2 mt-auto pt-2 border-t border-gray-50">
                      {isAdmin && (
                        <>
                          <button onClick={() => openPromoModal(p)} className="text-xs text-gray-500 hover:text-gray-800 font-semibold px-2 py-1 rounded hover:bg-gray-100 transition">Edit</button>
                          <button onClick={() => toggleActive(p)} className={`text-xs font-semibold px-2 py-1 rounded transition ${p.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}>
                            {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <button onClick={() => deletePromo(p.id)} className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded hover:bg-red-50 transition ml-auto">Hapus</button>
                        </>
                      )}
                      <button onClick={() => { setItemsPromoId(p.id); setSubView('items'); }}
                        className="text-xs text-blue-500 hover:text-blue-700 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition ml-auto">
                        Lihat Produk →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW: ITEMS ─────────────────────────────────────────────── */}
      {subView === 'items' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={itemsPromoId} onChange={e => setItemsPromoId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFE500] bg-white min-w-[200px]">
              <option value="">-- Pilih Promo --</option>
              {promos.map(p => <option key={p.id} value={p.id}>{p.judul}</option>)}
            </select>
            {isAdmin && itemsPromoId && (
              <button onClick={() => openItemModal()}
                className="bg-[#FFE500] hover:bg-yellow-300 text-black px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
                + Tambah Produk
              </button>
            )}
          </div>

          {!itemsPromoId ? (
            <div className="text-center text-gray-400 py-12 text-sm">Pilih promo untuk melihat produk</div>
          ) : itemsLoading ? <LoadingSpinner /> : items.length === 0 ? (
            <EmptyState label="Belum ada produk di promo ini" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map(item => {
                const disc = item.harga_normal > 0 ? Math.round((1 - item.harga_promo / item.harga_normal) * 100) : 0;
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:border-[#FFE500]/40 transition">
                    <div className="relative bg-gray-50 aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => item.gambar_url && setLightbox(driveThumb(item.gambar_url))}>
                      {item.gambar_url ? (
                        <img src={driveThumb(item.gambar_url) || item.gambar_url} alt={item.nama_barang} className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200 text-3xl">📦</div>
                      )}
                      {disc > 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">-{disc}%</div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">#{item.urutan}</div>
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-1">
                      {item.kode_barang && <div className="text-[10px] text-gray-400 font-mono">{item.kode_barang}</div>}
                      <h3 className="font-bold text-sm text-gray-900 leading-snug">{item.nama_barang}</h3>
                      {item.spek && <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 flex-1">{item.spek}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          {item.harga_normal > 0 && <div className="text-[10px] text-gray-300 line-through">{fmtRp(item.harga_normal)}</div>}
                          <div className="text-sm font-black text-[#b8a000]">{fmtRp(item.harga_promo)}</div>
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.stock !== null && item.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          Stok: {item.stock ?? '∞'}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-50">
                          <button onClick={() => openItemModal(item)} className="flex-1 text-xs text-gray-500 hover:text-gray-800 font-semibold py-1 rounded hover:bg-gray-100 transition">Edit</button>
                          <button onClick={() => deleteItem(item.id)} className="flex-1 text-xs text-red-400 hover:text-red-600 font-semibold py-1 rounded hover:bg-red-50 transition">Hapus</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW: ORDERS ────────────────────────────────────────────── */}
      {subView === 'orders' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3">
            <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="🔍 Cari nama, WA, atau ID order..."
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFE500] bg-white flex-1 min-w-[220px]" />
            <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFE500] bg-white">
              <option value="">Semua Status</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={fetchOrders} className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition font-semibold">↻ Refresh</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => {
              const count = orders.filter(o => o.status === k).length;
              return (
                <button key={k} onClick={() => setOrderStatusFilter(orderStatusFilter === k ? '' : k)}
                  className={`text-center py-2 px-3 rounded-xl border text-xs font-bold transition-all ${orderStatusFilter === k ? 'border-[#FFE500] bg-[#FFE500]/10' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                  <div className="text-lg font-black text-gray-900">{count}</div>
                  <div className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.cls} mt-0.5`}>{v.label}</div>
                </button>
              );
            })}
          </div>

          {ordersLoading ? <LoadingSpinner /> : filteredOrders.length === 0 ? (
            <EmptyState label="Tidak ada order ditemukan" />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Tgl', 'Pembeli', 'Produk', 'Transfer', 'Status', 'Aksi'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map(o => {
                      const st = ORDER_STATUS_LABELS[o.status] || { label: o.status, cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={o.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDatetime(o.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{o.nama_pembeli}</div>
                            <div className="text-xs text-gray-400">{o.nomor_wa}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800 max-w-[180px] truncate">{o.nama_barang_snapshot}</div>
                            <div className="text-xs text-gray-400">{fmtRp(o.harga_promo_snapshot)}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-black text-gray-900">{fmtRp(o.harga_transfer)}</div>
                            <div className="text-[10px] text-gray-400">kode +{o.kode_unik}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setViewingOrder(o)} className="text-xs text-blue-500 hover:text-blue-700 font-semibold hover:underline">Detail →</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: PROMO
      ══════════════════════════════════════════════════ */}
      {showPromoModal && (
        <Modal title={editingPromo ? 'Edit Promo' : 'Tambah Promo Baru'} onClose={() => setShowPromoModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Judul Promo *</label>
              <input value={promoForm.judul} onChange={e => setPromoForm(f => ({ ...f, judul: e.target.value }))}
                placeholder="e.g. Dapatkan Special Price Datacolor..." className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tanggal Mulai</label>
                <input type="date" value={promoForm.tanggal_mulai} onChange={e => setPromoForm(f => ({ ...f, tanggal_mulai: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tanggal Berakhir</label>
                <input type="date" value={promoForm.tanggal_berakhir} onChange={e => setPromoForm(f => ({ ...f, tanggal_berakhir: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Banner Promo</label>
              {bannerFile ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <img src={URL.createObjectURL(bannerFile)} alt="preview" className="w-16 h-10 object-cover rounded" />
                  <span className="text-sm text-green-700 flex-1 truncate">{bannerFile.name}</span>
                  <button onClick={() => setBannerFile(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
              ) : promoForm.banner_url ? (
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <img src={driveThumb(promoForm.banner_url) || promoForm.banner_url} alt="current" className="w-16 h-10 object-cover rounded" />
                  <span className="text-xs text-gray-500 flex-1">Banner saat ini</span>
                  <button onClick={() => setPromoForm(f => ({ ...f, banner_url: '' }))} className="text-gray-400 hover:text-gray-600 text-xs">Hapus</button>
                </div>
              ) : (
                <button type="button" onClick={() => bannerRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 hover:border-[#FFE500]/50 rounded-lg py-6 flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition text-sm">
                  <span className="text-2xl">🖼️</span>
                  <span className="font-semibold">Klik untuk upload banner</span>
                  <span className="text-xs">JPG, PNG · Maks 10MB</span>
                </button>
              )}
              <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => setBannerFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={promoForm.is_active} onChange={e => setPromoForm(f => ({ ...f, is_active: e.target.checked }))} className="sr-only peer" />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#FFE500] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
              <span className="text-sm font-semibold text-gray-700">Aktif di halaman publik</span>
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowPromoModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
              <button onClick={savePromo} disabled={promoSaving} className="flex-1 py-2.5 bg-[#FFE500] hover:bg-yellow-300 text-black rounded-xl text-sm font-black transition disabled:opacity-50">
                {promoSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: ITEM
      ══════════════════════════════════════════════════ */}
      {showItemModal && (
        <Modal title={editingItem ? 'Edit Produk' : 'Tambah Produk'} onClose={() => setShowItemModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Kode Barang</label>
                <input value={itemForm.kode_barang} onChange={e => setItemForm(f => ({ ...f, kode_barang: e.target.value }))} placeholder="e.g. DC-SPY-X-Elite" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Urutan Tampil</label>
                <input type="number" min={1} value={itemForm.urutan} onChange={e => setItemForm(f => ({ ...f, urutan: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Nama Barang *</label>
              <input value={itemForm.nama_barang} onChange={e => setItemForm(f => ({ ...f, nama_barang: e.target.value }))} placeholder="Nama lengkap produk" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Spesifikasi / Deskripsi</label>
              <textarea rows={3} value={itemForm.spek} onChange={e => setItemForm(f => ({ ...f, spek: e.target.value }))} placeholder="Fitur, ukuran, warna, dll." className={inputCls + ' resize-none'} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Harga Normal (Rp)</label>
                <input type="number" value={itemForm.harga_normal} onChange={e => setItemForm(f => ({ ...f, harga_normal: e.target.value }))} placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Harga Promo (Rp) *</label>
                <input type="number" value={itemForm.harga_promo} onChange={e => setItemForm(f => ({ ...f, harga_promo: e.target.value }))} placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Stok</label>
                <input type="number" min={0} value={itemForm.stock} onChange={e => setItemForm(f => ({ ...f, stock: e.target.value }))} placeholder="Kosong = tak terbatas" className={inputCls} />
              </div>
            </div>
            {/* Harga summary */}
            {itemForm.harga_normal && itemForm.harga_promo && Number(itemForm.harga_normal) > 0 && (
              <div className="bg-[#FFE500]/10 border border-[#FFE500]/30 rounded-lg px-4 py-2 text-sm flex gap-4">
                <span className="text-gray-400 line-through">{fmtRp(Number(itemForm.harga_normal))}</span>
                <span className="font-black text-[#b8a000]">{fmtRp(Number(itemForm.harga_promo))}</span>
                <span className="text-red-500 font-bold ml-auto">-{Math.round((1 - Number(itemForm.harga_promo) / Number(itemForm.harga_normal)) * 100)}%</span>
              </div>
            )}
            <div>
              <label className={labelCls}>Gambar Produk</label>
              {gambarFile ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <img src={URL.createObjectURL(gambarFile)} alt="preview" className="w-16 h-12 object-contain rounded bg-white" />
                  <span className="text-sm text-green-700 flex-1 truncate">{gambarFile.name}</span>
                  <button onClick={() => setGambarFile(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
              ) : itemForm.gambar_url ? (
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <img src={driveThumb(itemForm.gambar_url) || itemForm.gambar_url} alt="current" className="w-16 h-12 object-contain rounded bg-white" />
                  <span className="text-xs text-gray-500 flex-1">Gambar saat ini</span>
                  <button onClick={() => setItemForm(f => ({ ...f, gambar_url: '' }))} className="text-gray-400 hover:text-gray-600 text-xs">Hapus</button>
                  <button onClick={() => gambarRef.current?.click()} className="text-blue-500 hover:text-blue-700 text-xs font-semibold">Ganti</button>
                </div>
              ) : (
                <button type="button" onClick={() => gambarRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 hover:border-[#FFE500]/50 rounded-lg py-5 flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition text-sm">
                  <span className="text-xl">📸</span>
                  <span className="font-semibold">Upload gambar produk</span>
                  <span className="text-xs">JPG, PNG · Maks 10MB</span>
                </button>
              )}
              <input ref={gambarRef} type="file" accept="image/*" className="hidden" onChange={e => setGambarFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={() => setShowItemModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
              <button onClick={saveItem} disabled={itemSaving} className="flex-1 py-2.5 bg-[#FFE500] hover:bg-yellow-300 text-black rounded-xl text-sm font-black transition disabled:opacity-50">
                {itemSaving ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: ORDER DETAIL
      ══════════════════════════════════════════════════ */}
      {viewingOrder && (
        <Modal title="Detail Order" onClose={() => setViewingOrder(null)} wide>
          <div className="space-y-5">
            {/* Status + invoice link */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">No. Order</p>
                <p className="font-mono font-bold text-sm">#{viewingOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${ORDER_STATUS_LABELS[viewingOrder.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                  {ORDER_STATUS_LABELS[viewingOrder.status]?.label || viewingOrder.status}
                </span>
                <a href={`/promo/invoice/${viewingOrder.invoice_token}`} target="_blank"
                  className="text-xs text-blue-500 hover:underline font-semibold">📄 E-Invoice</a>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <InfoSection title="Data Pembeli">
                <InfoRow label="Nama" value={viewingOrder.nama_pembeli} />
                <InfoRow label="WhatsApp" value={viewingOrder.nomor_wa} />
                <InfoRow label="Alamat" value={viewingOrder.alamat} />
                {viewingOrder.kodepos && <InfoRow label="Kodepos" value={viewingOrder.kodepos} />}
                <InfoRow label="Tgl Order" value={fmtDatetime(viewingOrder.created_at)} />
              </InfoSection>
              <InfoSection title="Info Pembayaran">
                <InfoRow label="Produk" value={viewingOrder.nama_barang_snapshot} />
                <InfoRow label="Harga Promo" value={fmtRp(viewingOrder.harga_promo_snapshot)} />
                <InfoRow label="Kode Unik" value={`+Rp ${viewingOrder.kode_unik}`} />
                <InfoRow label="Total Transfer" value={fmtRp(viewingOrder.harga_transfer)} highlight />
              </InfoSection>
            </div>

            {/* Dokumen */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dokumen</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Nota Kamera', url: viewingOrder.nota_kamera_url },
                  { label: 'Kartu Garansi', url: viewingOrder.garansi_kamera_url },
                  { label: 'Bukti Transfer', url: viewingOrder.bukti_transfer_url },
                ].map(doc => (
                  <div key={doc.label} className="text-center">
                    <p className="text-[10px] text-gray-400 mb-1">{doc.label}</p>
                    {doc.url ? (
                      <a href={driveProxyUrl(doc.url) || doc.url} target="_blank" rel="noopener noreferrer"
                        className="block aspect-square rounded-xl overflow-hidden border border-gray-100 hover:border-[#FFE500] transition bg-gray-50 relative group">
                        <img src={driveThumb(doc.url) || ''} alt={doc.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition bg-black/60 px-2 py-1 rounded">Lihat →</span>
                        </div>
                      </a>
                    ) : (
                      <div className="aspect-square rounded-xl border-2 border-dashed border-gray-100 flex items-center justify-center text-gray-200 text-2xl">📄</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Update status */}
            {isAdmin && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                    <button key={k} disabled={statusUpdating || viewingOrder.status === k}
                      onClick={() => updateOrderStatus(viewingOrder.id, k)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${viewingOrder.status === k ? v.cls + ' border-transparent' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'} disabled:opacity-50`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="preview" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold">✕</button>
        </div>
      )}
    </div>
  );
}

// ─── Micro-components ──────────────────────────────────────────────────────────

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-md'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-black text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-[#FFE500] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-12 text-gray-400 text-sm">
      <div className="text-3xl mb-2">📭</div>
      {label}
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-24 shrink-0 text-xs">{label}</span>
      <span className={`flex-1 ${highlight ? 'font-black text-gray-900' : 'font-medium text-gray-700'}`}>{value}</span>
    </div>
  );
}
