'use client';
import { useEffect, useState } from 'react';

type Product = {
  id: string;
  nama_produk: string;
  gambar_url?: string | null;
  detail?: string | null;
  harga: number;
  harga_promo?: number | null;
  link_pembelian?: string | null;
  kategori?: string | null;
  brand?: string | null;
};

type Taxonomy = { id: string; nama: string };

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function driveThumb(url?: string | null) {
  if (!url) return null;
  const m = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w600` : url;
}

export default function AltaSolutionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [brands, setBrands] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [waNumber, setWaNumber] = useState('62');

  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  useEffect(() => {
    fetch('/api/altasolution/data')
      .then(r => r.json())
      .then(d => {
        setProducts(d.products || []);
        setCategories(d.categories || []);
        setBrands(d.brands || []);
      })
      .finally(() => setLoading(false));

    fetch('/api/nikon-config')
      .then(r => r.json())
      .then(d => setWaNumber(d?.config?.wa_number || '62'))
      .catch(() => {});
  }, []);

  const filteredProducts = products.filter(p => {
    if (search.trim() && !p.nama_produk.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (kategoriFilter && p.kategori !== kategoriFilter) return false;
    if (brandFilter && p.brand !== brandFilter) return false;
    return true;
  });

  function buyLink(p: Product) {
    if (p.link_pembelian) return p.link_pembelian;
    const msg = encodeURIComponent(`Halo, saya ingin bertanya/membeli produk "${p.nama_produk}" di AltaSolution.`);
    return `https://wa.me/${waNumber}?text=${msg}`;
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#FFE500] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Memuat AltaSolution...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <div>
        {/* Header (hitam, sampai ke atas layar) */}
        <div className="bg-black text-white">
          <nav className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-black rounded-lg px-2 py-1.5 flex items-center">
                <img src="/ALTA_baru.png" alt="Alta Nikindo" className="h-7 object-contain" />
              </div>
            </div>
            <a href="https://www.altanikindo.com" className="text-xs text-white/70 hover:text-white transition">Kembali ke Beranda</a>
          </nav>
          <div className="px-4 pb-10 pt-2 text-center">
            <h1 className="text-2xl sm:text-3xl font-black leading-tight">AltaSolution</h1>
            <p className="mt-2 text-white/60 text-sm max-w-lg mx-auto">Solusi produk & aksesoris fotografi dari Alta Nikindo</p>
          </div>
        </div>

        {/* Product Grid */}
        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* Search & Filter Toolbar */}
          {products.length > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama produk..."
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 bg-white"
                  />
                </div>
                {categories.length > 0 && (
                  <select
                    value={kategoriFilter}
                    onChange={e => setKategoriFilter(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#FFE500] sm:w-52 shrink-0"
                  >
                    <option value="">Semua Kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.nama}>{c.nama}</option>
                    ))}
                  </select>
                )}
              </div>

              {brands.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setBrandFilter('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${brandFilter === '' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                  >
                    Semua Brand
                  </button>
                  {brands.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setBrandFilter(f => (f === b.nama ? '' : b.nama))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${brandFilter === b.nama ? 'bg-[#FFE500] text-black border-[#FFE500]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                    >
                      {b.nama}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-bold mb-2 text-gray-800">Belum ada produk tersedia</h2>
              <p className="text-gray-400 text-sm">Pantau terus halaman ini untuk produk terbaru.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🙁</div>
              <h2 className="text-xl font-bold mb-2 text-gray-800">Produk tidak ditemukan</h2>
              <p className="text-gray-400 text-sm">Coba ubah kata kunci pencarian atau filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map(p => {
                const hasPromo = p.harga_promo != null && p.harga_promo > 0 && p.harga_promo < p.harga;
                const disc = hasPromo ? Math.round((1 - (p.harga_promo as number) / p.harga) * 100) : 0;
                return (
                  <button key={p.id} onClick={() => setSelected(p)} className="text-left bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:border-[#FFE500] hover:shadow-md transition-all">
                    <div className="relative bg-gray-50 aspect-square overflow-hidden">
                      {p.gambar_url ? (
                        <img src={driveThumb(p.gambar_url) || p.gambar_url} alt={p.nama_produk} className="w-full h-full object-contain p-3" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200 text-4xl">📦</div>
                      )}
                      {disc > 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          -{disc}%
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-1">
                      <h3 className="font-bold text-sm leading-snug text-gray-900 line-clamp-2 flex-1">{p.nama_produk}</h3>
                      <div className="mt-1">
                        {hasPromo && <div className="text-gray-300 line-through text-xs">{fmtRp(p.harga)}</div>}
                        <div className="text-gray-900 font-black text-base">{fmtRp(hasPromo ? (p.harga_promo as number) : p.harga)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 py-8 text-center text-gray-400 text-xs">
          <p>PT. Alta Nikindo</p>
          <p className="mt-1"><a href="https://altanikindo.com" className="hover:text-gray-600 transition">altanikindo.com</a></p>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="relative bg-gray-50 aspect-square overflow-hidden">
              {selected.gambar_url ? (
                <img src={driveThumb(selected.gambar_url) || selected.gambar_url} alt={selected.nama_produk} className="w-full h-full object-contain p-6" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-200 text-6xl">📦</div>
              )}
              <button onClick={() => setSelected(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 shadow-sm transition">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-lg font-black text-gray-900 leading-tight">{selected.nama_produk}</h2>
                {(() => {
                  const hasPromo = selected.harga_promo != null && selected.harga_promo > 0 && selected.harga_promo < selected.harga;
                  const disc = hasPromo ? Math.round((1 - (selected.harga_promo as number) / selected.harga) * 100) : 0;
                  return (
                    <div className="flex items-center gap-2 mt-2">
                      {hasPromo && <span className="text-gray-300 line-through text-sm">{fmtRp(selected.harga)}</span>}
                      <span className="text-gray-900 font-black text-2xl">{fmtRp(hasPromo ? (selected.harga_promo as number) : selected.harga)}</span>
                      {disc > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">-{disc}%</span>}
                    </div>
                  );
                })()}
              </div>

              {selected.detail && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selected.detail}</p>
                </div>
              )}

              <a href={buyLink(selected)} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#FFE500] text-black font-black rounded-xl hover:bg-yellow-300 transition text-sm">
                {selected.link_pembelian ? 'Beli Sekarang →' : 'Hubungi via WhatsApp →'}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
