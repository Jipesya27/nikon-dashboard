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
