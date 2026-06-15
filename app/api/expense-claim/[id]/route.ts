import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, parseIdentityCookieUnsafe } from '@/app/lib/session';
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
  const raw = req.cookies.get('karyawan_identity')?.value ?? '';
  return parseIdentityCookieUnsafe(raw);
}

// PATCH /api/expense-claim/[id]  — update klaim
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const user = getCurrentUser(req);
  const supabase = getSupabase();

  // Pastikan record milik user (kecuali admin)
  if (user && !ADMIN_ROLES.includes(user.role)) {
    const { data: existing } = await supabase
      .from('expense_claim').select('created_by').eq('id', id).single();
    if (!existing || existing.created_by !== user.username) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Hitung ulang total jika items diubah
  const updates: Record<string, unknown> = { ...body };
  if (body.items) {
    const items = body.items as { nominal: number }[];
    updates.total_nominal = items.reduce((s, i) => s + (Number(i.nominal) || 0), 0);
  }

  const { data, error } = await supabase
    .from('expense_claim')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/expense-claim/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const user = getCurrentUser(req);
  const supabase = getSupabase();

  if (user && !ADMIN_ROLES.includes(user.role)) {
    const { data: existing } = await supabase
      .from('expense_claim').select('created_by').eq('id', id).single();
    if (!existing || existing.created_by !== user.username) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { error } = await supabase.from('expense_claim').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
