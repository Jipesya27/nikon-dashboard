import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/app/lib/session';
import { getCalendarUser, isCalendarAdmin } from '@/app/lib/calendarAuth';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['meeting', 'event', 'deadline', 'reminder', 'holiday', 'other'];
const MAX_REPEAT = 52;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface CalendarEventRow {
  id: string;
  created_by: string;
  visibility: 'team' | 'private';
  [key: string]: unknown;
}

function visibleTo(rows: CalendarEventRow[], username: string, admin: boolean) {
  if (admin) return rows;
  return rows.filter(r => r.visibility === 'team' || r.created_by === username);
}

// GET /api/calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getCalendarUser(req);
  if (!user) return NextResponse.json({ error: 'User tidak dikenali' }, { status: 401 });

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const supabase = getSupabase();
  let query = supabase.from('calendar_events').select('*').order('start_date', { ascending: true });
  // Event overlap rentang [from, to]: start_date <= to AND end_date >= from
  if (to) query = query.lte('start_date', to);
  if (from) query = query.gte('end_date', from);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = isCalendarAdmin(user);
  return NextResponse.json(visibleTo((data ?? []) as CalendarEventRow[], user.username, admin));
}

// POST /api/calendar/events — buat event baru (mendukung pengulangan mingguan/bulanan)
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getCalendarUser(req);
  if (!user) return NextResponse.json({ error: 'User tidak dikenali' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const title = String(body.title || '').trim();
  const startDate = String(body.start_date || '');
  const endDate = String(body.end_date || startDate);
  if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return NextResponse.json({ error: 'Tanggal mulai tidak valid' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return NextResponse.json({ error: 'Tanggal selesai tidak valid' }, { status: 400 });
  if (endDate < startDate) return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }, { status: 400 });

  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : 'other';
  const visibility = body.visibility === 'private' ? 'private' : 'team';
  const allDay = !!body.all_day;
  const repeat = ['weekly', 'monthly'].includes(String(body.repeat)) ? String(body.repeat) : 'none';
  const repeatCount = Math.min(Math.max(parseInt(String(body.repeat_count ?? 1), 10) || 1, 1), MAX_REPEAT);
  const participants = Array.isArray(body.participants) ? (body.participants as unknown[]).map(String) : [];

  const base = {
    created_by: user.username,
    created_by_nama: user.nama,
    title,
    description: String(body.description || ''),
    location: String(body.location || ''),
    category,
    all_day: allDay,
    start_time: allDay ? null : (body.start_time || null),
    end_time: allDay ? null : (body.end_time || null),
    visibility,
    participants,
  };

  const daySpan = (new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / 86400000;
  const seriesId = repeat !== 'none' && repeatCount > 1 ? randomUUID() : null;

  const rows = [];
  for (let i = 0; i < (repeat === 'none' ? 1 : repeatCount); i++) {
    const start = new Date(startDate + 'T00:00:00');
    if (repeat === 'weekly') start.setDate(start.getDate() + i * 7);
    if (repeat === 'monthly') start.setMonth(start.getMonth() + i);
    const end = new Date(start);
    end.setDate(end.getDate() + daySpan);
    rows.push({
      ...base,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      series_id: seriesId,
    });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('calendar_events').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
