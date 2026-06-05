'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface LendingData {
  id_peminjaman: string;
  kode_peminjaman: string;
  nama_peminjam: string;
  items_dipinjam: Array<{
    nama_barang: string;
    nomor_seri: string;
    accs1?: string; accs2?: string; accs3?: string; accs4?: string;
    accs5?: string; accs6?: string; accs7?: string;
    status_pengembalian: string;
  }>;
  tanggal_peminjaman?: string;
  tanggal_estimasi_pengembalian?: string | null;
  status_peminjaman: string;
  status_pengiriman?: string;
  foto_kondisi_kurir?: string[] | null;
  foto_bukti_pengiriman?: string[] | null;
  foto_kondisi_penerima?: string[] | null;
  catatan_penerima?: string | null;
  tanggal_dikirim?: string | null;
  tanggal_diterima?: string | null;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function proxyImg(url: string): string {
  const m = url?.match(/[?&]id=([^&]+)/);
  if (m) return `/api/admin/proxy-img?id=${m[1]}`;
  return url || '';
}

function FotoGallery({ urls, label }: { urls: string[]; label: string }) {
  const [viewing, setViewing] = useState<string | null>(null);
  if (!urls || urls.length === 0) return <p className="text-gray-400 text-sm italic">Belum ada foto</p>;
  return (
    <>
      <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <button key={i} type="button" onClick={() => setViewing(url)} className="focus:outline-none rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <img src={proxyImg(url)} alt={`Foto ${i + 1}`} className="w-24 h-24 object-cover" onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display='none'; }} />
          </button>
        ))}
      </div>
      {viewing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proxyImg(viewing)} alt="Preview" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Inner component (uses useSearchParams)
// ────────────────────────────────────────────────────────────────

