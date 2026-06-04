import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { sendTelegramMessage } from '@/app/lib/notify';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function fmtDate(iso?: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function getTelegramChatId(): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data } = await supabase
      .from('pengaturan_bot')
      .select('description')
      .eq('nama_pengaturan', 'telegram_admin_chat_id')
      .single();
    return data?.description || process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  } catch {
    return process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    type: 'pinjam' | 'kembali';
    nama_peminjam: string;
    nomor_wa: string;
    items: { nama_barang: string; nomor_seri: string; accs?: string[]; catatan_pengembalian?: string }[];
    tanggal_peminjaman?: string;
    tanggal_estimasi?: string;
    tanggal_pengembalian?: string;
    status_akhir?: 'aktif' | 'selesai';
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const chatId = await getTelegramChatId();
  if (!chatId) {
    return NextResponse.json({ ok: false, reason: 'Telegram chat ID not configured' });
  }

  let message = '';

  if (body.type === 'pinjam') {
    const itemLines = body.items.map((item, i) => {
      let line = `${i + 1}. *${item.nama_barang}* — SN: ${item.nomor_seri}`;
      if (item.accs && item.accs.length > 0) line += `\n   _Aksesori: ${item.accs.join(', ')}_`;
      return line;
    }).join('\n');

    message =
      `📦 *Peminjaman Baru!*\n\n` +
      `👤 *Nama:* ${body.nama_peminjam}\n` +
      `📱 *WhatsApp:* ${body.nomor_wa}\n` +
      `📅 *Tgl Pinjam:* ${fmtDate(body.tanggal_peminjaman)}\n` +
      `📅 *Est. Kembali:* ${fmtDate(body.tanggal_estimasi)}\n\n` +
      `*Barang Dipinjam:*\n${itemLines}\n\n` +
      `Cek di Dashboard → tab Peminjaman`;
  } else {
    const itemLines = body.items.map((item, i) => {
      let line = `${i + 1}. *${item.nama_barang}* — SN: ${item.nomor_seri}`;
      if (item.catatan_pengembalian) line += `\n   _Catatan: ${item.catatan_pengembalian}_`;
      return line;
    }).join('\n');

    const statusLabel = body.status_akhir === 'selesai'
      ? '✅ Semua barang telah dikembalikan'
      : '⚠️ Pengembalian sebagian';

    message =
      `✅ *Pengembalian Barang!*\n\n` +
      `👤 *Nama:* ${body.nama_peminjam}\n` +
      `📱 *WhatsApp:* ${body.nomor_wa}\n` +
      `📅 *Tgl Kembali:* ${fmtDate(body.tanggal_pengembalian)}\n` +
      `📊 *Status:* ${statusLabel}\n\n` +
      `*Barang Dikembalikan:*\n${itemLines}\n\n` +
      `Cek di Dashboard → tab Peminjaman`;
  }

  await sendTelegramMessage(chatId, message);
  return NextResponse.json({ ok: true });
}
