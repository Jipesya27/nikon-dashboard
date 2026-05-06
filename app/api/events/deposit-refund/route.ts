import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chatbotTexts } from '@/app/chatbotTexts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

async function getGoogleAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Google Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function uploadFileToGoogleDrive(file: File, fileName: string): Promise<string> {
  const accessToken = await getGoogleAccessToken();
  const metadata = { name: fileName, parents: [GOOGLE_DRIVE_FOLDER_ID] };
  const body = new FormData();
  body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  body.append('file', file);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body }
  );
  const uploadData = await uploadRes.json();
  if (!uploadData.id) throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);

  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  return `https://drive.google.com/uc?id=${uploadData.id}&export=view`;
}

async function sendWhatsApp(targetWa: string, message: string) {
  const { error } = await supabase.functions.invoke('send-wa', {
    body: { target: targetWa, message },
  });
  if (error) console.error('WA send error:', error);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const registrationId = formData.get('registrationId') as string;
    const refundFile = formData.get('refundFile') as File | null;

    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });
    }

    const { data: reg, error: fetchError } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchError || !reg) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (reg.payment_type !== 'deposit') {
      return NextResponse.json({ error: 'Registrasi ini bukan tipe deposit' }, { status: 400 });
    }

    let refundUrl: string | null = reg.deposit_refund_url || null;

    if (refundFile) {
      const ext = refundFile.name.split('.').pop();
      const fileName = `DepositRefund_${reg.wa_number}_${Date.now()}.${ext}`;
      refundUrl = await uploadFileToGoogleDrive(refundFile, fileName);
    }

    await supabase
      .from('event_registrations')
      .update({
        deposit_refund_url: refundUrl,
        deposit_refund_status: 'Processed',
      })
      .eq('id', registrationId);

    if (refundUrl) {
      await sendWhatsApp(
        reg.wa_number,
        chatbotTexts.depositRefundReady(reg.full_name, reg.event_name, refundUrl)
      );
    }

    return NextResponse.json({ success: true, refundUrl });
  } catch (err: any) {
    console.error('deposit-refund error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
