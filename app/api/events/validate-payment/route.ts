import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_TEMPLATES, applyTemplate, loadChatbotTemplates } from '@/app/lib/chatbotTemplate';
import { generateTicket } from '@/app/lib/generate-ticket';
import { sendNotif } from '@/app/lib/notify';

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

function buildApprovalEmailHtml(opts: {
  nama: string;
  eventTitle: string;
  eventDate: string;
  ticketUrl: string;
  nomorWa: string;
  tipeKamera: string;
  registrationId: string;
}): string {
  const { nama, eventTitle, eventDate, ticketUrl, nomorWa, tipeKamera, registrationId } = opts;
  const ticketNo = `EVT-${registrationId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tiket Resmi — ${eventTitle}</title></head>
<body style="margin:0;padding:20px 8px;background:#1a1a1a;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:580px;margin:0 auto">

  <!-- Header -->
  <div style="background:#111;padding:20px 24px 16px;border-radius:12px 12px 0 0;text-align:center">
    <div style="display:inline-block;background:#FFE000;padding:4px 14px;border-radius:4px;margin-bottom:10px">
      <span style="font-size:18px;font-weight:900;color:#000;letter-spacing:3px">NIKON</span>
    </div>
    <p style="color:#ccc;font-size:12px;margin:0;letter-spacing:1px;text-transform:uppercase">Tiket Resmi Event</p>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:28px 24px">

    <!-- Status approved -->
    <div style="background:#E8F5E9;border:1px solid #4CAF50;border-radius:8px;padding:14px 16px;margin-bottom:20px;text-align:center">
      <p style="margin:0 0 4px;font-size:15px;font-weight:900;color:#2E7D32">✅ Pendaftaran Anda DITERIMA!</p>
      <p style="margin:0;font-size:12px;color:#388E3C">Pembayaran telah diverifikasi. Tiket resmi Anda tersedia di bawah.</p>
    </div>

    <h1 style="font-size:20px;font-weight:900;color:#111;margin:0 0 6px;line-height:1.3">${eventTitle}</h1>
    ${eventDate ? `<p style="margin:0 0 20px;font-size:13px;color:#555">📅 ${eventDate}</p>` : '<div style="margin-bottom:20px"></div>'}

    <!-- Data peserta -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f9f9f9"><td style="padding:9px 12px;font-size:12px;color:#888;width:38%;border-bottom:1px solid #eee">Nama</td><td style="padding:9px 12px;font-size:13px;font-weight:700;color:#111;border-bottom:1px solid #eee">${nama}</td></tr>
      <tr><td style="padding:9px 12px;font-size:12px;color:#888;border-bottom:1px solid #eee">No. WhatsApp</td><td style="padding:9px 12px;font-size:13px;color:#333;border-bottom:1px solid #eee">${nomorWa}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:9px 12px;font-size:12px;color:#888">Kamera</td><td style="padding:9px 12px;font-size:13px;color:#333">${tipeKamera || '-'}</td></tr>
    </table>

    <!-- Nomor tiket -->
    <div style="background:#111;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:11px;color:#999;letter-spacing:2px;text-transform:uppercase">Nomor Tiket</p>
      <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:4px;color:#FFE000;font-family:monospace">${ticketNo}</p>
    </div>

    <!-- Tombol download tiket -->
    <div style="text-align:center;margin-bottom:20px">
      <a href="${ticketUrl}" target="_blank"
        style="display:inline-block;background:#FFE000;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px">
        📄 Lihat & Unduh Tiket PDF
      </a>
      <p style="margin:10px 0 0;font-size:11px;color:#999">Tiket tersimpan di Google Drive. Klik tombol di atas untuk membuka.</p>
    </div>

    <!-- Instruksi -->
    <div style="background:#FFF8E1;border:1px solid #FFD740;border-radius:8px;padding:14px 16px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#F57F17">📋 Instruksi Hari Acara</p>
      <ul style="margin:0;padding-left:16px;font-size:12px;color:#795548;line-height:1.8">
        <li>Tunjukkan tiket ini (PDF atau screenshot) saat registrasi ulang di lokasi.</li>
        <li>Pastikan nomor tiket <strong>${ticketNo}</strong> terlihat jelas.</li>
        <li>Bawa kamera <strong>${tipeKamera || 'Anda'}</strong> untuk sesi praktik.</li>
      </ul>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#111;padding:16px 24px;border-radius:0 0 12px 12px;text-align:center">
    <p style="color:#666;font-size:11px;margin:0 0 4px">Nikon Service Center — Alta Nikon Indo</p>
    <p style="color:#444;font-size:10px;margin:0">Email ini dikirim otomatis, mohon jangan dibalas.</p>
  </div>

</div>
</body></html>`;
}

