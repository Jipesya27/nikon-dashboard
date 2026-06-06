'use client';

import React, { useState, useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────── types */
type EventOption = { id: string; event_title: string; event_date: string };

type FotoSlot = {
  file: File | null;
  preview: string | null;   // object URL untuk preview
  status: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;         // 0-100 simulasi
  error: string | null;
  viewUrl: string | null;
  fileName: string | null;
};

const MAX_PHOTOS = 10;

function makeFotoSlot(): FotoSlot {
  return { file: null, preview: null, status: 'idle', progress: 0, error: null, viewUrl: null, fileName: null };
}

/* ─────────────────────────────────────────────────────────── helpers */
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ─────────────────────────────────────────────────────────── component */
export default function UploadLombaPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [igAccount, setIgAccount] = useState('');
  const [fotos, setFotos] = useState<FotoSlot[]>(Array.from({ length: MAX_PHOTOS }, makeFotoSlot));
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* fetch events */
  useEffect(() => {
    fetch('/api/events/register')
      .then(r => r.json())
      .then(data => {
        const all: EventOption[] = [
          ...(data.events || []),
          ...(data.pastEvents || []),
        ].map((e: { id: string; event_title: string; event_date: string }) => ({
          id: e.id,
          event_title: e.event_title,
          event_date: e.event_date,
        }));
        setEvents(all);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, []);

  /* cleanup object URLs on unmount */
  useEffect(() => {
    return () => {
      fotos.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── file pick handler */
  const handleFilePick = (idx: number, file: File | null) => {
    if (!file) return;
    setFotos(prev => {
      const next = [...prev];
      if (next[idx].preview) URL.revokeObjectURL(next[idx].preview!);
      next[idx] = {
        ...makeFotoSlot(),
        file,
        preview: URL.createObjectURL(file),
      };
      return next;
    });
  };

  const handleRemove = (idx: number) => {
    setFotos(prev => {
      const next = [...prev];
      if (next[idx].preview) URL.revokeObjectURL(next[idx].preview!);
      next[idx] = makeFotoSlot();
      return next;
    });
    if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = '';
  };

  /* ── upload */
  const selectedFotosCount = fotos.filter(f => f.file).length;

  const handleUpload = async () => {
    setGlobalError('');
    if (!selectedEvent) { setGlobalError('Pilih nama event terlebih dahulu.'); return; }
    if (!igAccount.trim()) { setGlobalError('Masukkan akun Instagram kamu.'); return; }
    if (selectedFotosCount === 0) { setGlobalError('Pilih minimal 1 foto untuk diupload.'); return; }

    setUploading(true);
    const eventObj = events.find(e => e.id === selectedEvent);
    const eventTitle = eventObj?.event_title || selectedEvent;
    const eventDate = eventObj?.event_date || '';
    const cleanIg = igAccount.trim().replace(/^@/, '');

    let allOk = true;

    for (let i = 0; i < MAX_PHOTOS; i++) {
      const slot = fotos[i];
      if (!slot.file) continue;

      // set uploading state
      setFotos(prev => {
        const next = [...prev];
        next[i] = { ...next[i], status: 'uploading', progress: 10, error: null };
        return next;
      });

      // simulate progress while uploading
      const progressInterval = setInterval(() => {
        setFotos(prev => {
          const next = [...prev];
          if (next[i].status === 'uploading' && next[i].progress < 85) {
            next[i] = { ...next[i], progress: next[i].progress + 10 };
          }
          return next;
        });
      }, 600);

      try {
        const fd = new FormData();
        fd.append('eventName', eventTitle);
        fd.append('eventDate', eventDate);
        fd.append('igAccount', cleanIg);
        fd.append('fotoIndex', String(i + 1));
        fd.append('file', slot.file);

        const res = await fetch('/api/upload-lomba', { method: 'POST', body: fd });
        const data = await res.json();

        clearInterval(progressInterval);

        if (!res.ok || !data.success) {
          setFotos(prev => {
            const next = [...prev];
            next[i] = { ...next[i], status: 'error', progress: 0, error: data.error || 'Upload gagal.' };
            return next;
          });
          allOk = false;
        } else {
          setFotos(prev => {
            const next = [...prev];
            next[i] = { ...next[i], status: 'done', progress: 100, viewUrl: data.viewUrl, fileName: data.fileName };
            return next;
          });
        }
      } catch (err: unknown) {
        clearInterval(progressInterval);
        setFotos(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: 'error', progress: 0, error: err instanceof Error ? err.message : 'Network error.' };
          return next;
        });
        allOk = false;
      }
    }

    setUploading(false);
    if (allOk) setSubmitted(true);
  };

  const handleReset = () => {
    fotos.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFotos(Array.from({ length: MAX_PHOTOS }, makeFotoSlot));
    setSelectedEvent('');
    setIgAccount('');
    setSubmitted(false);
    setGlobalError('');
  };

  /* ── success screen */
  if (submitted) {
    const doneFotos = fotos.filter(f => f.status === 'done');
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <div className="bg-[#FFE800] inline-block px-3 py-1 font-extrabold text-black text-lg tracking-wide mb-4">NIKON</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Berhasil!</h1>
          <p className="text-gray-500 text-sm mb-6">
            {doneFotos.length} foto berhasil diupload ke Google Drive.<br />
            Terima kasih sudah berpartisipasi! 📷
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-1">
            {doneFotos.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-green-500">✓</span>
                <span className="truncate font-mono text-xs">{f.fileName}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-[#FFE800] hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition-all shadow-sm"
          >
            Upload Foto Lagi
          </button>
        </div>
      </div>
    );
  }

  /* ── main form */
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 text-lg tracking-wide">NIKON</div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Upload Foto Lomba</p>
            <p className="text-xs text-gray-400">Kirim karya terbaikmu!</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Info banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex gap-3 items-start">
          <span className="text-xl mt-0.5">📸</span>
          <div>
            <p className="font-semibold text-yellow-800 text-sm">Ketentuan Upload</p>
            <ul className="text-yellow-700 text-xs mt-1 space-y-0.5 list-disc list-inside">
              <li>Format foto: JPG, PNG, atau WEBP</li>
              <li>Ukuran maksimal per foto: 20 MB</li>
              <li>Bisa upload 1 sampai 10 foto</li>
              <li>Foto akan diubah namanya secara otomatis</li>
            </ul>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-900 text-base mb-4">Informasi Peserta</h2>

          {/* Event */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nama Event <span className="text-red-500">*</span>
            </label>
            {loadingEvents ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800] bg-white"
              >
                <option value="">— Pilih Event —</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.event_title} {ev.event_date ? `(${ev.event_date})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* IG Account */}
          <div className="mb-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Akun Instagram <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">@</span>
              <input
                type="text"
                value={igAccount}
                onChange={e => setIgAccount(e.target.value.replace(/^@/, ''))}
                placeholder="username_kamu"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFE800] focus:ring-1 focus:ring-[#FFE800]"
              />
            </div>
          </div>
        </div>

        {/* Foto slots */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-base">Upload Foto</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-medium">
              {selectedFotosCount} / {MAX_PHOTOS} dipilih
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fotos.map((slot, i) => (
              <FotoSlotCard
                key={i}
                index={i}
                slot={slot}
                uploading={uploading}
                onFilePick={handleFilePick}
                onRemove={handleRemove}
                inputRef={el => { fileInputRefs.current[i] = el; }}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {globalError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex gap-2 items-center">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-700 text-sm font-medium">{globalError}</p>
          </div>
        )}

        {/* Error per foto */}
        {fotos.some(f => f.status === 'error') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700 text-sm font-bold mb-2">Beberapa foto gagal diupload:</p>
            {fotos.map((f, i) => f.status === 'error' ? (
              <p key={i} className="text-red-600 text-xs">• Foto {i + 1}: {f.error}</p>
            ) : null)}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-3 text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition-all"
            >
              Coba Upload Ulang
            </button>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleUpload}
          disabled={uploading || selectedFotosCount === 0}
          className="w-full bg-[#FFE800] hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl text-base transition-all shadow-sm flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Sedang Upload...
            </>
          ) : (
            <>
              📤 Kirim {selectedFotosCount > 0 ? `${selectedFotosCount} Foto` : 'Foto'}
            </>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Foto akan langsung tersimpan di Google Drive panitia.
        </p>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── FotoSlotCard */
function FotoSlotCard({
  index,
  slot,
  uploading,
  onFilePick,
  onRemove,
  inputRef,
}: {
  index: number;
  slot: FotoSlot;
  uploading: boolean;
  onFilePick: (i: number, f: File | null) => void;
  onRemove: (i: number) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}) {
  const isEmpty  = !slot.file;
  const isDone   = slot.status === 'done';
  const isError  = slot.status === 'error';
  const isUpload = slot.status === 'uploading';

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={e => onFilePick(index, e.target.files?.[0] || null)}
        disabled={uploading}
      />

      {isEmpty ? (
        /* ── empty slot */
        <button
          type="button"
          onClick={() => { const el = document.querySelectorAll('input[type=file]')[index] as HTMLInputElement; el?.click(); }}
          disabled={uploading}
          className="w-full aspect-square border-2 border-dashed border-gray-300 hover:border-[#FFE800] hover:bg-yellow-50 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group disabled:opacity-40"
        >
          <span className="text-2xl text-gray-300 group-hover:text-yellow-400 transition-colors">＋</span>
          <span className="text-xs font-semibold text-gray-400 group-hover:text-yellow-600">Foto {index + 1}</span>
        </button>
      ) : (
        /* ── filled slot */
        <div className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
          isDone  ? 'border-green-400' :
          isError ? 'border-red-400'  :
          isUpload ? 'border-yellow-400' :
          'border-gray-300'
        }`}>
          {/* preview image */}
          {slot.preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slot.preview}
              alt={`Foto ${index + 1}`}
              className="w-full h-full object-cover"
            />
          )}

          {/* overlay status */}
          {isUpload && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <div className="w-3/4 bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#FFE800] rounded-full transition-all duration-300"
                  style={{ width: `${slot.progress}%` }}
                />
              </div>
              <span className="text-white text-[10px] font-bold">{slot.progress}%</span>
            </div>
          )}

          {isDone && (
            <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center">
              <div className="bg-green-500 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">✓</span>
              </div>
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
              <div className="bg-red-500 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">✕</span>
              </div>
            </div>
          )}

          {/* label + remove */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 flex items-end justify-between">
            <span className="text-white text-[10px] font-bold">Foto {index + 1}</span>
            {!isUpload && !isDone && (
              <button
                onClick={() => onRemove(index)}
                className="text-white/80 hover:text-white text-xs leading-none bg-black/40 rounded px-1 py-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* file size badge */}
          {slot.file && !isUpload && !isDone && (
            <div className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
              {formatSize(slot.file.size)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
