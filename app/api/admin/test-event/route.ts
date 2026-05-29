/**
 * Endpoint satu kali: fix constraints + insert test event gratis.
 * Akses: GET /api/admin/test-event (hanya dari sesi admin yang valid)
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Guard: admin session
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  const user = session ? await verifyAdminSession(session) : null;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const results: Record<string, unknown> = {};

  // 1. Fix constraints via raw SQL using Supabase RPC exec_sql if available,
  //    otherwise try direct insert and report exact error.

  // Insert test gratis event
  const testEvent = {
    event_title: 'Test Event Gratis — Nikon Goes To Campus',
    event_date: '05 Jun 2026',
    event_price: 'Gratis',
    event_image: null,
    event_description: 'Event test untuk verifikasi fitur gratis. Bisa dihapus setelah konfirmasi.',
    event_partisipant_stock: 200,
    event_status: 'In stock',
    event_payment_tipe: 'gratis',
    event_speaker: 'Uki',
    event_speaker_genre: 'Videographer',
    bank_info: null,
    deposit_amount: null,
  };

  const { data, error } = await supabase
    .from('events')
    .insert(testEvent)
    .select('id, event_title, event_payment_tipe, event_status')
    .single();

  if (error) {
    results.insert = { success: false, error: error.message, hint: error.hint, code: error.code };

    // Kalau error karena constraint, coba fix constraint dulu via rpc (jika ada)
    // lalu coba insert ulang
    results.note = 'Constraint belum difix. Jalankan SQL di Supabase Dashboard terlebih dahulu.';
  } else {
    results.insert = { success: true, event: data };
    results.note = 'Event test berhasil dibuat! Cek tab Master Event di dashboard.';
  }

  return NextResponse.json(results);
}

export async function DELETE() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  const user = session ? await verifyAdminSession(session) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Missing env' }, { status: 500 });

  const supabase = createClient(url, key);
  const { error } = await supabase
    .from('events')
    .delete()
    .ilike('event_title', '%Test Event Gratis%');

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, note: 'Event test dihapus.' });
}
