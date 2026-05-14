'use client';

import { useState, useRef, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AddressFields from '@/app/components/AddressFields';

type Recipient = 'sendiri' | 'orang_lain';

type FormState = {
  // Data Diri Pendaftar (→ konsumen)
  nama_lengkap: string;
  nik: string;
  alamat_rumah: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten_kotamadya: string;
  provinsi: string;
  kodepos: string;
  // Data Penerima (→ claim_promo)
  nama_penerima_claim: string;
  nomor_wa_update: string;
  alamat_pengiriman: string;
  // Data Produk (→ claim_promo)
  tipe_barang: string;
  nomor_seri: string;
  jenis_promosi: string;
  tanggal_pembelian: string;
  nama_toko: string;
};

const EMPTY_FORM: FormState = {
  nama_lengkap: '', nik: '', alamat_rumah: '', kelurahan: '', kecamatan: '',
  kabupaten_kotamadya: '', provinsi: '', kodepos: '',
  nama_penerima_claim: '', nomor_wa_update: '', alamat_pengiriman: '',
  tipe_barang: '', nomor_seri: '', jenis_promosi: '',
  tanggal_pembelian: '', nama_toko: '',
};

function ClaimForm() {
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  const [recipient, setRecipient] = useState<Recipient>('sendiri');
  const [alamatKirimSamaRumah, setAlamatKirimSamaRumah] = useState(true);

  const [fileGaransi, setFileGaransi] = useState<File | null>(null);
  const [fileNota, setFileNota] = useState<File | null>(null);
  const [previewGaransi, setPreviewGaransi] = useState<string | null>(null);
  const [previewNota, setPreviewNota] = useState<string | null>(null);

  const refGaransi = useRef<HTMLInputElement>(null);
  const refNota = useRef<HTMLInputElement>(null);

  // Pre-fill konsumen yang sudah ada
  useEffect(() => {
    if (!phone) { setInitLoading(false); setErrorMsg('Parameter ?phone= tidak ditemukan. Buka kembali link dari WhatsApp.'); return; }
    (async () => {
      try {
        const res = await fetch(`/api/claim?phone=${encodeURIComponent(phone)}`);
        const result = await res.json();
        if (res.ok && result.konsumen) {
          setFormData(prev => ({ ...prev, ...result.konsumen }));
        } else if (!res.ok) {
          setErrorMsg(result.error || 'Gagal memuat data konsumen.');
        }
      } catch (e: any) { setErrorMsg(e.message); }
      finally { setInitLoading(false); }
    })();
  }, [phone]);

  // Saat user pilih SENDIRI: reset semua field penerima
  useEffect(() => {
    if (recipient === 'sendiri') {
      setFormData(prev => ({ ...prev, nama_penerima_claim: '', nomor_wa_update: '' }));
      setAlamatKirimSamaRumah(true);
    } else {
      setAlamatKirimSamaRumah(false);
    }
  }, [recipient]);

  // Auto-sync alamat pengiriman = alamat rumah
  useEffect(() => {
    if (alamatKirimSamaRumah) {
      const gabungan = [
        formData.alamat_rumah,
        formData.kelurahan && `Kel. ${formData.kelurahan}`,
        formData.kecamatan && `Kec. ${formData.kecamatan}`,
        formData.kabupaten_kotamadya,
        formData.provinsi,
        formData.kodepos,
      ].filter(Boolean).join(', ');
      setFormData(prev => ({ ...prev, alamat_pengiriman: gabungan }));
    }
  }, [alamatKirimSamaRumah, formData.alamat_rumah, formData.kelurahan, formData.kecamatan, formData.kabupaten_kotamadya, formData.provinsi, formData.kodepos]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, type: 'garansi' | 'nota') {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'garansi') { setFileGaransi(file); setPreviewGaransi(url); }
    else { setFileNota(file); setPreviewNota(url); }
  }

  function compressImage(file: File, maxWidthPx = 1600, qualityJpeg = 0.8): Promise<File> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        const scale = Math.min(1, maxWidthPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', qualityJpeg);
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
      img.src = blobUrl;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileGaransi || !fileNota) {
      setErrorMsg('Harap unggah kedua file (Kartu Garansi dan Nota Pembelian).');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const [compGaransi, compNota] = await Promise.all([
        compressImage(fileGaransi),
        compressImage(fileNota),
      ]);
      const fd = new FormData();
      fd.append('phone', phone);
      fd.append('recipient_type', recipient);
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      fd.append('foto_kartu_garansi', compGaransi);
      fd.append('foto_nota_pembelian', compNota);

      const res = await fetch('/api/claim', { method: 'POST', body: fd });
      if (res.status === 413) throw new Error('Ukuran file terlalu besar. Kompres foto terlebih dahulu (maks. ~3MB per file).');
      const text = await res.text();
      let result: { error?: string; success?: boolean };
      try { result = JSON.parse(text); } catch { throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`); }
      if (!res.ok) throw new Error(result.error || 'Gagal mengirim data.');
      setStep('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  }

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-gray-900" style={{ colorScheme: 'light' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Claim Berhasil Dikirim!</h2>
          <p className="text-gray-800 mb-4 font-medium">
            Data dan dokumen Anda telah kami terima. Silakan cek WhatsApp Anda untuk konfirmasi dan langkah selanjutnya.
          </p>
          <p className="text-sm text-gray-700 font-medium">Anda bisa menutup halaman ini.</p>
        </div>
      </div>
    );
  }

  // Warna solid (tebal & jelas), force light scheme via wrapper agar tidak ikut dark mode browser
  const inputCls = "w-full px-3 py-2.5 border border-gray-400 rounded-lg text-sm text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent";
  const labelCls = "block text-sm font-semibold text-gray-900 mb-1";
  const req = <span className="text-red-600">*</span>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 text-gray-900" style={{ colorScheme: 'light' }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-xl mb-3">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Form Claim Promo</h1>
          <p className="text-gray-700 text-sm mt-1 font-medium">Nikon Indonesia</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ============ SECTION 0: PILIH PENERIMA ============ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <h2 className="text-base font-semibold text-gray-800">Untuk siapa claim ini?</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${recipient === 'sendiri' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="recipient" value="sendiri" checked={recipient === 'sendiri'} onChange={() => setRecipient('sendiri')} className="hidden" />
                <div className="text-2xl mb-1">🙋</div>
                <div className="font-semibold text-sm text-gray-900">Diri Sendiri</div>
                <div className="text-xs text-gray-700 mt-0.5 font-medium">Saya yang menerima hadiah</div>
              </label>
              <label className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${recipient === 'orang_lain' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="recipient" value="orang_lain" checked={recipient === 'orang_lain'} onChange={() => setRecipient('orang_lain')} className="hidden" />
                <div className="text-2xl mb-1">🎁</div>
                <div className="font-semibold text-sm text-gray-900">Orang Lain</div>
                <div className="text-xs text-gray-700 mt-0.5 font-medium">Hadiah untuk orang lain</div>
              </label>
            </div>
          </div>

          {/* ============ SECTION 1: DATA DIRI PENDAFTAR ============ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <h2 className="text-base font-semibold text-gray-800">Data Diri Pendaftar</h2>
            </div>

            <div>
              <label className={labelCls}>Nomor WhatsApp Pendaftar</label>
              <input type="text" value={phone} readOnly className="w-full px-3 py-2.5 border border-gray-400 rounded-lg bg-gray-100 text-gray-800 font-medium text-sm" />
            </div>

            <div>
              <label className={labelCls}>Nama Lengkap (sesuai KTP) {req}</label>
              <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>
                NIK (Nomor KTP)
                <span className="text-gray-700 text-xs font-normal ml-1">(opsional)</span>
              </label>
              <input type="text" name="nik" value={formData.nik} onChange={handleChange} pattern="[0-9]{16}" title="NIK harus 16 digit" placeholder="16 digit angka (boleh dikosongkan)" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Alamat Rumah {req}</label>
              <textarea name="alamat_rumah" value={formData.alamat_rumah} onChange={handleChange} required rows={2} placeholder="Jalan, nomor rumah, RT/RW" className={inputCls + " resize-none"} />
            </div>

            <AddressFields
              values={{
                kelurahan: formData.kelurahan,
                kecamatan: formData.kecamatan,
                kabupaten_kotamadya: formData.kabupaten_kotamadya,
                provinsi: formData.provinsi,
                kodepos: formData.kodepos,
              }}
              onChange={partial => setFormData(prev => ({ ...prev, ...partial }))}
              required
              inputClassName={inputCls}
              labelClassName={labelCls}
            />
          </div>

          {/* ============ SECTION 2: DATA PENERIMA (hanya kalau ORANG LAIN) ============ */}
          {recipient === 'orang_lain' && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <h2 className="text-base font-semibold text-gray-800">Data Penerima Hadiah</h2>
              </div>

              <div>
                <label className={labelCls}>Nama Penerima Hadiah {req}</label>
                <input
                  type="text"
                  name="nama_penerima_claim"
                  value={formData.nama_penerima_claim}
                  onChange={handleChange}
                  required={recipient === 'orang_lain'}
                  placeholder="Nama lengkap penerima"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Nomor WA Penerima
                  <span className="text-gray-700 text-xs font-normal ml-1">(opsional — untuk notifikasi update status)</span>
                </label>
                <input
                  type="text"
                  name="nomor_wa_update"
                  value={formData.nomor_wa_update}
                  onChange={handleChange}
                  placeholder="Contoh: 6281234567890"
                  pattern="[0-9]{10,15}"
                  title="Nomor WA dalam format angka"
                  className={inputCls}
                />
                <p className="text-xs text-gray-700 mt-1">Kosongkan jika notifikasi tetap ke nomor Anda.</p>
              </div>
            </div>
          )}

          {/* ============ SECTION 3: DATA PRODUK ============ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">{recipient === 'orang_lain' ? 4 : 3}</div>
              <h2 className="text-base font-semibold text-gray-800">Data Produk & Pembelian</h2>
            </div>

            <div>
              <label className={labelCls}>Tipe Barang {req}</label>
              <input type="text" name="tipe_barang" value={formData.tipe_barang} onChange={handleChange} required placeholder="Contoh: Nikon Z50 Kit 16-50mm" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Nomor Seri Produk {req}</label>
              <input type="text" name="nomor_seri" value={formData.nomor_seri} onChange={handleChange} required placeholder="Tertera di body kamera/lensa/kotak" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Jenis Promosi {req}</label>
              <input type="text" name="jenis_promosi" value={formData.jenis_promosi} onChange={handleChange} required placeholder="Contoh: Cashback, Free Aksesori" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Tanggal Pembelian {req}</label>
              <input type="date" name="tanggal_pembelian" value={formData.tanggal_pembelian} onChange={handleChange} required className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Nama Toko / Dealer {req}</label>
              <input type="text" name="nama_toko" value={formData.nama_toko} onChange={handleChange} required placeholder="Nama toko tempat pembelian" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Alamat Pengiriman Hadiah {req}</label>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alamatKirimSamaRumah}
                  onChange={e => setAlamatKirimSamaRumah(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                <span className="text-xs text-gray-800 font-medium">
                  {recipient === 'sendiri' ? 'Sama dengan alamat rumah saya' : 'Kirim ke alamat rumah pendaftar (bukan penerima)'}
                </span>
              </label>
              <textarea
                name="alamat_pengiriman"
                value={formData.alamat_pengiriman}
                onChange={handleChange}
                required
                rows={3}
                disabled={alamatKirimSamaRumah}
                placeholder="Alamat lengkap tujuan pengiriman hadiah"
                className={inputCls + " resize-none disabled:bg-gray-200 disabled:text-gray-700 disabled:font-medium"}
              />
            </div>
          </div>

          {/* ============ SECTION 4: UPLOAD DOKUMEN ============ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">{recipient === 'orang_lain' ? 5 : 4}</div>
              <h2 className="text-base font-semibold text-gray-800">Upload Dokumen</h2>
            </div>

            <div>
              <label className={labelCls}>Foto Kartu Garansi {req}</label>
              <input ref={refGaransi} type="file" accept="image/*,application/pdf" onChange={e => handleFile(e, 'garansi')} className="hidden" />
              <button
                type="button"
                onClick={() => refGaransi.current?.click()}
                className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors ${fileGaransi ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
              >
                {previewGaransi && fileGaransi?.type.startsWith('image/') ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={previewGaransi} alt="preview" className="h-24 object-contain rounded" />
                    <span className="text-xs text-green-600 font-medium">{fileGaransi.name}</span>
                    <span className="text-xs text-gray-700">Ketuk untuk ganti</span>
                  </div>
                ) : fileGaransi ? (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-xs text-green-600 font-medium">{fileGaransi.name}</span>
                    <span className="text-xs text-gray-700">Ketuk untuk ganti</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-sm text-gray-800 font-medium">Ketuk untuk upload foto/PDF</span>
                    <span className="text-xs text-gray-700">Kartu Garansi dari dalam kotak produk</span>
                  </div>
                )}
              </button>
            </div>

            <div>
              <label className={labelCls}>Foto Nota Pembelian {req}</label>
              <input ref={refNota} type="file" accept="image/*,application/pdf" onChange={e => handleFile(e, 'nota')} className="hidden" />
              <button
                type="button"
                onClick={() => refNota.current?.click()}
                className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors ${fileNota ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
              >
                {previewNota && fileNota?.type.startsWith('image/') ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={previewNota} alt="preview" className="h-24 object-contain rounded" />
                    <span className="text-xs text-green-600 font-medium">{fileNota.name}</span>
                    <span className="text-xs text-gray-700">Ketuk untuk ganti</span>
                  </div>
                ) : fileNota ? (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-xs text-green-600 font-medium">{fileNota.name}</span>
                    <span className="text-xs text-gray-700">Ketuk untuk ganti</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="text-sm text-gray-800 font-medium">Ketuk untuk upload foto/PDF</span>
                    <span className="text-xs text-gray-700">Nota atau struk pembelian dari toko</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Mengirim & mengupload...
              </span>
            ) : 'Kirim Claim Promo'}
          </button>

          <p className="text-xs text-gray-700 text-center pb-4">
            Data Anda aman dan hanya digunakan untuk keperluan promo Nikon Indonesia.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent rounded-full" />
      </div>
    }>
      <ClaimForm />
    </Suspense>
  );
}
