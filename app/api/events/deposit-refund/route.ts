import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { whatsappMessages } from '@/app/whatsappMessages';
import { uploadToGoogleDrive } from '@/app/lib/google-drive';

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

    let refundUrl: string | null = reg.bukti_pengembalian_deposit || null;

    if (refundFile) {
      const ext = refundFile.name.split('.').pop();
      const sanitize = (s: string) => (s || '').replace(/[\/\\:*?"<>|]/g, '-').substring(0, 80);
      const namePart = [reg.event_name || 'event', reg.nomor_wa || 'wa', reg.nama_lengkap || 'nama'].map(sanitize).join('_');
      const fileName = `${namePart}.${ext}`;
      const fileId = await uploadToGoogleDrive(refundFile, fileName, { folderName: 'Pengembalian Deposit' });
      refundUrl = `https://lh3.googleusercontent.com/d/${fileId}=w2000`;
    }

    await supabase
      .from('event_registrations')
      .update({ bukti_pengembalian_deposit: refundUrl, status_pengembalian_deposit: 'Processed' })
      .eq('id', registrationId);

    if (refundUrl) {
      await sendWhatsApp(
        reg.nomor_wa,
        whatsappMessages.depositRefundReady(reg.nama_lengkap, reg.event_name, refundUrl)
      );
    }

    return NextResponse.json({ success: true, refundUrl });
  } catch (err: unknown) {
    console.error('deposit-refund error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
