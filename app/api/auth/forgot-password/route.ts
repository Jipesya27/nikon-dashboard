import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { sendWAOtpTemplate, sendEmailDirect } from '@/app/lib/notify';
import { checkRateLimit } from '@/app/lib/rateLimit';
import { logSystemError } from '@/app/lib/errorLog';

export const dynamic = 'force-dynamic';

/** Generate password sementara yang cryptographically secure (8 karakter alphanumeric bersih) */
function generateSecureTempPassword(): string {
  const charset = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => charset[b % charset.length]).join('');
}

function maskWa(nomor: string): string {
  const digits = nomor.replace(/\D/g, '');
  if (digits.length <= 6) return '****' + digits.slice(-2);
  return digits.slice(0, 4) + '*'.repeat(Math.max(3, digits.length - 7)) + digits.slice(-3);
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${'*'.repeat(Math.max(2, user.length - visible.length))}@${domain}`;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // Strict: hanya 6x per 15 menit per IP (2 langkah per percobaan reset)
  if (!(await checkRateLimit(`fp:${ip}`, 6))) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429 });
  }

  let body: { step?: string; username?: string; channel?: 'wa' | 'email' };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  const { step, username, channel } = body;
  if (!username) return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: karyawan } = await supabase
    .from('karyawan')
    .select('id_karyawan, nama_karyawan, nomor_wa, email')
    .eq('username', username)
    .single();

  if (!karyawan) {
    return NextResponse.json({ error: 'Username tidak ditemukan' }, { status: 404 });
  }

  // ── Step 1: lookup — tampilkan channel yang tersedia (masked) untuk dikonfirmasi user ──
  if (step === 'lookup') {
    const channels: { wa?: string; email?: string } = {};
    if (karyawan.nomor_wa) channels.wa = maskWa(karyawan.nomor_wa);
    if (karyawan.email) channels.email = maskEmail(karyawan.email);

    if (!channels.wa && !channels.email) {
      return NextResponse.json({ error: 'Tidak ada kontak terdaftar untuk akun ini. Hubungi Admin.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, channels });
  }

  // ── Step 2: send — kirim password baru ke channel yang dipilih user ──
  if (step === 'send') {
    if (channel !== 'wa' && channel !== 'email') {
      return NextResponse.json({ error: 'Channel tidak valid' }, { status: 400 });
    }
    if (channel === 'wa' && !karyawan.nomor_wa) {
      return NextResponse.json({ error: 'Nomor WhatsApp tidak terdaftar untuk akun ini.' }, { status: 400 });
    }
    if (channel === 'email' && !karyawan.email) {
      return NextResponse.json({ error: 'Email tidak terdaftar untuk akun ini.' }, { status: 400 });
    }

    const tempPw = generateSecureTempPassword();
    const hash = await bcrypt.hash(tempPw, 12);
    await supabase.from('karyawan').update({ password: hash }).eq('id_karyawan', karyawan.id_karyawan);

    try {
      if (channel === 'wa') {
        await sendWAOtpTemplate(karyawan.nomor_wa!, 'notif_kode_akun', tempPw);
      } else {
        await sendEmailDirect(
          karyawan.email!,
          'Reset Password — Nikon Dashboard',
          `Halo ${karyawan.nama_karyawan},\n\nPassword baru Anda: *${tempPw}*\n\nSegera login dan ganti password Anda. Jika Anda tidak meminta reset ini, hubungi Admin.`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void logSystemError({ source: 'api:forgot-password', message: msg, detail: { channel, username } });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'step wajib diisi (lookup|send)' }, { status: 400 });
}
