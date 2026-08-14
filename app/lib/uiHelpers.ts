import React from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export interface SortConfig { column: string; direction: SortDirection; }

/**
 * Toggle sort helper — kalau kolom yang sama diklik dua kali, arah dibalik.
 * Sudah dipakai di ClaimsTab, LendingTab, dan blok inline lama di dashboard/page.tsx.
 */
export function handleSort(
  sortConfig: SortConfig,
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>,
  column: string,
): void {
  let direction: SortDirection = 'asc';
  if (sortConfig.column === column && sortConfig.direction === 'asc') {
    direction = 'desc';
  }
  setSortConfig({ column, direction });
}

/**
 * Ambil pesan yang bisa dibaca manusia dari error apa pun.
 *
 * `String(err)` menghasilkan "[object Object]" untuk error non-Error — termasuk
 * PostgrestError dari Supabase, yang justru bentuk error paling sering muncul di
 * dashboard. Helper ini memeriksa field khas PostgREST (message/details/hint/code)
 * sebelum menyerah ke JSON.
 */
export function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    for (const key of ['message', 'details', 'hint', 'error_description', 'error']) {
      const v = e[key];
      if (typeof v === 'string' && v.trim()) {
        return typeof e.code === 'string' && e.code ? `${v} (${e.code})` : v;
      }
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch { /* struktur circular — jatuh ke fallback di bawah */ }
  }
  return String(err);
}

/**
 * Konversi Google Drive URL ke proxy lokal agar gambar bisa tampil di dashboard.
 * drive.google.com tidak bisa di-load langsung karena CORS + domain whitelist Next.js.
 * Sama persis dengan versi lama di dashboard/page.tsx, EventReport.tsx, nikon/page.tsx —
 * penggabungan bertahap; jangan ubah semantiknya sebelum semua caller migrate.
 */
export function driveImgSrc(url?: string | null): string {
  if (!url) return '';
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{10,})\//);
  if (m) return `/api/events/image?id=${m[1]}`;
  return url;
}
