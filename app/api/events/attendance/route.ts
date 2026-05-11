import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendWhatsApp(targetWa: string, message: string) {
  try {
    await supabase.functions.invoke('send-wa', { body: { target: targetWa, message } });
  } catch (err) {
    console.error('WA send error:', err);
  }
}

// Parse QR data: format "NIKON-EVT|{registrationId}|{eventTitle}"
function parseQrData(raw: string): { registrationId: string; eventTitle: string } | null {
  if (!raw) return null;
  const parts = raw.trim().split('|');
  if (parts.length >= 2 && parts[0] === 'NIKON-EVT') {
    return { registrationId: parts[1], eventTitle: parts.slice(2).join('|') };
  }
  // Fallback: kalau cuma UUID raw, anggap sebagai registrationId
  if (/^[0-9a-fA-F-]{36}$/.test(raw.trim())) {
    return { registrationId: raw.trim(), eventTitle: '' };
  }
  return null;
}

// GET /api/events/attendance?qr=<qrdata>
// Lookup peserta tanpa mark attendance — buat preview/konfirmasi dulu
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qr = url.searchParams.get('qr') || url.searchParams.get('id') || '';
    const parsed = parseQrData(qr);
    if (!parsed) {
      return NextResponse.json({ error: 'QR tidak valid. Format harus: NIKON-EVT|{id}|{event}' }, { status: 400 });
    }

    const { data: reg, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('id', parsed.registrationId)
      .maybeSingle();

    if (error || !reg) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, registration: reg });
  } catch (err: any) {
    console.error('attendance GET error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

// POST /api/events/attendance
// Body: { qr: string, attendedBy?: string, sendWa?: boolean }
// Mark peserta sebagai hadir
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const qr: string = body.qr || body.registrationId || '';
    const attendedBy: string = body.attendedBy || 'Admin';
    const sendWa: boolean = body.sendWa !== false;

    const parsed = parseQrData(qr);
    if (!parsed) {
      return NextResponse.json({ error: 'QR tidak valid. Format: NIKON-EVT|{id}|{event}' }, { status: 400 });
    }

    const { data: reg, error: fetchError } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('id', parsed.registrationId)
      .maybeSingle();

    if (fetchError || !reg) {
      return NextResponse.json({ error: 'Pendaftaran tidak ditemukan di database' }, { status: 404 });
    }

    // Validasi: status pendaftaran harus 'terdaftar'
    if (reg.status_pendaftaran !== 'terdaftar') {
      return NextResponse.json({
        error: `Pendaftaran belum disetujui (status: ${reg.status_pendaftaran}). Validasi pembayaran dulu.`,
        registration: reg,
      }, { status: 400 });
    }

    // Sudah hadir sebelumnya
    if (reg.is_attended) {
      return NextResponse.json({
        success: false,
        alreadyAttended: true,
        message: `${reg.nama_lengkap} sudah dicatat hadir pada ${reg.attended_at ? new Date(reg.attended_at).toLocaleString('id-ID') : 'sebelumnya'}.`,
        registration: reg,
      });
    }

    // Mark attended
    const { data: updated, error: updateError } = await supabase
      .from('event_registrations')
      .update({
        is_attended: true,
        attended_at: new Date().toISOString(),
        attended_by: attendedBy,
      })
      .eq('id', reg.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: `Gagal update: ${updateError.message}` }, { status: 500 });
    }

    // Kirim WA notifikasi (opsional)
    if (sendWa && reg.nomor_wa) {
      const msg = `Halo *${reg.nama_lengkap}*,\n\nKehadiran Anda di event *${reg.event_name}* sudah dikonfirmasi. ✅\n\nSelamat menikmati acara!\n\nSalam,\nNikon Indonesia`;
      sendWhatsApp(reg.nomor_wa, msg).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `${reg.nama_lengkap} berhasil dicatat hadir.`,
      registration: updated,
    });
  } catch (err: any) {
    console.error('attendance POST error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

// DELETE: Batalkan attendance (kalau salah scan)
// Body: { registrationId: string }
export async function DELETE(req: NextRequest) {
  try {
    const { registrationId } = await req.json();
    if (!registrationId) return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });

    const { error } = await supabase
      .from('event_registrations')
      .update({ is_attended: false, attended_at: null, attended_by: null })
      .eq('id', registrationId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: 'Status kehadiran dibatalkan' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
