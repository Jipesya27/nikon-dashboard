import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['Admin', 'Super Admin', 'Finance'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getCurrentUser(req: NextRequest) {
  const identity = req.cookies.get('karyawan_identity')?.value;
  if (!identity) return null;
  const [nama, username, role = ''] = identity.split('|');
  return { nama: nama || '', username: username || '', role };
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getCurrentUser(req);
  const supabase = getSupabase();

  let query = supabase
    .from('resi_pengiriman')
    .select('*')
    .order('tanggal_kirim', { ascending: false });

  if (user && !ADMIN_ROLES.includes(user.role)) {
    query = query.eq('created_by', user.username);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const cookieUser = getCurrentUser(req);
  const createdBy   = cookieUser?.username || (body.created_by as string) || '';
  const namaPembuat = cookieUser?.nama     || (body.nama_pembuat as string) || '';
  if (!createdBy) return NextResponse.json({ error: 'User tidak dikenali' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('resi_pengiriman')
    .insert({
      created_by:    createdBy,
      nama_pembuat:  namaPembuat,
      tanggal_kirim: body.tanggal_kirim ?? new Date().toISOString().slice(0, 10),
      nama_expedisi: body.nama_expedisi ?? '',
      file_url:      body.file_url ?? '',
      file_name:     body.file_name ?? '',
      catatan:       body.catatan ?? '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
