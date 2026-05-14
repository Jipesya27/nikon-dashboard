import { NextRequest, NextResponse } from 'next/server';
import { generateTicket } from '@/app/lib/generate-ticket';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.registrationId || !body.fullName || !body.eventTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await generateTicket({
      registrationId: body.registrationId,
      fullName: body.fullName,
      nomorWa: body.nomorWa,
      eventTitle: body.eventTitle,
      eventDate: body.eventDate,
      eventDetail: body.eventDetail,
      cameraModel: body.cameraModel,
      paymentType: body.paymentType,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    console.error('generate-ticket error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate ticket';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
