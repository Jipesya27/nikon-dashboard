/**
 * POST /api/admin/events/blast-wa
 * Blast WA ke semua peserta event (atau peserta event tertentu).
 * - Peserta status "terdaftar" → kirim notif_event_blast (7 params)
 *   atau notif_event_approved (3 params, fallback jika event_time/speaker/wa_group tidak lengkap)
 * - Peserta status "menunggu_validasi" → kirim notif_daftar_event
 * - Peserta status "ditolak" → skip
 *
 * Body JSON:
 *   { eventName?: string }   — kosong = blast semua event
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
    .select('id, nama_lengkap, nomor_wa, event_id, event_name, status_pendaftaran, ticket_url')
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

  // Batch-fetch data event (speaker, jam, lokasi, wa_group_link)
  const eventIds = [...new Set(regs.map(r => r.event_id).filter(Boolean))];
  const eventMap: Record<string, { event_date?: string; event_time?: string; event_location?: string; event_speaker?: string; wa_group_link?: string }> = {};
  if (eventIds.length > 0) {
    const { data: evts } = await supabase
      .from('events')
      .select('id, event_date, event_time, event_location, event_speaker, wa_group_link')
      .in('id', eventIds);
    (evts || []).forEach(ev => { eventMap[ev.id] = ev; });
  }

  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const reg of regs) {
    const wa = toWaE164(reg.nomor_wa || '');
    if (!wa) { skipped++; continue; }

    const ev = eventMap[reg.event_id] || {};

    try {
      if (reg.status_pendaftaran === 'terdaftar' && reg.ticket_url) {
        // Gunakan notif_event_blast jika data event lengkap
        const tanggal = ev.event_date || '';
        const jam = ev.event_time || '';
        const lokasi = ev.event_location || '';
        const pembicara = ev.event_speaker || '';
        const waGrup = ev.wa_group_link || '';

        if (tanggal && jam && lokasi && pembicara && waGrup) {
          // notif_event_blast — 8 params (lengkap dengan lokasi + wa grup)
          await sendWATemplate(wa, 'notif_event_blast', [
            reg.nama_lengkap,
            reg.event_name,
            tanggal,
            jam,
            lokasi,
            pembicara,
            reg.ticket_url,
            waGrup,
          ]);
        } else if (tanggal && jam && lokasi && pembicara) {
          // notif_event_blast_no_group — 7 params (tanpa wa_group)
          await sendWATemplate(wa, 'notif_event_blast_no_group', [
            reg.nama_lengkap,
            reg.event_name,
            tanggal,
            jam,
            lokasi,
            pembicara,
            reg.ticket_url,
          ]);
        } else {
          // Fallback ke template lama
          await sendWATemplate(wa, 'notif_event_approved', [reg.nama_lengkap, reg.event_name, reg.ticket_url]);
        }
      } else if (reg.status_pendaftaran === 'terdaftar') {
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

    await sleep(500);
  }

  return NextResponse.json({ success: true, sent, skipped, failed, errors: errors.slice(0, 20) });
}
