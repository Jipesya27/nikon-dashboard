import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getContactsAccessToken(): Promise<string | null> {
  const refreshToken = process.env.GOOGLE_CONTACTS_REFRESH_TOKEN;
  if (!refreshToken) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(7000),
    });
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function saveToGoogleContacts(phone: string, name: string): Promise<void> {
  const token = await getContactsAccessToken();
  if (!token) return;

  const e164 = `+${phone}`;
  const displayName = name && name !== phone ? name : `WA ${phone}`;

  await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      names: [{ givenName: displayName }],
      phoneNumbers: [{ value: e164, type: 'mobile' }],
    }),
    signal: AbortSignal.timeout(10000),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { message_type, phone, sender, message, timestamp, is_group } = body;

    if (message_type !== 'incoming_message' || is_group) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const nomor_wa = phone.replace(/\D/g, '');
    const normalizedWa = nomor_wa.startsWith('62') ? nomor_wa : `62${nomor_wa.slice(-12)}`;

    // Cek apakah nomor ini sudah pernah kirim pesan sebelumnya
    const { count } = await supabase
      .from('riwayat_pesan')
      .select('nomor_wa', { count: 'exact', head: true })
      .eq('nomor_wa', normalizedWa);

    const isNewContact = (count ?? 0) === 0;

    // Simpan pesan masuk
    const { error } = await supabase.from('riwayat_pesan').insert([{
      nomor_wa: normalizedWa,
      nama_profil_wa: sender || normalizedWa,
      arah_pesan: 'IN',
      isi_pesan: message,
      waktu_pesan: new Date(timestamp * 1000).toISOString(),
      bicara_dengan_cs: false,
      created_at: new Date().toISOString(),
    }]);

    if (error) {
      console.error('[WEBHOOK] Error saving incoming message:', error);
      return NextResponse.json({ error: 'Failed to save message', details: error.message }, { status: 500 });
    }

    // Kalau kontak baru → simpan ke Google Contacts (non-blocking)
    if (isNewContact) {
      saveToGoogleContacts(normalizedWa, sender || '').catch(e =>
        console.error('[WEBHOOK] Google Contacts sync failed:', e)
      );
      console.log('[WEBHOOK] New contact detected, syncing to Google Contacts:', normalizedWa);
    }

    console.log('[WEBHOOK] Message saved:', {
      nomor_wa: normalizedWa,
      sender,
      isNewContact,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
    });

    return NextResponse.json({ success: true, message: 'Message saved' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WEBHOOK] Error processing WhatsApp webhook:', message);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' }, { status: 200 });
}
