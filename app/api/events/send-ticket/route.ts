/**
 * POST /api/events/send-ticket
 * (Re)kirim tiket event ke satu peserta yang sudah berstatus "terdaftar".
 *
 * - Kalau tiket PDF belum ada (`ticket_url` NULL) → generate dulu lalu simpan.
 * - Kirim template Meta `notif_event_approved_v2` (kalau event punya wa_group_link)
 *   atau `notif_event_approved` — STRICT: melempar error kalau Meta menolak.
 * - Sukses → set `ticket_sent_at = now()` dan kirim email best-effort.
 *
 * Body JSON: { registrationId: string }
 * Response sukses: { success: true, ticketUrl, sentAt, wamid }
 * Response gagal kirim WA: HTTP 502 { error }  (tiket tetap tersimpan, badge = "belum terkirim")
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { generateTicket } from '@/app/lib/generate-ticket';
import { sendWATemplateStrict, sendNotif } from '@/app/lib/notify';
import { getAuditUserVerified, writeAuditLog } from '@/app/lib/audit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!(await verifyAdminSession(cookieStore))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const auditUser = await getAuditUserVerified(cookieStore);

    const { registrationId } = await req.json();
    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId wajib diisi' }, { status: 400 });
    }

    const { data: reg, error: fetchError } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchError || !reg) {
      return NextResponse.json({ error: `Peserta tidak ditemukan: ${fetchError?.message || 'no rows'}` }, { status: 404 });
    }

    if (reg.status_pendaftaran !== 'terdaftar') {
      return NextResponse.json({ error: 'Peserta belum berstatus "terdaftar". Setujui pembayaran dulu.' }, { status: 400 });
    }
    if (!reg.nomor_wa) {
      return NextResponse.json({ error: 'Peserta tidak punya nomor WhatsApp.' }, { status: 400 });
    }

    // Data event (untuk tanggal + wa_group_link)
    let eventInfo: Record<string, unknown> | null = null;
    if (reg.event_id) {
      const { data: ev } = await supabase.from('events').select('*').eq('id', reg.event_id).maybeSingle();
      eventInfo = ev;
    }
    const eventDate = (eventInfo?.event_date as string) || '';

    // Generate tiket kalau belum ada
    let ticketUrl: string = reg.ticket_url || '';
    if (!ticketUrl) {
      try {
        const result = await generateTicket({
          registrationId,
          fullName: reg.nama_lengkap,
          nomorWa: reg.nomor_wa,
          eventTitle: reg.event_name,
          eventDate,
          eventDetail: (eventInfo?.event_description as string) || '',
          cameraModel: reg.tipe_kamera || '',
          paymentType: reg.payment_type || 'regular',
        });
        ticketUrl = result.ticketUrl;
        await supabase.from('event_registrations').update({ ticket_url: ticketUrl }).eq('id', registrationId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('send-ticket generateTicket failed:', message);
        return NextResponse.json({ error: `Gagal generate tiket: ${message}` }, { status: 500 });
      }
    }

    // Kirim WA template — STRICT (tahu kalau Meta menolak)
    const waGroupLink = (eventInfo?.wa_group_link as string) || '';
    const template = waGroupLink ? 'notif_event_approved_v2' : 'notif_event_approved';
    const params = waGroupLink
      ? [reg.nama_lengkap, reg.event_name, ticketUrl, waGroupLink]
      : [reg.nama_lengkap, reg.event_name, ticketUrl];

    let wamid = '';
    try {
      wamid = await sendWATemplateStrict(reg.nomor_wa, template, params);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('send-ticket WA failed:', message);
      // Tiket tetap ada di DB, cuma belum terkirim.
      return NextResponse.json({ error: `Tiket dibuat tapi WhatsApp gagal terkirim: ${message}` }, { status: 502 });
    }

    const sentAt = new Date().toISOString();
    const actionNote = `Tiket event dikirim ke WhatsApp ${reg.nomor_wa}`;
    await supabase
      .from('event_registrations')
      .update({
        ticket_sent_at: sentAt,
        ticket_url: ticketUrl,
        last_action_by: auditUser,
        last_action_at: sentAt,
        last_action_note: actionNote,
      })
      .eq('id', registrationId);

    void writeAuditLog({
      user_name: auditUser,
      action: 'send_event_ticket',
      table_name: 'event_registrations',
      record_id: registrationId,
      new_values: { ticket_url: ticketUrl, ticket_sent_at: sentAt },
      note: actionNote,
    });

    // Email best-effort (tidak memblokir hasil)
    void sendNotif({
      email: reg.email || null,
      message: `Pendaftaran Anda untuk ${reg.event_name} telah dikonfirmasi! Tiket: ${ticketUrl}`,
      subject: `Tiket Resmi — ${reg.event_name}`,
    });

    return NextResponse.json({ success: true, ticketUrl, sentAt, wamid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('send-ticket error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
