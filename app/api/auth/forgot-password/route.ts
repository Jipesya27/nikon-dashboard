import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { sendWAOtpTemplate } from '@/app/lib/notify';
import { checkRateLimit } from '@/app/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** Generate password sementara yang cryptographically secure (8 karakter alphanumeric bersih) */
function generateSecureTempPassword(): string {
  const charset = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => charset[b % charset.length]).join('');
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // Strict: hanya 3x per 15 menit per IP
  if (!(await checkRateLimit(`fp:${ip}`, 3))) {
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

  // Selalu return success untuk mencegah WA enumeration
  if (!karyawan) return NextResponse.json({ success: true });

  const tempPw = generateSecureTempPassword();
  const hash = await bcrypt.hash(tempPw, 12);

  await supabase.from('karyawan').update({ password: hash }).eq('id_karyawan', karyawan.id_karyawan);

  // Kirim via Meta WA AUTHENTICATION template (COPY_CODE button)
  await sendWAOtpTemplate(
    karyawan.nomor_wa,
    'notif_kode_akun',
    tempPw,
  ).catch(() => null);

  return NextResponse.json({ success: true });
}
