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
};

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
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [waNumber, setWaNumber] = useState('62');

  useEffect(() => {
    fetch('/api/altasolution/data')
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .finally(() => setLoading(false));

    fetch('/api/nikon-config')
      .then(r => r.json())
      .then(d => setWaNumber(d?.config?.wa_number || '62'))
      .catch(() => {});
  }, []);

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
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 shadow-sm px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-black rounded-lg px-2 py-1.5 flex items-center">
            <img src="/ALTA_baru.png" alt="Alta Nikindo" className="h-7 object-contain" />
          </div>
        </div>
        <a href="/nikon" className="text-xs text-gray-400 hover:text-gray-700 transition">Kembali ke Beranda</a>
      </nav>

      <div className="pt-14">
        {/* Header */}
        <div className="bg-black text-white px-4 py-10 text-center">
          <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full mb-3">
            Marketplace
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">AltaSolution</h1>
          <p className="mt-2 text-white/60 text-sm max-w-lg mx-auto">Solusi produk & aksesoris fotografi dari Alta Nikindo — distributor resmi Nikon Indonesia</p>
        </div>

        {/* Product Grid */}
        <div className="max-w-6xl mx-auto px-4 py-10">
          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-bold mb-2 text-gray-800">Belum ada produk tersedia</h2>
              <p className="text-gray-400 text-sm">Pantau terus halaman ini untuk produk terbaru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map(p => {
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
          <p>PT. Alta Nikindo · Distributor Resmi Nikon Indonesia</p>
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
