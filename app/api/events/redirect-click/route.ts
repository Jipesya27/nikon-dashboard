import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE env belum di-set.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// POST: catat 1 klik "Daftar" untuk event bertipe 'external' (redirect ke WA pihak lain).
// Dipanggil fire-and-forget dari frontend publik, tidak butuh auth — mirip endpoint submit registrasi.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { event_id?: string } | null;
    const event_id = body?.event_id?.trim();
    if (!event_id) {
      return NextResponse.json({ error: 'event_id wajib diisi.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id, redirect_click_count')
      .eq('id', event_id)
      .maybeSingle();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({ redirect_click_count: (event.redirect_click_count ?? 0) + 1 })
      .eq('id', event_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
