// Generate & download file .ics (iCalendar) untuk satu event kalender — bisa diimpor
// ke Google Calendar / Outlook / Apple Calendar.

export interface IcsSourceEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  all_day: boolean;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  start_time?: string | null; // HH:MM[:SS]
  end_time?: string | null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIcsDate(date: string): string {
  return date.replace(/-/g, '');
}

function toIcsDateTime(date: string, time: string): string {
  const [h = '00', m = '00', s = '00'] = time.split(':');
  return `${toIcsDate(date)}T${pad(+h)}${pad(+m)}${pad(+s)}`;
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** ICS pakai tanggal akhir exclusive untuk all-day event, jadi +1 hari dari end_date. */
function nextDay(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildIcsForEvent(ev: IcsSourceEvent): string {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  let dtStart: string;
  let dtEnd: string;
  let dtLine: string;
  if (ev.all_day) {
    dtStart = toIcsDate(ev.start_date);
    dtEnd = toIcsDate(nextDay(ev.end_date));
    dtLine = `DTSTART;VALUE=DATE:${dtStart}\r\nDTEND;VALUE=DATE:${dtEnd}`;
  } else {
    dtStart = toIcsDateTime(ev.start_date, ev.start_time || '00:00');
    dtEnd = toIcsDateTime(ev.end_date, ev.end_time || ev.start_time || '00:00');
    dtLine = `DTSTART;TZID=Asia/Jakarta:${dtStart}\r\nDTEND;TZID=Asia/Jakarta:${dtEnd}`;
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alta Nikindo//Kalender Tim//ID',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@altanikindo.com`,
    `DTSTAMP:${dtstamp}`,
    dtLine,
    `SUMMARY:${escapeIcsText(ev.title)}`,
    ev.description ? `DESCRIPTION:${escapeIcsText(ev.description)}` : '',
    ev.location ? `LOCATION:${escapeIcsText(ev.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
