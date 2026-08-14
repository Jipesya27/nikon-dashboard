'use client';

import React from 'react';

export type ImportTarget = 'claim_promo' | 'garansi' | 'konsumen' | 'status_service';

export interface ImportTabProps {
  importTarget: ImportTarget;
  setImportTarget: (v: ImportTarget) => void;
  isSubmitting: boolean;
  downloadTemplate: () => void;
  handleCentralUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Ref-nya tetap punya parent karena handleCentralUpload me-reset .current.value
  // setelah upload — kalau ref di-buat lokal di sini, cleanup di parent akan
  // menunjuk instance yang salah.
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function ImportTab({
  importTarget,
  setImportTarget,
  isSubmitting,
  downloadTemplate,
  handleCentralUpload,
  fileInputRef,
}: ImportTabProps) {
  return (
    <div className="space-y-8 animate-fade-in text-gray-900">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          Pusat Upload &amp; Update Database
        </h2>
        <p className="text-gray-600 mb-6 text-sm">Pilih tabel target, unduh template untuk menyesuaikan kolom, lalu unggah file CSV Anda. Sistem akan melakukan *Upsert* (Update jika data sudah ada, Insert jika data baru).</p>
        <p className="font-semibold text-gray-800 mb-3">Urutan template yang diupload :</p>
        <ul className="list-disc list-inside text-gray-600 text-sm mb-6">
          <li>Template 1: Tabel Konsumen (Wajib jika data konsumen belum ada, jika sudah bisa lanjut ke upload lainnya)</li>
          <li>Template 2: Tabel Claim Promo</li>
          <li>Template 3: Tabel Garansi</li>
          <li>Template 2: Tabel Garansi</li>
          <li>Template 3: Tabel Claim Promo</li>
          <li>Template 4: Tabel Status Service</li>
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div>
            <label htmlFor="import-target-select" className="block text-sm font-bold mb-2">1. Pilih Tabel Database</label>
            <select id="import-target-select" value={importTarget} onChange={e => setImportTarget(e.target.value as ImportTarget)} className="w-full border border-gray-300 p-3 rounded-md bg-white text-gray-900 outline-none focus:ring-2 focus:ring-black">
              <option value="claim_promo">Tabel Claim Promo</option>
              <option value="garansi">Tabel Garansi</option>
              <option value="konsumen">Tabel Konsumen</option>
              <option value="status_service">Tabel Status Service</option>
            </select>
          </div>
          <div>
            <button onClick={downloadTemplate} className="w-full bg-gray-800 text-white p-3 rounded-md font-bold hover:bg-gray-700 transition">
              <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Unduh Template CSV
            </button>
          </div>
        </div>

        <div className="mt-10 p-10 border-2 border-dashed border-gray-300 rounded-xl text-center bg-gray-50">
          <div className="mb-4 w-14 h-14 mx-auto rounded-xl bg-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
          </div>
          <h3 className="font-bold text-lg mb-1">Upload File CSV</h3>
          <p className="text-gray-500 text-sm mb-6">Pastikan file bertipe .csv dan mengikuti format template.</p>
          <button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 transition shadow-md">
            {isSubmitting ? 'Sedang Memproses...' : 'Pilih File & Upload'}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" aria-label="Upload file CSV" onChange={handleCentralUpload} />
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Tips Penting:
        </h4>
        <ul className="text-sm text-black list-disc ml-5 space-y-1 font-medium">
          <li>Kolom ID adalah kunci utama. Jika ingin mengupdate data lama, sertakan ID aslinya.</li>
          <li>Sistem secara otomatis akan mengisi <b>created_at</b>, <b>updated_at</b>, dan men-generate ID unik jika tidak diisi.</li>
          <li>Gunakan aplikasi Excel atau Google Sheets untuk mengedit file template, lalu &quot;Save As&quot; sebagai CSV.</li>
        </ul>
      </div>
    </div>
  );
}
