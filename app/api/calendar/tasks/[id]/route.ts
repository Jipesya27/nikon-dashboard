import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/app/lib/session';
import { getCalendarUser, isCalendarAdmin } from '@/app/lib/calendarAuth';

export const dynamic = 'force-dynamic';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'in_progress', 'done'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// PATCH /api/calendar/tasks/[id] — edit task (creator, assignee, atau admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getCalendarUser(req);
  if (!user) return NextResponse.json({ error: 'User tidak dikenali' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();

  const { data: existing } = await supabase.from('calendar_tasks').select('created_by, assigned_to').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 });
  const canEdit = existing.created_by === user.username || existing.assigned_to === user.username || isCalendarAdmin(user);
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === 'string') updates.title = body.title.trim();
  if (typeof body.description === 'string') updates.description = body.description;
  if (typeof body.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) updates.due_date = body.due_date;
  if ('due_time' in body) updates.due_time = body.due_time || null;
  if (typeof body.priority === 'string' && PRIORITIES.includes(body.priority)) updates.priority = body.priority;
  if (typeof body.visibility === 'string' && ['team', 'private'].includes(body.visibility)) updates.visibility = body.visibility;
  if (typeof body.assigned_to === 'string') updates.assigned_to = body.assigned_to;
  if (typeof body.assigned_to_nama === 'string') updates.assigned_to_nama = body.assigned_to_nama;
  if (typeof body.status === 'string' && STATUSES.includes(body.status)) {
    updates.status = body.status;
    updates.completed_at = body.status === 'done' ? new Date().toISOString() : null;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('calendar_tasks').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/calendar/tasks/[id] — hapus task (creator atau admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getCalendarUser(req);
  if (!user) return NextResponse.json({ error: 'User tidak dikenali' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();

  const { data: existing } = await supabase.from('calendar_tasks').select('created_by').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 });
  if (existing.created_by !== user.username && !isCalendarAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('calendar_tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
