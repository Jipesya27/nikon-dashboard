import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/app/lib/notify';
import { createClient } from '@supabase/supabase-js';

async function getTelegramChatId(): Promise<string> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );
    const { data } = await sb
      .from('pengaturan_bot')
      .select('description')
      .eq('nama_pengaturan', 'telegram_admin_chat_id')
      .maybeSingle();
    return data?.description || process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  } catch {
    return process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-notify-secret');
  if (secret !== process.env.INTERNAL_NOTIFY_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const chatId = await getTelegramChatId();
  if (!chatId) return NextResponse.json({ ok: false, error: 'Telegram chat ID not configured' }, { status: 500 });

  try {
    await sendTelegramMessage(chatId, message);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
