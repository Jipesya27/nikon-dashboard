import { NextResponse } from 'next/server';
import { sendNotif } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to') || process.env.ADMIN_EMAIL || '';

  const result: Record<string, unknown> = {
    smtp_host:    process.env.SMTP_HOST    || '❌ TIDAK ADA',
    smtp_user:    process.env.SMTP_USER    || '❌ TIDAK ADA',
    smtp_pass:    process.env.SMTP_PASS    ? `✅ ada (${process.env.SMTP_PASS.length} karakter)` : '❌ TIDAK ADA',
    admin_email:  process.env.ADMIN_EMAIL  || '❌ TIDAK ADA',
    fonnte_token: process.env.FONNTE_TOKEN ? '✅ ada' : '❌ TIDAK ADA',
    target_email: to,
  };

  if (!to) {
    return NextResponse.json({ error: 'Tambahkan ?to=email@kamu.com', env: result });
  }

  try {
    await sendNotif({
      email: to,
      phone: '',
      message: 'Test notifikasi dari sistem Nikon.\n\nJika email ini masuk, berarti konfigurasi email berfungsi dengan benar ✅',
      subject: '✅ Test Notifikasi Nikon — ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    });
    return NextResponse.json({ success: true, sent_to: to, env: result });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e), env: result }, { status: 500 });
  }
}