function PenerimaInner() {
  const searchParams = useSearchParams();
  const kodeParam = searchParams.get('kode') || '';

  // ── Verification form ─────────────────────────────────────
  const [kode, setKode] = useState(kodeParam.toUpperCase());
  const [waLast4, setWaLast4] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // ── Verified data ─────────────────────────────────────────
  const [lending, setLending] = useState<LendingData | null>(null);

  // ── Penerima form ─────────────────────────────────────────
  const [newFotoFiles, setNewFotoFiles] = useState<File[]>([]);
  const [catatan, setCatatan] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fotoInputRef = useRef<HTMLInputElement | null>(null);

  // ── Verify ────────────────────────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/penerima/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kode: kode.trim().toUpperCase(), wa_last4: waLast4.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setVerifyError(data.error || 'Verifikasi gagal'); return; }
      setLending(data.lending);
      if (data.lending.catatan_penerima) setCatatan(data.lending.catatan_penerima);
    } catch {
      setVerifyError('Terjadi kesalahan jaringan');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!lending) return;
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('kode', lending.kode_peminjaman);
      formData.append('wa_last4', waLast4);
      formData.append('catatan', catatan);
      for (const f of newFotoFiles) formData.append('foto_kondisi_penerima', f);

      const res = await fetch('/api/penerima/submit', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || 'Gagal submit'); return; }
      setSubmitDone(true);
      // Update local state
      setLending(prev => prev ? {
        ...prev,
        foto_kondisi_penerima: [...(prev.foto_kondisi_penerima || []), ...(newFotoFiles.map(() => ''))],
        catatan_penerima: catatan,
        status_pengiriman: 'terkirim',
      } : null);
    } catch {
      setSubmitError('Terjadi kesalahan jaringan');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Render: Verification form
  if (!lending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📦</div>
            <h1 className="text-xl font-black text-gray-900">Konfirmasi Penerimaan</h1>
            <p className="text-sm text-gray-500 mt-1">Verifikasi barang yang Anda terima</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {verifyError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{verifyError}</div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kode Peminjaman (5 karakter)</label>
              <input
                type="text"
                value={kode}
                onChange={e => setKode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                required
                maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-center font-mono font-black text-xl tracking-[0.3em] outline-none focus:border-indigo-500 uppercase"
                placeholder="— — — — —"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">4 Digit Terakhir Nomor WhatsApp</label>
              <input
                type="text"
                inputMode="numeric"
                value={waLast4}
                onChange={e => setWaLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                maxLength={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-center font-mono font-black text-xl tracking-[0.5em] outline-none focus:border-indigo-500"
                placeholder="_ _ _ _"
              />
              <p className="text-xs text-gray-400 mt-1">Contoh: jika nomor WA …5678, masukkan 5678</p>
            </div>
            <button
              type="submit"
              disabled={verifyLoading || kode.length < 5 || waLast4.length < 4}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
            >
              {verifyLoading ? 'Memverifikasi...' : 'Verifikasi'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Render: Submit success
  if (submitDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Konfirmasi Berhasil!</h2>
          <p className="text-sm text-gray-500">Data penerimaan barang telah tersimpan. Terima kasih.</p>
          <button
            onClick={() => { setSubmitDone(false); setLending(null); setNewFotoFiles([]); setCatatan(''); setKode(kodeParam.toUpperCase()); setWaLast4(''); }}
            className="mt-6 text-xs text-gray-500 hover:underline"
          >
            Kembali ke awal
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Render: Verified — show details + form
  const fotoKondisiKurir = lending.foto_kondisi_kurir || [];
  const fotoBuktiPengiriman = lending.foto_bukti_pengiriman || [];
  const fotoPenerima = lending.foto_kondisi_penerima || [];
  const alreadySubmitted = !!lending.tanggal_diterima;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-black text-gray-900 text-base leading-tight">Konfirmasi Penerimaan</h1>
            <p className="text-xs text-gray-500">Kode: <span className="font-mono font-bold text-indigo-700">{lending.kode_peminjaman}</span></p>
          </div>
          <button
            onClick={() => setLending(null)}
            className="text-xs text-gray-400 hover:text-gray-600 font-bold px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition"
          >
            ← Kembali
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* ── Informasi Peminjaman ──────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-800 border-b pb-2">Informasi Peminjaman</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Peminjam</span>
              <span className="font-medium text-gray-900">{lending.nama_peminjam}</span>
            </div>
            {lending.tanggal_estimasi_pengembalian && (
              <div className="flex justify-between">
                <span className="text-gray-500">Est. Kembali</span>
                <span className="font-medium text-gray-900">{new Date(lending.tanggal_estimasi_pengembalian).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
            {lending.tanggal_dikirim && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tgl Dikirim</span>
                <span className="font-medium text-gray-900">{new Date(lending.tanggal_dikirim).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Barang Dipinjam</p>
            <ul className="space-y-1.5">
              {lending.items_dipinjam?.map((item, idx) => {
                const accs = [item.accs1, item.accs2, item.accs3, item.accs4, item.accs5, item.accs6, item.accs7].filter(Boolean);
                return (
                  <li key={idx} className="text-sm">
                    <span className="font-medium text-gray-900">{item.nama_barang}</span>
                    <span className="text-gray-400 font-mono text-xs ml-2">SN: {item.nomor_seri}</span>
                    {accs.length > 0 && <div className="text-xs text-gray-500 mt-0.5 pl-2">• {accs.join(', ')}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── Foto dari Kurir ────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-800 border-b pb-2">Dokumentasi Pengiriman</h2>
          <FotoGallery urls={fotoKondisiKurir} label="Foto kondisi awal barang (oleh kurir)" />
          {fotoKondisiKurir.length > 0 && fotoBuktiPengiriman.length > 0 && <hr className="border-gray-100" />}
          <FotoGallery urls={fotoBuktiPengiriman} label="Foto bukti pengiriman" />
          {fotoKondisiKurir.length === 0 && fotoBuktiPengiriman.length === 0 && (
            <p className="text-sm text-gray-400 italic">Kurir belum mengunggah foto pengiriman.</p>
          )}
        </section>

        {/* ── Foto dari Penerima (sudah ada) ─────────────────── */}
        {fotoPenerima.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <FotoGallery urls={fotoPenerima} label="Foto kondisi barang diterima" />
          </section>
        )}

        {/* ── Form Konfirmasi Penerima ────────────────────────── */}
        {alreadySubmitted ? (
          <section className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <p className="font-bold text-green-800 text-sm">Konfirmasi sudah dikirim</p>
            <p className="text-xs text-green-600 mt-1">{new Date(lending.tanggal_diterima!).toLocaleString('id-ID')}</p>
            {lending.catatan_penerima && (
              <p className="text-xs text-gray-600 mt-2 italic">&ldquo;{lending.catatan_penerima}&rdquo;</p>
            )}
          </section>
        ) : (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3">Konfirmasi Penerimaan Anda</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{submitError}</div>
              )}

              {/* Foto kondisi penerima */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Foto Kondisi Barang Saat Diterima <span className="font-normal text-gray-400">(opsional, maks 3)</span>
                </label>
                {newFotoFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newFotoFiles.map((f, i) => (
                      <div key={i} className="relative w-20 h-20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setNewFotoFiles(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                {newFotoFiles.length < 3 && (
                  <>
                    <input
                      ref={fotoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setNewFotoFiles(prev => [...prev, ...files].slice(0, 3));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fotoInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-gray-600 font-bold border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 hover:border-indigo-400 hover:text-indigo-600 transition w-full justify-center"
                    >
                      📷 Ambil / Pilih Foto
                    </button>
                  </>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catatan Tambahan <span className="font-normal text-gray-400">(opsional)</span>
                </label>
                <textarea
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none"
                  placeholder="Contoh: Barang diterima dalam kondisi baik, tidak ada kerusakan..."
                />
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-60"
              >
                {submitLoading ? 'Mengirim...' : '✅ Kirim Konfirmasi Penerimaan'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Default export (Suspense wrapper for useSearchParams)
// ────────────────────────────────────────────────────────────────

export default function PenerimaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm animate-pulse">Memuat...</div>
      </div>
    }>
      <PenerimaInner />
    </Suspense>
  );
}
