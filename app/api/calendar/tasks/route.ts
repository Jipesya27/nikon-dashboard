import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/app/lib/session';
import { getCalendarUser, isCalendarAdmin } from '@/app/lib/calendarAuth';

export const dynamic = 'force-dynamic';

const PRIORITIES = ['low', 'medium', 'high'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface CalendarTaskRow {
  id: string;
  created_by: string;
  assigned_to: string;
  visibility: 'team' | 'private';
  [key: string]: unknown;
}

function visibleTo(rows: CalendarTaskRow[], username: string, admin: boolean) {
  if (admin) return rows;
  return rows.filter(r => r.visibility === 'team' || r.created_by === username || r.assigned_to === username);
}

// GET /api/calendar/tasks — daftar task (opsional filter ?from=&to= berdasarkan due_date)
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
  let query = supabase.from('calendar_tasks').select('*').order('due_date', { ascending: true });
  if (from) query = query.gte('due_date', from);
  if (to) query = query.lte('due_date', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = isCalendarAdmin(user);
  return NextResponse.json(visibleTo((data ?? []) as CalendarTaskRow[], user.username, admin));
}

// POST /api/calendar/tasks — buat task baru
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
  const dueDate = String(body.due_date || '');
  if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return NextResponse.json({ error: 'Tanggal jatuh tempo tidak valid' }, { status: 400 });

  const priority = PRIORITIES.includes(String(body.priority)) ? String(body.priority) : 'medium';
  const visibility = body.visibility === 'private' ? 'private' : 'team';
  const assignedTo = String(body.assigned_to || user.username);
  const assignedToNama = String(body.assigned_to_nama || (assignedTo === user.username ? user.nama : ''));

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('calendar_tasks')
    .insert({
      created_by: user.username,
      created_by_nama: user.nama,
      title,
      description: String(body.description || ''),
      due_date: dueDate,
      due_time: body.due_time || null,
      priority,
      status: 'todo',
      assigned_to: assignedTo,
      assigned_to_nama: assignedToNama,
      visibility,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
