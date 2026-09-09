/**
 * POST /api/events/change-status
 * Koreksi status pendaftaran peserta event (mis. admin salah approve/reject).
 *
 * Body JSON: { registrationId: string, newStatus: 'menunggu_validasi'|'terdaftar'|'ditolak', reason: string }
 *
 * - `reason` WAJIB — dicatat di data_log + event_registrations.last_action_note.
 * - Pindah KELUAR dari "terdaftar" → `ticket_sent_at` di-reset (tiket lama tidak berlaku),
 *   `ticket_url` tetap disimpan untuk jejak.
 * - TIDAK mengirim WhatsApp apa pun. Untuk kirim tiket setelah re-approve,
 *   admin klik tombol "Kirim Tiket" (POST /api/events/send-ticket).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { getAuditUser, writeAuditLog } from '@/app/lib/audit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['menunggu_validasi', 'terdaftar', 'ditolak'] as const;
type RegStatus = (typeof VALID_STATUS)[number];

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (!(await verifyAdminSession(cookieStore))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const actor = getAuditUser(cookieStore);

    const { registrationId, newStatus, reason } = await req.json();
    if (!registrationId || !newStatus) {
      return NextResponse.json({ error: 'registrationId & newStatus wajib diisi' }, { status: 400 });
    }
    if (!VALID_STATUS.includes(newStatus as RegStatus)) {
      return NextResponse.json({ error: `newStatus tidak valid: ${newStatus}` }, { status: 400 });
    }
    if (!reason || !String(reason).trim()) {
      return NextResponse.json({ error: 'Alasan perubahan wajib diisi (untuk jejak audit).' }, { status: 400 });
    }

    const { data: reg, error: fetchError } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();
    if (fetchError || !reg) {
      return NextResponse.json({ error: `Peserta tidak ditemukan: ${fetchError?.message || 'no rows'}` }, { status: 404 });
    }

    const oldStatus: string = reg.status_pendaftaran || '(kosong)';
    if (oldStatus === newStatus) {
      return NextResponse.json({ error: `Status sudah "${newStatus}", tidak ada perubahan.` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const reasonText = String(reason).trim();
    const noteText = `Status: ${oldStatus} → ${newStatus} (${reasonText})`;

    const patch: Record<string, unknown> = {
      status_pendaftaran: newStatus,
      last_action_by: actor,
      last_action_at: now,
      last_action_note: noteText,
    };
    // Keluar dari "terdaftar" → tiket lama tidak berlaku lagi.
    if (oldStatus === 'terdaftar' && newStatus !== 'terdaftar') {
      patch.ticket_sent_at = null;
    }
    // Masuk ke "ditolak" → simpan alasan agar konsisten dengan alur reject biasa.
    if (newStatus === 'ditolak') {
      patch.rejection_reason = reasonText;
    }

    const { error: updErr } = await supabase
      .from('event_registrations')
      .update(patch)
      .eq('id', registrationId);
    if (updErr) {
      return NextResponse.json({ error: `Gagal update: ${updErr.message}` }, { status: 500 });
    }

    await writeAuditLog({
      user_name: actor,
      action: 'change_registration_status',
      table_name: 'event_registrations',
      record_id: registrationId,
      old_values: { status_pendaftaran: oldStatus, ticket_sent_at: reg.ticket_sent_at || null },
      new_values: { status_pendaftaran: newStatus, ticket_sent_at: patch.ticket_sent_at ?? reg.ticket_sent_at ?? null },
      note: reasonText,
    });

    return NextResponse.json({
      success: true,
      oldStatus,
      newStatus,
      ticketReset: patch.ticket_sent_at === null,
      lastAction: { by: actor, at: now, note: noteText },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('change-status error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
