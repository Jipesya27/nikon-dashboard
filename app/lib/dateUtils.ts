const TZ = 'Asia/Jakarta';

export function formatDate(date: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric', ...opts });
}

export function formatDateTime(date: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleString('id-ID', { timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', ...opts });
}

export function formatTime(date: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', ...opts });
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
