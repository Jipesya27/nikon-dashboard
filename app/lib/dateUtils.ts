const TZ = 'Asia/Jakarta';

export function formatDate(date: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(date: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...opts });
}

export function formatTime(date: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', ...opts });
}

const _ID_MONTH: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};

/**
 * Format kolom tanggal free-text (data historis campur: ISO "2026-07-25",
 * "5 Juni 2026", atau "05 Jun 2026") menjadi "DD MMM YYYY" (bulan Inggris) yang konsisten.
 * Dipakai untuk `events.event_date`, `garansi.tanggal_pembelian`, dll.
 * Kalau tidak bisa di-parse, kembalikan string aslinya.
 */
export function formatEventDate(str?: string | null): string {
  if (!str) return str || '';
  const iso = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  let d: Date | null = iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : null;
  if (!d) {
    const p = str.trim().toLowerCase().split(/\s+/);
    if (p.length >= 3 && _ID_MONTH[p[1]] !== undefined) {
      d = new Date(parseInt(p[2], 10), _ID_MONTH[p[1]], parseInt(p[0], 10));
    }
  }
  if (!d || isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' });
}

export function nowJakarta(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

export function todayISOString(): string {
  const d = nowJakarta();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
