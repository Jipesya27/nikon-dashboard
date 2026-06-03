import { NextResponse } from 'next/server';
import { sendNotif, sendTelegramMessage } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to') || process.env.ADMIN_EMAIL || '';
  const testTelegram = searchParams.get('telegram') === '1';

  const result: Record<string, unknown> = {
    smtp_host:              process.env.SMTP_HOST              || '❌ TIDAK ADA',
    smtp_user:              process.env.SMTP_USER              || '❌ TIDAK ADA',
    smtp_pass:              process.env.SMTP_PASS              ? `✅ ada (${process.env.SMTP_PASS.length} karakter)` : '❌ TIDAK ADA',
    admin_email:            process.env.ADMIN_EMAIL            || '❌ TIDAK ADA',
    telegram_bot_token:     process.env.TELEGRAM_BOT_TOKEN     ? '✅ ada' : '❌ TIDAK ADA',
    telegram_admin_chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID || '❌ TIDAK ADA',
    target_email:           to,
  };

  if (testTelegram) {
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
    if (!chatId) {
      return NextResponse.json({ error: 'TELEGRAM_ADMIN_CHAT_ID tidak dikonfigurasi', env: result });
    }
    try {
      await sendTelegramMessage(chatId, '✅ Test notifikasi Telegram dari sistem Nikon.\n\nJika pesan ini masuk, konfigurasi Telegram berfungsi dengan benar.');
      return NextResponse.json({ success: true, sent_to_telegram: chatId, env: result });
    } catch (e) {
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e), env: result }, { status: 500 });
    }
  }

  if (!to) {
    return NextResponse.json({ error: 'Tambahkan ?to=email@kamu.com atau ?telegram=1', env: result });
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
