import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Fonnte webhook payload structure
    const {
      message_type,
      phone,
      sender,
      message,
      timestamp,
      is_group,
    } = body;

    // Only process incoming text messages from individual contacts
    if (message_type !== 'incoming_message' || is_group) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Normalize phone number (remove non-digits, add country code if needed)
    const nomor_wa = phone.replace(/\D/g, '');
    const normalizedWa = nomor_wa.startsWith('62') ? nomor_wa : `62${nomor_wa.slice(-12)}`;

    // Save incoming message to database
    const { error } = await supabase.from('riwayat_pesan').insert([{
      nomor_wa: normalizedWa,
      nama_profil_wa: sender || normalizedWa,
      arah_pesan: 'IN',
      isi_pesan: message,
      waktu_pesan: new Date(timestamp * 1000).toISOString(),
      bicara_dengan_cs: false,
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.error('[WEBHOOK] Error saving incoming message:', error);
      return NextResponse.json(
        { error: 'Failed to save message', details: error.message },
        { status: 500 }
      );
    }

    console.log('[WEBHOOK] Incoming message saved:', {
      nomor_wa: normalizedWa,
      sender,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
    });

    return NextResponse.json({ success: true, message: 'Message saved' }, { status: 200 });
  } catch (error: unknown) {
    console.error('[WEBHOOK] Error processing WhatsApp webhook:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' }, { status: 200 });
}
