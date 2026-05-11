import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { whatsappMessages } from '@/app/whatsappMessages';
import { generateTicket } from '@/app/lib/generate-ticket';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendWhatsApp(targetWa: string, message: string) {
  const { error } = await supabase.functions.invoke('send-wa', {
    body: { target: targetWa, message },
  });
  if (error) console.error('WA send error:', error);
}

export async function POST(req: NextRequest) {
  try {
    const { registrationId, action, rejectionReason } = await req.json();

    if (!registrationId || !action) {
      return NextResponse.json({ error: 'Missing registrationId or action' }, { status: 400 });
    }

    const { data: reg, error: fetchError } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchError || !reg) {
      console.error('Registration fetch error:', fetchError, 'id:', registrationId);
      return NextResponse.json({ error: `Registration not found: ${fetchError?.message || 'no rows'}` }, { status: 404 });
    }

    // Fetch related event manually (no FK relationship in schema)
    let eventInfo: any = null;
    if (reg.event_id) {
      const { data: ev } = await supabase.from('events').select('*').eq('id', reg.event_id).maybeSingle();
      eventInfo = ev;
    }

    if (action === 'reject') {
      await supabase
        .from('event_registrations')
        .update({ status_pendaftaran: 'ditolak', rejection_reason: rejectionReason || null })
        .eq('id', registrationId);

      try {
        await sendWhatsApp(
          reg.nomor_wa,
          whatsappMessages.eventRegistrationRejected(reg.nama_lengkap, reg.event_name, rejectionReason)
        );
      } catch (waErr) {
        console.error('WA notify (reject) failed:', waErr);
      }

      return NextResponse.json({ success: true, status: 'ditolak' });
    }

    // --- APPROVE: generate ticket directly (no HTTP roundtrip) ---
    let ticketUrl: string;
    try {
      const result = await generateTicket({
        registrationId,
        fullName: reg.nama_lengkap,
        nomorWa: reg.nomor_wa,
        eventTitle: reg.event_name,
        eventDate: eventInfo?.event_date || '',
        eventDetail: eventInfo?.event_description || '',
        cameraModel: reg.tipe_kamera || '',
        paymentType: reg.payment_type || 'regular',
      });
      ticketUrl = result.ticketUrl;
    } catch (err: any) {
      console.error('generateTicket failed:', err);
      return NextResponse.json({ error: `Ticket generation failed: ${err.message || err}` }, { status: 500 });
    }

    await supabase
      .from('event_registrations')
      .update({ status_pendaftaran: 'terdaftar', ticket_url: ticketUrl })
      .eq('id', registrationId);

    try {
      await sendWhatsApp(
        reg.nomor_wa,
        whatsappMessages.eventRegistrationApproved(reg.nama_lengkap, reg.event_name, ticketUrl)
      );
    } catch (waErr) {
      console.error('WA notify (approve) failed:', waErr);
    }

    return NextResponse.json({ success: true, status: 'terdaftar', ticketUrl });
  } catch (err: any) {
    console.error('validate-payment error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
