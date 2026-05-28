import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { sendWATemplate } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

const attempts = new Map<string, { count: number; resetAt: number }>();
function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.resetAt) { attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); return true; }
  if (e.count >= 3) return false; // strict: 3x per 15 menit
  e.count++;
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429 });
  }

  let nomor_wa: string;
  try { ({ nomor_wa } = await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  if (!nomor_wa) return NextResponse.json({ error: 'Nomor WA wajib diisi' }, { status: 400 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: karyawan } = await supabase
    .from('karyawan')
    .select('id_karyawan, nama_karyawan, nomor_wa')
    .eq('nomor_wa', nomor_wa)
    .single();

  // Always return success to prevent WA enumeration
  if (!karyawan) return NextResponse.json({ success: true });

  // Generate temp password, hash before storing
  const tempPw = Math.random().toString(36).substring(2, 10);
  const hash = await bcrypt.hash(tempPw, 12);

  await supabase.from('karyawan').update({ password: hash }).eq('id_karyawan', karyawan.id_karyawan);

  // Kirim via Meta WA template (bekerja tanpa 24h window)
  await sendWATemplate(
    karyawan.nomor_wa,
    'notif_password_reset',
    [karyawan.nama_karyawan, tempPw],
  ).catch(() => null); // fire-and-forget, jangan gagalkan request utama

  return NextResponse.json({ success: true });
}
