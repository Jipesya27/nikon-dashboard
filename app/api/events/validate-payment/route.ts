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
      .select('*, events:event_id(*)')
      .eq('id', registrationId)
      .single();

    if (fetchError || !reg) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (action === 'reject') {
      await supabase
        .from('event_registrations')
        .update({ status: 'Rejected', rejection_reason: rejectionReason || null })
        .eq('id', registrationId);

      await sendWhatsApp(
        reg.wa_number,
        chatbotTexts.eventRegistrationRejected(reg.full_name, reg.event_name, rejectionReason)
      );

      return NextResponse.json({ success: true, status: 'Rejected' });
    }

    // --- APPROVE: generate ticket ---
    const ticketRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId,
        fullName: reg.full_name,
        eventTitle: reg.event_name,
        eventDate: reg.event_date || reg.events?.date || '',
        eventDetail: reg.event_detail || reg.events?.detail_acara || '',
        cameraModel: reg.camera_model || '',
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
      .update({ status: 'Approved', ticket_url: ticketUrl })
      .eq('id', registrationId);

    await sendWhatsApp(
      reg.wa_number,
      chatbotTexts.eventRegistrationApproved(reg.full_name, reg.event_name, ticketUrl)
    );

    return NextResponse.json({ success: true, status: 'Approved', ticketUrl });
  } catch (err: any) {
    console.error('validate-payment error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
