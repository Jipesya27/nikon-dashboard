'use client';
import { useEffect, useRef, useState } from 'react';

type PromoItem = {
  id: string;
  kode_barang: string;
  nama_barang: string;
  gambar_url?: string;
  spek?: string;
  stock: number;
  harga_normal: number;
  harga_promo: number;
  urutan: number;
};

type Promo = {
  id: string;
  judul: string;
  banner_url?: string;
  tanggal_mulai?: string;
  tanggal_berakhir?: string;
};

type Order = {
  id: string;
  nama_pembeli: string;
  nomor_wa: string;
  nama_barang_snapshot: string;
  harga_promo_snapshot: number;
  harga_transfer: number;
  kode_unik: number;
  invoice_token: string;
  status: string;
};

function fmtRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function fmtDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function driveThumb(url?: string) {
  if (!url) return null;
  const m = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w600` : url;
}

type Step = 'promo' | 'form' | 'transfer' | 'done';

export default function PromoPage() {
  const [promo, setPromo] = useState<Promo | null>(null);
  const [items, setItems] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('promo');
  const [selectedItem, setSelectedItem] = useState<PromoItem | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  // Form fields
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');
  const [alamat, setAlamat] = useState('');
  const [kodepos, setKodepos] = useState('');
  const [notaFile, setNotaFile] = useState<File | null>(null);
  const [garansiFile, setGaransiFile] = useState<File | null>(null);
  const [buktiFile, setBuktiFile] = useState<File | null>(null);

  const notaRef = useRef<HTMLInputElement>(null);
  const garansiRef = useRef<HTMLInputElement>(null);
  const buktiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/promo/data')
      .then(r => r.json())
      .then(d => { setPromo(d.promo); setItems(d.items || []); })
      .finally(() => setLoading(false));
  }, []);

  async function uploadFile(file: File, prefix: string): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('prefix', prefix);
    const r = await fetch('/api/promo/upload', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Upload gagal');
    return d.url;
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setErr('');
    setSending(true);
    try {
      let notaUrl = '', garansiUrl = '';
      if (notaFile) notaUrl = await uploadFile(notaFile, 'Nota');
      if (garansiFile) garansiUrl = await uploadFile(garansiFile, 'Garansi');

      const res = await fetch('/api/promo/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promo_item_id: selectedItem.id,
          nama_pembeli: nama,
          nomor_wa: wa,
          alamat,
          kodepos,
          nota_kamera_url: notaUrl || null,
          garansi_kamera_url: garansiUrl || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal membuat order');
      setOrder(d.order);
      setStep('transfer');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleSubmitBukti(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !buktiFile) return;
    setErr('');
    setSending(true);
    try {
      const buktiUrl = await uploadFile(buktiFile, 'Bukti');
      const res = await fetch('/api/promo/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, bukti_transfer_url: buktiUrl }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal upload bukti');
      setOrder(d.order);
      setStep('done');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function sendInvoiceToWA() {
    if (!order) return;
    const invoiceUrl = `${window.location.origin}/promo/invoice/${order.invoice_token}`;
    const waNumber = order.nomor_wa.replace(/\D/g, '').replace(/^0/, '62');
    const msg = `Halo ${order.nama_pembeli}! 🎉\n\nTerima kasih telah melakukan pembelian *${order.nama_barang_snapshot}* dalam program Promo Datacolor Nikon Z Series.\n\nE-Invoice Anda: ${invoiceUrl}\n\nTim kami akan segera memproses pesanan Anda setelah pembayaran terverifikasi.\n\n_Alta Nikindo_`;
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-wa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ target: waNumber, message: msg }),
    });
    alert('Link invoice berhasil dikirim ke WhatsApp!');
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#FFE500] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Memuat halaman promo...</p>
      </div>
    </div>
  );

  if (!promo) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-gray-800 text-center px-4">
      <div>
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold mb-2">Tidak ada promo aktif saat ini</h2>
        <p className="text-gray-400 text-sm">Pantau terus halaman ini untuk penawaran menarik berikutnya.</p>
      </div>
    </div>
  );

  const isExpired = promo.tanggal_berakhir ? new Date(promo.tanggal_berakhir) < new Date() : false;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 shadow-sm px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-black rounded-lg px-2 py-1.5 flex items-center">
            <img src="/ALTA_baru.png" alt="Alta Nikindo" className="h-7 object-contain" />
          </div>
        </div>
        {step !== 'promo' && (
          <button onClick={() => { setStep('promo'); setSelectedItem(null); setOrder(null); setErr(''); }}
            className="text-xs text-gray-400 hover:text-gray-700 transition flex items-center gap-1">
            ← Kembali ke Promo
          </button>
        )}
      </nav>

      <div className="pt-14">
        {/* ════ STEP: PROMO PAGE ════ */}
        {step === 'promo' && (
          <>
            {/* Hero Banner */}
            <div className="relative w-full bg-black overflow-hidden">
              {promo.banner_url ? (
                <img src={driveThumb(promo.banner_url) || promo.banner_url} alt="Banner Promo"
                  className="w-full object-contain object-center" style={{ maxHeight: '60vh' }} />
              ) : (
                <div className="w-full h-72 bg-gradient-to-br from-[#FFE500]/20 to-black flex items-center justify-center">
                  <span className="text-6xl">🎁</span>
                </div>
              )}
              {/* gradient hanya di bawah, tidak pekat di tengah */}
              <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 px-4 pb-6 text-center">
                <div className="inline-block bg-[#FFE500] text-black text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full mb-2">
                  Special Promo
                </div>
                <h1 className="text-lg sm:text-2xl font-black leading-tight max-w-2xl mx-auto text-white"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)' }}>
                  {promo.judul}
                </h1>
                {(promo.tanggal_mulai || promo.tanggal_berakhir) && (
                  <p className="mt-1.5 text-white/90 text-sm font-semibold"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                    {fmtDate(promo.tanggal_mulai)} — {fmtDate(promo.tanggal_berakhir)}
                  </p>
                )}
                {isExpired && (
                  <div className="mt-3 inline-block bg-red-500/80 text-white text-xs px-3 py-1 rounded-full font-bold">
                    Promo telah berakhir
                  </div>
                )}
              </div>
            </div>

            {/* Steps Info */}
            <div className="max-w-4xl mx-auto px-4 py-8">
              <h2 className="text-center text-gray-400 text-[11px] uppercase tracking-widest mb-6 font-semibold">Cara Mendapatkan Promo</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { n: '1', label: 'Beli kamera Nikon Z Series' },
                  { n: '2', label: 'Pilih produk Datacolor promo' },
                  { n: '3', label: 'Isi data & upload dokumen' },
                  { n: '4', label: 'Transfer & terima barang' },
                ].map(s => (
                  <div key={s.n} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-[#FFE500] text-black text-sm font-black flex items-center justify-center mx-auto mb-3">{s.n}</div>
                    <p className="text-xs text-gray-600 leading-snug font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-5xl mx-auto px-4 pb-16">
              <h2 className="text-center text-gray-400 text-[11px] uppercase tracking-widest mb-8 font-semibold">Produk Promo</h2>
              {items.length === 0 ? (
                <div className="text-center text-gray-400 py-12">Belum ada produk tersedia</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map(item => {
                    const habis = item.stock !== null && item.stock <= 0;
                    const disc = Math.round((1 - item.harga_promo / item.harga_normal) * 100);
                    return (
                      <div key={item.id} className={`bg-white border rounded-2xl overflow-hidden flex flex-col transition-all shadow-sm ${habis ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:border-[#FFE500] hover:shadow-md'}`}>
                        {/* Gambar */}
                        <div className="relative bg-gray-50 aspect-[4/3] overflow-hidden">
                          {item.gambar_url ? (
                            <img src={driveThumb(item.gambar_url) || item.gambar_url} alt={item.nama_barang}
                              className="w-full h-full object-contain p-3" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-200 text-4xl">📦</div>
                          )}
                          {disc > 0 && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                              -{disc}%
                            </div>
                          )}
                          {habis && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-full">STOK HABIS</span>
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-4 flex flex-col flex-1 gap-2">
                          <div className="text-[10px] text-gray-400 font-mono">{item.kode_barang}</div>
                          <h3 className="font-bold text-sm leading-snug text-gray-900">{item.nama_barang}</h3>
                          {item.spek && (
                            <p className="text-xs text-gray-400 leading-relaxed flex-1">{item.spek}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-300 line-through text-xs">{fmtRp(item.harga_normal)}</span>
                            {item.stock !== null && (
                              <span className="text-[10px] text-gray-300 ml-auto">Stok: {item.stock}</span>
                            )}
                          </div>
                          <div className="text-gray-900 font-black text-lg">{fmtRp(item.harga_promo)}</div>
                          <button
                            disabled={habis || isExpired}
                            onClick={() => { setSelectedItem(item); setStep('form'); setErr(''); }}
                            className={`mt-1 w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                              habis || isExpired
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-[#FFE500] text-black hover:bg-yellow-300 active:scale-95'
                            }`}>
                            {habis ? 'Stok Habis' : isExpired ? 'Promo Berakhir' : 'Beli Sekarang →'}
                          </button>
                        </div>
                      </div>
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
          </>
        )}

        {/* ════ STEP: FORM DATA PEMBELI ════ */}
        {step === 'form' && selectedItem && (
          <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Progress */}
            <StepIndicator current={1} />

            {/* Selected product summary */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex gap-4 mb-6">
              {selectedItem.gambar_url && (
                <img src={driveThumb(selectedItem.gambar_url) || selectedItem.gambar_url} alt={selectedItem.nama_barang}
                  className="w-16 h-16 object-contain rounded-lg bg-white shrink-0" />
              )}
              <div>
                <div className="text-[10px] text-gray-400 font-mono">{selectedItem.kode_barang}</div>
                <div className="font-bold text-sm text-gray-900">{selectedItem.nama_barang}</div>
                <div className="text-gray-900 font-black">{fmtRp(selectedItem.harga_promo)}</div>
              </div>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-5">
              <h2 className="text-lg font-black mb-4">Data Pembelian</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Nama Pembeli *">
                  <input required value={nama} onChange={e => setNama(e.target.value)}
                    placeholder="Nama lengkap" className={inputCls} />
                </FormField>
                <FormField label="Nomor WhatsApp *">
                  <input required value={wa} onChange={e => setWa(e.target.value)}
                    placeholder="08xxxxxxxxxx" className={inputCls} />
                </FormField>
              </div>

              <FormField label="Alamat Pengiriman Lengkap *">
                <textarea required value={alamat} onChange={e => setAlamat(e.target.value)} rows={3}
                  placeholder="Nama jalan, nomor, RT/RW, kelurahan, kecamatan, kota, provinsi"
                  className={inputCls + ' resize-none'} />
              </FormField>

              <FormField label="Kode Pos">
                <input value={kodepos} onChange={e => setKodepos(e.target.value)}
                  placeholder="Contoh: 40234" maxLength={5} className={inputCls} />
              </FormField>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Dokumen Kamera Nikon Z</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <UploadField
                    label="Nota Pembelian Kamera *"
                    required
                    file={notaFile}
                    onPick={() => notaRef.current?.click()}
                    onClear={() => setNotaFile(null)}
                  />
                  <input ref={notaRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => setNotaFile(e.target.files?.[0] || null)} />

                  <UploadField
                    label="Kartu Garansi Kamera *"
                    required
                    file={garansiFile}
                    onPick={() => garansiRef.current?.click()}
                    onClear={() => setGaransiFile(null)}
                  />
                  <input ref={garansiRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => setGaransiFile(e.target.files?.[0] || null)} />
                </div>
                <p className="text-[11px] text-gray-400 mt-3">Format: JPG, PNG, PDF · Maks. 10 MB per file</p>
              </div>

              {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">{err}</div>}

              <button type="submit" disabled={sending || !notaFile || !garansiFile}
                className="w-full py-3.5 bg-[#FFE500] text-black font-black rounded-xl hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                {sending ? 'Memproses...' : 'Lanjut ke Ringkasan Pembayaran →'}
              </button>
            </form>
          </div>
        )}

        {/* ════ STEP: RINGKASAN + UPLOAD BUKTI ════ */}
        {step === 'transfer' && order && selectedItem && (
          <div className="max-w-2xl mx-auto px-4 py-8">
            <StepIndicator current={2} />

            <h2 className="text-lg font-black mb-6">Ringkasan Pembayaran</h2>

            {/* Transfer info */}
            <div className="bg-[#FFE500] rounded-2xl p-5 mb-4">
              <p className="text-xs text-black/50 uppercase tracking-wider font-semibold mb-3">Nominal Transfer</p>
              <div className="text-4xl font-black text-black mb-1">{fmtRp(order.harga_transfer)}</div>
              <div className="text-xs text-black/60 space-y-0.5 mt-2">
                <div className="flex justify-between"><span>Harga promo</span><span>{fmtRp(order.harga_promo_snapshot)}</span></div>
                <div className="flex justify-between"><span>Kode unik</span><span>+Rp {order.kode_unik}</span></div>
              </div>
              <p className="text-[10px] text-black/40 mt-3">
                ⚠️ Pastikan transfer tepat sesuai nominal di atas untuk mempermudah verifikasi.
              </p>
            </div>

            {/* Rekening tujuan */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-xs">BCA</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Transfer ke</p>
                <p className="text-lg font-black text-gray-900 tracking-widest">5910060173</p>
                <p className="text-xs text-gray-500">a.n. <span className="font-semibold text-gray-700">PT. ALTA NIKINDO</span></p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText('5910060173'); alert('No. rekening disalin!'); }}
                className="shrink-0 text-xs text-blue-500 hover:text-blue-700 font-semibold border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition">
                Salin
              </button>
            </div>

            {/* Order summary */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 space-y-3 text-sm">
              <Row label="Produk" value={order.nama_barang_snapshot} />
              <Row label="Nama Pembeli" value={order.nama_pembeli} />
              <Row label="WhatsApp" value={order.nomor_wa} />
              <Row label="Alamat" value={alamat} />
              {kodepos && <Row label="Kodepos" value={kodepos} />}
              <div className="border-t border-gray-200 pt-3">
                <Row label="No. Order" value={order.id.slice(0, 8).toUpperCase()} mono />
              </div>
            </div>

            <form onSubmit={handleSubmitBukti} className="space-y-5">
              <UploadField
                label="Upload Bukti Transfer *"
                required
                file={buktiFile}
                onPick={() => buktiRef.current?.click()}
                onClear={() => setBuktiFile(null)}
                large
              />
              <input ref={buktiRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => setBuktiFile(e.target.files?.[0] || null)} />

              {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">{err}</div>}

              <button type="submit" disabled={sending || !buktiFile}
                className="w-full py-3.5 bg-[#FFE500] text-black font-black rounded-xl hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                {sending ? 'Mengunggah...' : 'Kirim Bukti Transfer →'}
              </button>
            </form>
          </div>
        )}

        {/* ════ STEP: DONE ════ */}
        {step === 'done' && order && (
          <div className="max-w-lg mx-auto px-4 py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-black mb-2 text-gray-900">Pesanan Diterima!</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Terima kasih <span className="text-gray-900 font-semibold">{order.nama_pembeli}</span>!<br />
              Pembayaran Anda sedang kami verifikasi. Kami akan segera memproses pesanan setelah pembayaran terkonfirmasi.
            </p>

            {/* Invoice card */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 text-left space-y-3 text-sm">
              <Row label="No. Order" value={order.id.slice(0, 8).toUpperCase()} mono />
              <Row label="Produk" value={order.nama_barang_snapshot} />
              <Row label="Total Transfer" value={fmtRp(order.harga_transfer)} highlight />
              <Row label="Status" value="Menunggu Verifikasi" />
            </div>

            <div className="space-y-3">
              <a href={`/promo/invoice/${order.invoice_token}`} target="_blank"
                className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition text-sm">
                📄 Lihat E-Invoice
              </a>
              <button onClick={sendInvoiceToWA}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#22c55e] transition text-sm">
                <WhatsAppIcon /> Kirim Invoice ke WhatsApp
              </button>
              <button onClick={() => { setStep('promo'); setSelectedItem(null); setOrder(null); setNama(''); setWa(''); setAlamat(''); setKodepos(''); setNotaFile(null); setGaransiFile(null); setBuktiFile(null); }}
                className="w-full py-3 border border-gray-200 text-gray-400 font-semibold rounded-xl hover:bg-gray-50 transition text-sm">
                Kembali ke Halaman Promo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Components ──

function StepIndicator({ current }: { current: number }) {
  const steps = ['Pilih Produk', 'Data Pembeli', 'Pembayaran', 'Selesai'];
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                done ? 'bg-green-500 text-white' : active ? 'bg-[#FFE500] text-black' : 'bg-gray-100 text-gray-300'
              }`}>{done ? '✓' : n}</div>
              <span className={`text-[9px] mt-1 font-semibold whitespace-nowrap ${active ? 'text-gray-900' : done ? 'text-green-500' : 'text-gray-300'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition';

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function UploadField({ label, required, file, onPick, onClear, large }: {
  label: string; required?: boolean; file: File | null;
  onPick: () => void; onClear: () => void; large?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      {file ? (
        <div className={`flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3 ${large ? 'py-4' : ''}`}>
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-sm shrink-0 font-bold">✓</div>
          <span className="text-sm text-green-700 truncate flex-1">{file.name}</span>
          <button type="button" onClick={onClear} className="text-gray-300 hover:text-gray-500 text-xs shrink-0">✕</button>
        </div>
      ) : (
        <button type="button" onClick={onPick}
          className={`w-full border-2 border-dashed border-gray-200 hover:border-[#FFE500] rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 transition ${large ? 'py-8' : 'py-5'}`}>
          <span className="text-2xl">📎</span>
          <span className="text-xs font-semibold">{required ? 'Pilih file (wajib)' : 'Pilih file'}</span>
          <span className="text-[10px]">JPG, PNG, PDF</span>
        </button>
      )}
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`text-right ${mono ? 'font-mono text-xs' : ''} ${highlight ? 'text-gray-900 font-black' : 'text-gray-700 font-medium'}`}>{value}</span>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
