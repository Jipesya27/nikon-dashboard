import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmailStrict } from '@/app/lib/notify';
import { checkRateLimit } from '@/app/lib/rateLimit';
import { logSystemError } from '@/app/lib/errorLog';
import { generateResetToken, hashResetToken, siteOrigin, RESET_TOKEN_TTL_MS } from '@/app/lib/resetToken';

export const dynamic = 'force-dynamic';

// Balasan generik — sama persis untuk "email ketemu" dan "email tidak ketemu",
// supaya endpoint ini tidak bisa dipakai menebak email karyawan mana yang terdaftar.
const GENERIC_OK = {
  success: true,
  message: 'Jika email tersebut terdaftar, kami sudah mengirim link untuk membuat password baru. Cek inbox dan folder spam Anda.',
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function buildResetEmailHtml(nama: string, link: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#222">
  <p>Halo ${nama || 'Karyawan'},</p>
  <p>Kami menerima permintaan reset password untuk akun <b>Nikon Dashboard</b> Anda.
  Klik tombol di bawah untuk membuat password baru. Link ini berlaku <b>1 jam</b> dan hanya bisa dipakai sekali.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${link}" style="background:#FFE500;color:#000;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block">Buat Password Baru</a>
  </p>
  <p style="font-size:12px;color:#666">Kalau tombol tidak berfungsi, salin dan tempel link ini ke browser:<br>
  <span style="word-break:break-all">${link}</span></p>
  <p>Jika Anda tidak meminta reset ini, abaikan email ini — password Anda tidak berubah.</p>
</div>`;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (!(await checkRateLimit(`fp:${ip}`, 8))) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429 });
  }

  let body: { email?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 }); }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Masukkan alamat email yang valid.' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Lookup email case-insensitive
  const { data: matches } = await supabase
    .from('karyawan')
    .select('id_karyawan, nama_karyawan, email, status_aktif')
    .ilike('email', email);
  const karyawan = (matches || []).find(k => (k.email || '').trim().toLowerCase() === email);

  // Akun tidak ada / dinonaktifkan → tetap balas generik (jangan bocorkan).
  if (!karyawan || karyawan.status_aktif === false || !karyawan.email) {
    return NextResponse.json(GENERIC_OK);
  }

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  // Batalkan semua link lama yang belum dipakai, lalu simpan yang baru.
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id_karyawan', karyawan.id_karyawan)
    .is('used_at', null);

  const { error: insErr } = await supabase
    .from('password_reset_tokens')
    .insert({ id_karyawan: karyawan.id_karyawan, token_hash: hashResetToken(token), expires_at: expiresAt });

  if (insErr) {
    void logSystemError({ source: 'api:forgot-password', message: insErr.message, detail: { email } });
    return NextResponse.json({ error: 'Terjadi kesalahan di server. Coba lagi nanti.' }, { status: 500 });
  }

  const link = `${siteOrigin(req)}/reset-password?token=${token}`;

  try {
    await sendEmailStrict(
      karyawan.email,
      'Reset Password — Nikon Dashboard',
      `Halo ${karyawan.nama_karyawan || 'Karyawan'},\n\n`
        + `Kami menerima permintaan reset password untuk akun Nikon Dashboard Anda.\n\n`
        + `Buka link berikut untuk membuat password baru (berlaku 1 jam, sekali pakai):\n${link}\n\n`
        + `Jika Anda tidak meminta ini, abaikan email ini — password Anda tidak berubah.`,
      buildResetEmailHtml(karyawan.nama_karyawan || '', link),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    void logSystemError({ source: 'api:forgot-password', message: msg, detail: { email } });
    return NextResponse.json(
      { error: 'Gagal mengirim email. Coba lagi beberapa saat lagi atau hubungi Admin.' },
      { status: 502 },
    );
  }

  return NextResponse.json(GENERIC_OK);
}
