export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Rentang tanggal grid bulan (42 sel, mulai Minggu — standar internasional) — dipakai untuk fetch range yang cocok dengan MonthGrid. */
export function monthGridBounds(year: number, month: number): { from: string; to: string } {
  const firstOfMonth = new Date(year, month, 1);
  const offset = firstOfMonth.getDay(); // Minggu = 0
  const gridStart = new Date(year, month, 1 - offset);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  return { from: ymd(gridStart), to: ymd(gridEnd) };
}

/** Tambah jam ke string 'HH:MM', membungkus lewat tengah malam. Untuk saran jam selesai. */
export function addHoursToTime(time: string, hours: number): string {
  const [h = '0', m = '0'] = time.split(':');
  const total = ((parseInt(h, 10) * 60 + parseInt(m, 10)) + hours * 60 + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function formatIdDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

export function formatIdDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}
