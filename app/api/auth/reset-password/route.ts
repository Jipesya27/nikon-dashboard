import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '@/app/lib/rateLimit';
import { logSystemError } from '@/app/lib/errorLog';
import { hashResetToken } from '@/app/lib/resetToken';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

interface TokenRow {
  id: string;
  id_karyawan: string;
  expires_at: string;
  used_at: string | null;
}

async function lookupToken(
  token: string,
): Promise<{ row: TokenRow } | { row: null; reason: string }> {
  if (!token || token.length < 20) return { row: null, reason: 'Link tidak valid.' };

  const { data } = await sb()
    .from('password_reset_tokens')
    .select('id, id_karyawan, expires_at, used_at')
    .eq('token_hash', hashResetToken(token))
    .limit(1)
    .maybeSingle<TokenRow>();

  if (!data) return { row: null, reason: 'Link tidak valid.' };
  if (data.used_at) return { row: null, reason: 'Link ini sudah pernah dipakai. Silakan minta link baru.' };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { row: null, reason: 'Link sudah kedaluwarsa (berlaku 1 jam). Silakan minta link baru.' };
  }
  return { row: data };
}

// GET /api/auth/reset-password?token=... → cek apakah link masih valid (dipakai halaman reset)
export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await checkRateLimit(`rp:${ip}`, 30))) {
    return NextResponse.json({ valid: false, reason: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
  }

  const token = new URL(req.url).searchParams.get('token') || '';
  const res = await lookupToken(token);
  if (res.row === null) return NextResponse.json({ valid: false, reason: res.reason });
  return NextResponse.json({ valid: true });
}

// POST /api/auth/reset-password  { token, password } → set password baru
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await checkRateLimit(`rp:${ip}`, 30))) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429 });
  }

  let body: { token?: string; password?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 }); }

  const token = (body.token || '').trim();
  const password = body.password || '';
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password baru minimal 8 karakter.' }, { status: 400 });
  }

  const res = await lookupToken(token);
  if (res.row === null) return NextResponse.json({ error: res.reason }, { status: 400 });
  const { row } = res;

  const supabase = sb();
  const hash = await bcrypt.hash(password, 12);
  const { error: updErr } = await supabase
    .from('karyawan')
    .update({ password: hash })
    .eq('id_karyawan', row.id_karyawan);

  if (updErr) {
    void logSystemError({ source: 'api:reset-password', message: updErr.message, detail: { id_karyawan: row.id_karyawan } });
    return NextResponse.json({ error: 'Gagal menyimpan password baru. Coba lagi.' }, { status: 500 });
  }

  // Tandai token ini terpakai + batalkan token lain milik karyawan yang sama.
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id_karyawan', row.id_karyawan)
    .is('used_at', null);

  return NextResponse.json({ success: true });
}
