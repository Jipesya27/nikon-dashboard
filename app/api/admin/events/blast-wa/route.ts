/**
 * POST /api/admin/events/blast-wa
 * Blast WA ke semua peserta event (atau peserta event tertentu).
 * - Peserta status "terdaftar" → kirim template tiket (notif_event_approved)
 * - Peserta status "menunggu_validasi" → kirim template konfirmasi (notif_daftar_event)
 * - Peserta status "ditolak" → skip (tidak dikirim)
 *
 * Body JSON:
 *   { eventName?: string }   — kosong = blast semua event aktif
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { sendWATemplate } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function toWaE164(nomor: string): string {
  if (nomor.startsWith('+')) return nomor.slice(1);
  if (nomor.startsWith('0')) return '62' + nomor.slice(1);
  return nomor;
}

// Delay antar pesan agar tidak kena rate-limit Meta
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { eventName?: string } = {};
  try { body = await req.json(); } catch { /* kosong = blast semua */ }

  // Ambil registrasi yang belum ditolak
  let query = supabase
    .from('event_registrations')
    .select('id, nama_lengkap, nomor_wa, event_name, status_pendaftaran, ticket_url')
    .neq('status_pendaftaran', 'ditolak')
    .order('created_at', { ascending: true });

  if (body.eventName) {
    query = query.eq('event_name', body.eventName);
  }

  const { data: regs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!regs || regs.length === 0) {
    return NextResponse.json({ success: true, sent: 0, skipped: 0, failed: 0 });
  }

  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const reg of regs) {
    const wa = toWaE164(reg.nomor_wa || '');
    if (!wa) { skipped++; continue; }

    try {
      if (reg.status_pendaftaran === 'terdaftar' && reg.ticket_url) {
        // Kirim tiket
        await sendWATemplate(wa, 'notif_event_approved', [reg.nama_lengkap, reg.event_name, reg.ticket_url]);
      } else if (reg.status_pendaftaran === 'terdaftar') {
        // Terdaftar tapi belum ada tiket (edge case)
        await sendWATemplate(wa, 'notif_daftar_event', [reg.nama_lengkap, reg.event_name]);
      } else if (reg.status_pendaftaran === 'menunggu_validasi') {
        await sendWATemplate(wa, 'notif_daftar_event', [reg.nama_lengkap, reg.event_name]);
      } else {
        skipped++;
        continue;
      }
      sent++;
    } catch (e) {
      failed++;
      errors.push(`${reg.nama_lengkap} (${wa}): ${e instanceof Error ? e.message : String(e)}`);
    }

    // 500ms antar pesan
    await sleep(500);
  }

  return NextResponse.json({ success: true, sent, skipped, failed, errors: errors.slice(0, 20) });
}
