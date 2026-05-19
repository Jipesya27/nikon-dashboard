/**
 * Dedicated endpoint untuk update/insert claim_promo.
 * Menggunakan createClient langsung (service_role) — bypass generic proxy
 * agar body JSON tidak di-mangle oleh forwarding mechanism.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { _id_claim, ...data } = body;
  const id_claim = _id_claim as string | undefined;

  if (!id_claim) {
    return NextResponse.json({ error: 'id_claim wajib diisi' }, { status: 400 });
  }

  const { error } = await sbAdmin
    .from('claim_promo')
    .update(data)
    .eq('id_claim', id_claim);

  if (error) {
    console.error('[claim-update] DB error:', JSON.stringify(error));
    return NextResponse.json(
      { error: error.message || error.details || error.hint || JSON.stringify(error) },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { error } = await sbAdmin.from('claim_promo').insert([data]);

  if (error) {
    console.error('[claim-update] DB insert error:', JSON.stringify(error));
    return NextResponse.json(
      { error: error.message || error.details || error.hint || JSON.stringify(error) },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
