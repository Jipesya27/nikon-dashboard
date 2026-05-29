import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

async function isAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore);
}

// GET — insert test gratis event
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized — login ke dashboard dulu.' }, { status: 401 });
  }

  try {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('events')
      .insert({
        event_title: 'Nikon Goes To Campus - ISBI Bandung',
        event_date: '05 Jun 2026',
        event_price: 'Gratis',
        event_image: null,
        event_description: 'Event gratis Nikon Goes To Campus di ISBI Bandung. Event test — bisa dihapus setelah konfirmasi.',
        event_partisipant_stock: 200,
        event_status: 'In stock',
        event_payment_tipe: 'gratis',
        event_speaker: 'Uki',
        event_speaker_genre: 'Videographer',
        bank_info: null,
        deposit_amount: null,
      })
      .select('id, event_title, event_payment_tipe, event_status')
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: error.hint || null,
        code: error.code,
        advice: error.message.includes('constraint')
          ? 'Constraint belum difix. Jalankan SQL di Supabase Dashboard → SQL Editor.'
          : 'Cek Vercel logs untuk detail.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Event gratis berhasil dibuat! Cek tab Master Event di dashboard.',
      event: data,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

// DELETE — hapus event test
export async function DELETE() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('events')
      .delete()
      .ilike('event_title', '%ISBI Bandung%');

    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true, message: 'Event test dihapus.' });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