function buildRejectionEmailHtml(opts: {
  nama: string;
  eventTitle: string;
  reason?: string;
}): string {
  const { nama, eventTitle, reason } = opts;
  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px 8px;background:#1a1a1a;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:580px;margin:0 auto">
  <div style="background:#111;padding:20px 24px 16px;border-radius:12px 12px 0 0;text-align:center">
    <div style="display:inline-block;background:#FFE000;padding:4px 14px;border-radius:4px;margin-bottom:10px">
      <span style="font-size:18px;font-weight:900;color:#000;letter-spacing:3px">NIKON</span>
    </div>
  </div>
  <div style="background:#fff;padding:28px 24px">
    <div style="background:#FFEBEE;border:1px solid #EF9A9A;border-radius:8px;padding:14px 16px;margin-bottom:20px;text-align:center">
      <p style="margin:0 0 4px;font-size:15px;font-weight:900;color:#C62828">❌ Pendaftaran Tidak Dapat Diproses</p>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6">Halo <strong>${nama}</strong>,</p>
    <p style="font-size:14px;color:#333;line-height:1.6">Mohon maaf, pendaftaran Anda untuk event <strong>${eventTitle}</strong> tidak dapat diproses.</p>
    ${reason ? `<div style="background:#f5f5f5;border-left:3px solid #EF9A9A;padding:12px 16px;border-radius:4px;margin:16px 0">
      <p style="margin:0;font-size:13px;color:#555"><strong>Alasan:</strong> ${reason}</p>
    </div>` : ''}
    <p style="font-size:13px;color:#666;line-height:1.6">Silakan hubungi kami via WhatsApp untuk informasi lebih lanjut atau pendaftaran ulang.</p>
  </div>
  <div style="background:#111;padding:16px 24px;border-radius:0 0 12px 12px;text-align:center">
    <p style="color:#666;font-size:11px;margin:0">Nikon Service Center — Alta Nikon Indo</p>
  </div>
</div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { registrationId, action, rejectionReason } = await req.json();
    const dbTemplates: Record<string, string> = await loadChatbotTemplates(supabase).catch(() => ({}));
    const getText = (key: string, vars: Record<string, string>) => {
      const tmpl = dbTemplates[key] ?? DEFAULT_TEMPLATES[key]?.template ?? '';
      return applyTemplate(tmpl, vars);
    };

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
    let eventInfo: Record<string, unknown> | null = null;
    if (reg.event_id) {
      const { data: ev } = await supabase.from('events').select('*').eq('id', reg.event_id).maybeSingle();
      eventInfo = ev;
    }

    if (action === 'reject') {
      await supabase
        .from('event_registrations')
        .update({ status_pendaftaran: 'ditolak', rejection_reason: rejectionReason || null })
        .eq('id', registrationId);

      const rejectionWaMsg = getText('eventRegistrationRejected', {
        nama: reg.nama_lengkap, eventTitle: reg.event_name, reason: rejectionReason || '',
      });

      // WA via edge function (keep existing) + notif via channel (email/WA)
      sendWhatsApp(reg.nomor_wa, rejectionWaMsg).catch(e => console.error('WA reject failed:', e));
      await sendNotif({
        phone: reg.nomor_wa,
        email: reg.email || null,
        message: rejectionWaMsg,
        subject: `❌ Pendaftaran Event ${reg.event_name} Tidak Diproses`,
        html: buildRejectionEmailHtml({
          nama: reg.nama_lengkap,
          eventTitle: reg.event_name,
          reason: rejectionReason || '',
        }),
      });

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
        eventDate: (eventInfo?.event_date as string) || '',
        eventDetail: (eventInfo?.event_description as string) || '',
        cameraModel: reg.tipe_kamera || '',
        paymentType: reg.payment_type || 'regular',
      });
      ticketUrl = result.ticketUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('generateTicket failed:', message);
      return NextResponse.json({ error: `Ticket generation failed: ${message}` }, { status: 500 });
    }

    await supabase
      .from('event_registrations')
      .update({ status_pendaftaran: 'terdaftar', ticket_url: ticketUrl })
      .eq('id', registrationId);

    const approvalWaMsg = getText('eventRegistrationApproved', {
      nama: reg.nama_lengkap, eventTitle: reg.event_name, ticketLink: ticketUrl,
    });

    // WA via edge function (keep existing) + notif via channel (email/WA)
    sendWhatsApp(reg.nomor_wa, approvalWaMsg).catch(e => console.error('WA approve failed:', e));
    await sendNotif({
      phone: reg.nomor_wa,
      email: reg.email || null,
      message: approvalWaMsg,
      subject: `🎫 Tiket Resmi — ${reg.event_name}`,
      html: buildApprovalEmailHtml({
        nama: reg.nama_lengkap,
        eventTitle: reg.event_name,
        eventDate: (eventInfo?.event_date as string) || '',
        ticketUrl,
        nomorWa: reg.nomor_wa,
        tipeKamera: reg.tipe_kamera || '',
        registrationId,
      }),
    });

    return NextResponse.json({ success: true, status: 'terdaftar', ticketUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('validate-payment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
