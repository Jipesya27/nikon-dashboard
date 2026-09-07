import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/app/lib/session';
import { getCalendarUser, isCalendarAdmin } from '@/app/lib/calendarAuth';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['meeting', 'event', 'deadline', 'reminder', 'holiday', 'other'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// PATCH /api/calendar/events/[id] — edit satu instance event
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getCalendarUser(req);
  if (!user) return NextResponse.json({ error: 'User tidak dikenali' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();

  const { data: existing } = await supabase.from('calendar_events').select('created_by').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 });
  if (existing.created_by !== user.username && !isCalendarAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === 'string') updates.title = body.title.trim();
  if (typeof body.description === 'string') updates.description = body.description;
  if (typeof body.location === 'string') updates.location = body.location;
  if (typeof body.category === 'string' && CATEGORIES.includes(body.category)) updates.category = body.category;
  if (typeof body.visibility === 'string' && ['team', 'private'].includes(body.visibility)) updates.visibility = body.visibility;
  if (Array.isArray(body.participants)) updates.participants = (body.participants as unknown[]).map(String);
  const allDayValue = typeof body.all_day === 'boolean' ? body.all_day : undefined;
  if (allDayValue !== undefined) updates.all_day = allDayValue;
  if (typeof body.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) updates.start_date = body.start_date;
  if (typeof body.end_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.end_date)) updates.end_date = body.end_date;
  if ('start_time' in body) updates.start_time = allDayValue ? null : (body.start_time || null);
  if ('end_time' in body) updates.end_time = allDayValue ? null : (body.end_time || null);

  if (updates.start_date && updates.end_date && (updates.end_date as string) < (updates.start_date as string)) {
    return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('calendar_events').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/calendar/events/[id]?scope=series — hapus satu event atau seluruh seri berulang
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getCalendarUser(req);
  if (!user) return NextResponse.json({ error: 'User tidak dikenali' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();

  const { data: existing } = await supabase.from('calendar_events').select('created_by, series_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 });
  if (existing.created_by !== user.username && !isCalendarAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const scope = req.nextUrl.searchParams.get('scope');
  const query = scope === 'series' && existing.series_id
    ? supabase.from('calendar_events').delete().eq('series_id', existing.series_id)
    : supabase.from('calendar_events').delete().eq('id', id);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
