'use client';

import { useEffect, useRef } from 'react';

/**
 * Membuat tombol "back" browser menutup overlay (modal, viewer, panel) alih-alih
 * meninggalkan halaman — refleks utama pengguna di HP.
 *
 * Caranya: saat overlay terbuka, satu entry history "sentinel" di-push dengan URL yang
 * SAMA (jadi alamat di address bar tidak berubah — status overlay memang tidak layak
 * di-bookmark, beda dari tab yang memang masuk `?tab=`). Menekan back akan membuang
 * sentinel itu, dan kita terjemahkan menjadi "tutup overlay teratas".
 *
 * Urutan tutup mengikuti urutan buka (LIFO), jadi overlay yang paling belakangan dibuka
 * ditutup lebih dulu — sesuai yang dilihat pengguna di layar. Tidak perlu daftar prioritas
 * manual yang harus dijaga sinkron.
 */

type OverlayEntry = { id: number; close: () => void };

const stack: OverlayEntry[] = [];
let nextId = 1;
/** popstate hasil `history.back()` yang KITA picu sendiri harus diabaikan sekali. */
let pendingSelfPops = 0;
let listenerAttached = false;

function handlePopState() {
   if (pendingSelfPops > 0) { pendingSelfPops--; return; }
   const top = stack.pop();
   if (top) top.close();
   // Kalau stack kosong, ini perpindahan tab biasa — biarkan Next yang menanganinya.
}

function attachListener() {
   if (listenerAttached || typeof window === 'undefined') return;
   window.addEventListener('popstate', handlePopState);
   listenerAttached = true;
}

export function useBackGuard(isOpen: boolean, onClose: () => void) {
   // onClose sering berupa arrow function inline yang identitasnya berubah tiap render.
   // Disimpan di ref supaya effect di bawah tidak ikut re-run dan push sentinel berulang.
   const closeRef = useRef(onClose);
   useEffect(() => { closeRef.current = onClose; });

   const idRef = useRef<number | null>(null);
   const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

   useEffect(() => {
      if (!isOpen) return;
      attachListener();

      if (releaseTimer.current !== null) {
         // React StrictMode (dev) menjalankan mount → cleanup → mount. Pelepasan sentinel
         // dari invoke sebelumnya masih tertunda, jadi batalkan dan pakai ulang sentinel
         // yang sudah ada. Tanpa ini sentinel ter-push dua kali dan back butuh dua tekan.
         clearTimeout(releaseTimer.current);
         releaseTimer.current = null;
      } else {
         const id = nextId++;
         idRef.current = id;
         stack.push({ id, close: () => closeRef.current() });
         window.history.pushState({ __overlayId: id }, '', window.location.href);
      }

      return () => {
         // Ditunda satu tick supaya remount StrictMode sempat membatalkannya (lihat di atas).
         releaseTimer.current = setTimeout(() => {
            releaseTimer.current = null;
            const id = idRef.current;
            if (id === null) return;
            idRef.current = null;

            const idx = stack.findIndex(e => e.id === id);
            if (idx === -1) return; // sudah ditutup lewat tombol back — history sudah bersih

            stack.splice(idx, 1);
            // Ditutup lewat UI (klik ✕ / Batal / simpan): sentinel-nya masih nyangkut di
            // history. Buang, supaya pengguna tidak perlu menekan back sekali yang terasa
            // "tidak melakukan apa-apa".
            //
            // Hanya kalau entry teratas memang milik kita. Kalau ada pushState lain di
            // atasnya (mis. pindah tab), history.back() justru akan membatalkan navigasi itu.
            const state = window.history.state as { __overlayId?: number } | null;
            if (state?.__overlayId === id) {
               pendingSelfPops++;
               window.history.back();
            }
         }, 0);
      };
   }, [isOpen]);
}
