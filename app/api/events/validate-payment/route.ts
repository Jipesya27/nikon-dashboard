import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chatbotTexts } from '@/app/chatbotTexts';

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
    // action: 'approve' | 'reject'

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

      await sendWhatsApp(
        reg.nomor_wa,
        chatbotTexts.eventRegistrationRejected(reg.nama_lengkap, reg.event_name, rejectionReason)
      );

      return NextResponse.json({ success: true, status: 'ditolak' });
    }

    // --- APPROVE: generate ticket ---
    // Cari base URL dgn priority: env var → VERCEL_URL → request origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || new URL(req.url).origin;

    const ticketRes = await fetch(`${baseUrl}/api/generate-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId,
        fullName: reg.nama_lengkap,
        nomorWa: reg.nomor_wa,
        eventTitle: reg.event_name,
        eventDate: eventInfo?.event_date || '',
        eventDetail: eventInfo?.event_description || '',
        cameraModel: reg.tipe_kamera || '',
        paymentType: reg.payment_type || 'regular',
      }),
    });

    if (!ticketRes.ok) {
      const err = await ticketRes.json();
      return NextResponse.json({ error: `Ticket generation failed: ${err.error}` }, { status: 500 });
    }

    const { ticketUrl } = await ticketRes.json();

    await supabase
      .from('event_registrations')
      .update({ status_pendaftaran: 'terdaftar', ticket_url: ticketUrl })
      .eq('id', registrationId);

    await sendWhatsApp(
      reg.nomor_wa,
      chatbotTexts.eventRegistrationApproved(reg.nama_lengkap, reg.event_name, ticketUrl)
    );

    return NextResponse.json({ success: true, status: 'Approved', ticketUrl });
  } catch (err: any) {
    console.error('validate-payment error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
