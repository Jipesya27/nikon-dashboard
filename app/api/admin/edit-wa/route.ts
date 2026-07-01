import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 menit

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let id_pesan: string, new_text: string;
  try {
    ({ id_pesan, new_text } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!id_pesan || !new_text?.trim()) {
    return NextResponse.json({ error: 'id_pesan dan new_text wajib diisi' }, { status: 400 });
  }

  const sbAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Ambil pesan dari DB
  const { data: pesan, error: fetchErr } = await sbAdmin
    .from('riwayat_pesan')
    .select('id_pesan, arah_pesan, wamid, waktu_pesan, jenis_pesan, url_media')
    .eq('id_pesan', id_pesan)
    .single();

  if (fetchErr || !pesan) {
    return NextResponse.json({ error: 'Pesan tidak ditemukan' }, { status: 404 });
  }

  if (pesan.arah_pesan !== 'OUT') {
    return NextResponse.json({ error: 'Hanya pesan yang dikirim (OUT) yang bisa diedit' }, { status: 400 });
  }

  if (pesan.url_media) {
    return NextResponse.json({ error: 'Pesan media tidak bisa diedit' }, { status: 400 });
  }

  // Cek window 15 menit
  const sentAt = new Date(pesan.waktu_pesan).getTime();
  if (Date.now() - sentAt > EDIT_WINDOW_MS) {
    return NextResponse.json({ error: 'Pesan hanya bisa diedit dalam 15 menit setelah dikirim' }, { status: 400 });
  }

  // Kirim edit ke Meta API jika ada wamid
  if (pesan.wamid) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    if (token && phoneNumberId) {
      const metaRes = await fetch(
        `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: pesan.wamid.split('_')[0], // tidak dipakai oleh Meta tapi required
            type: 'text',
            message_id: pesan.wamid,
            text: { body: new_text.trim() },
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!metaRes.ok) {
        const errText = await metaRes.text();
        console.error('[edit-wa] Meta API error:', metaRes.status, errText);
        // Jangan blokir — tetap update DB agar dashboard konsisten
      }
    }
  }

  // Update DB
  const { error: updateErr } = await sbAdmin
    .from('riwayat_pesan')
    .update({ isi_pesan: new_text.trim(), is_edited: true })
    .eq('id_pesan', id_pesan);

  if (updateErr) {
    return NextResponse.json({ error: 'Gagal menyimpan perubahan: ' + updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
