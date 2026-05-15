import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/fonnte-bot`;

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Ping edge function (GET)
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      results.edge_function = { ok: true, ...json };
    } else {
      results.edge_function = { ok: false, status: res.status, body: await res.text() };
    }
  } catch (err: unknown) {
    results.edge_function = { ok: false, error: (err as Error).message };
  }

  // 2. Cek last_error & last_success dari pengaturan_bot
  const { data: botRows } = await supabase
    .from('pengaturan_bot')
    .select('nama_pengaturan, description')
    .in('nama_pengaturan', ['bot_last_error', 'bot_last_success']);

  const lastErrorRow = botRows?.find(r => r.nama_pengaturan === 'bot_last_error');
  const lastSuccessRow = botRows?.find(r => r.nama_pengaturan === 'bot_last_success');

  let lastError: unknown = null;
  if (lastErrorRow?.description) {
    try { lastError = JSON.parse(lastErrorRow.description); } catch { lastError = lastErrorRow.description; }
  }
  results.last_error = lastError;
  results.last_success = lastSuccessRow?.description ?? null;

  // 3. Aktivitas bot terakhir (pesan OUT dari bot)
  const { data: lastMsg } = await supabase
    .from('riwayat_pesan')
    .select('waktu_pesan, isi_pesan, nama_profil_wa')
    .eq('arah_pesan', 'OUT')
    .order('waktu_pesan', { ascending: false })
    .limit(1)
    .maybeSingle();
  results.last_bot_reply = lastMsg ?? null;

  // 4. Aktivitas pesan masuk terakhir
  const { data: lastIn } = await supabase
    .from('riwayat_pesan')
    .select('waktu_pesan, nama_profil_wa')
    .eq('arah_pesan', 'IN')
    .order('waktu_pesan', { ascending: false })
    .limit(1)
    .maybeSingle();
  results.last_incoming = lastIn ?? null;

  // 5. Cek koneksi Fonnte (cukup HEAD ke API tanpa kirim pesan)
  try {
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 5000);
    const fonnte = await fetch('https://api.fonnte.com/validate', {
      method: 'POST',
      headers: { Authorization: process.env.FONNTE_TOKEN || 'xYsGrYetdkLXoK72dDtc' },
      signal: ctrl2.signal,
    });
    clearTimeout(t2);
    results.fonnte_api = { ok: fonnte.status < 500, status: fonnte.status };
  } catch (err: unknown) {
    results.fonnte_api = { ok: false, error: (err as Error).message };
  }

  // Tentukan overall status
  const hasRecentActivity = lastMsg?.waktu_pesan
    ? Date.now() - new Date(lastMsg.waktu_pesan).getTime() < 24 * 60 * 60 * 1000
    : false;

  results.overall = {
    edge_ok: (results.edge_function as { ok: boolean }).ok,
    fonnte_ok: (results.fonnte_api as { ok: boolean }).ok,
    has_recent_activity: hasRecentActivity,
    has_error: lastError !== null,
  };

  return NextResponse.json(results, { status: 200 });
}
