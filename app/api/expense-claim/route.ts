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

function getCurrentUser(req: NextRequest): { username: string; nama: string; role: string } | null {
  const identity = req.cookies.get('karyawan_identity')?.value;
  if (!identity) return null;
  const [nama, username, role = ''] = identity.split('|');
  return { nama: nama || '', username: username || '', role };
}

// GET  /api/expense-claim  — list claims (own or all for admin)
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getCurrentUser(req);
  const supabase = getSupabase();

  let query = supabase
    .from('expense_claim')
    .select('*')
    .order('created_at', { ascending: false });

  // Non-admin: tampilkan hanya milik sendiri
  if (user && !ADMIN_ROLES.includes(user.role)) {
    query = query.eq('created_by', user.username);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/expense-claim  — buat klaim baru
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Ambil identitas dari cookie karyawan_identity, fallback ke body (untuk admin yg login via admin_session)
  const cookieUser = getCurrentUser(req);
  const createdBy   = cookieUser?.username || (body.created_by as string) || '';
  const namaPembuat = cookieUser?.nama     || (body.nama_pembuat as string) || '';
  if (!createdBy) return NextResponse.json({ error: 'User tidak dikenali' }, { status: 401 });

  const items = (body.items as { tanggal: string; description: string; nominal: number }[]) ?? [];
  const totalNominal = items.reduce((s, i) => s + (Number(i.nominal) || 0), 0);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('expense_claim')
    .insert({
      created_by:   createdBy,
      nama_pembuat: namaPembuat,
      from_person:  body.from_person ?? '',
      to_person:    body.to_person ?? '',
      claim_date:   body.claim_date ?? new Date().toISOString().slice(0, 10),
      status:       'draft',
      catatan:      body.catatan ?? '',
      items,
      receipt_urls: body.receipt_urls ?? [],
      total_nominal: totalNominal,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
