/**
 * notify.ts — Shared notification dispatcher (server-only).
 * Reads `notif_channel` from pengaturan_bot and dispatches to
 * WhatsApp (Fonnte) and/or email (SMTP via nodemailer).
 *
 * Channel values: 'wa_only' | 'email_only' | 'wa_and_email'
 * Default: 'wa_only'
 *
 * Required env vars for email:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 *   SMTP_FROM (optional, defaults to SMTP_USER)
 *   SMTP_FROM_NAME (optional, e.g. "Nikon Service Center")
 *   ADMIN_EMAIL (optional — admin email for admin notifications)
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export type NotifChannel = 'wa_only' | 'email_only' | 'wa_and_email';

// Module-level cache (valid 90s — short enough to pick up changes quickly)
let _cache: { channel: NotifChannel; adminEmail: string; ts: number } | null = null;
const CACHE_TTL = 90_000;

async function getSettings(): Promise<{ channel: NotifChannel; adminEmail: string }> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return { channel: _cache.channel, adminEmail: _cache.adminEmail };
  }
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: rows } = await supabase
      .from('pengaturan_bot')
      .select('nama_pengaturan, description')
      .in('nama_pengaturan', ['notif_channel', 'admin_email']);

    const map: Record<string, string> = {};
    (rows || []).forEach((r: { nama_pengaturan: string; description: string }) => {
      if (r.nama_pengaturan) map[r.nama_pengaturan] = r.description || '';
    });

    const channel = (['wa_only', 'email_only', 'wa_and_email'].includes(map.notif_channel)
      ? map.notif_channel
      : 'wa_only') as NotifChannel;
    const adminEmail = map.admin_email || process.env.ADMIN_EMAIL || '';

    _cache = { channel, adminEmail, ts: Date.now() };
    return { channel, adminEmail };
  } catch {
    return { channel: 'wa_only', adminEmail: process.env.ADMIN_EMAIL || '' };
  }
}

/** Invalidate the in-process cache (call after saving settings in admin). */
export function invalidateNotifCache() {
  _cache = null;
}

// ─── WhatsApp via Fonnte ────────────────────────────────────────────────────

async function sendWA(nomor: string, pesan: string) {
  const token = process.env.FONNTE_TOKEN || '';
  if (!token || !nomor) return;
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token },
      body: new URLSearchParams({ target: nomor, message: pesan }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error('[notify] Fonnte error:', res.status, await res.text());
  } catch (e) {
    console.error('[notify] Gagal kirim WA (non-kritis):', e);
  }
}

// ─── Email via SMTP ─────────────────────────────────────────────────────────

function waMarkdownToHtml(text: string): string {
  // Convert *bold* → <b>bold</b> and \n → <br>
  return text
    .replace(/\*(.*?)\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

function buildEmailHtml(message: string, customHtml?: string): string {
  const body = customHtml || `<p style="font-family:Arial,sans-serif;line-height:1.6;color:#222">${waMarkdownToHtml(message)}</p>`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f4">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border-top:4px solid #FFE000">
${body}
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<p style="font-family:Arial,sans-serif;font-size:11px;color:#888;margin:0">
Nikon Service Center — notifikasi otomatis, jangan dibalas.
</p>
</div>
</body></html>`;
}

async function sendEmail(to: string, subject: string, message: string, customHtml?: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('[notify] SMTP env vars tidak lengkap — email tidak dikirim. Pastikan SMTP_HOST, SMTP_USER, SMTP_PASS sudah diset dan server sudah di-restart.');
    return;
  }
  if (!to) {
    console.warn('[notify] sendEmail dipanggil tapi alamat email kosong — skip.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    } as Parameters<typeof nodemailer.createTransport>[0]);

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Nikon Service Center'}" <${process.env.SMTP_FROM || user}>`,
      to,
      subject,
      html: buildEmailHtml(message, customHtml),
    });
    console.log(`[notify] Email terkirim → ${to} | subject: "${subject}" | id: ${info.messageId}`);
  } catch (e) {
    console.error('[notify] Gagal kirim email:', e instanceof Error ? e.message : e);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface NotifTarget {
  /** WA number in 62xxx format (for Fonnte). */
  phone?: string;
  /** Recipient email address. */
  email?: string | null;
  /** Plain-text message (WA markdown: *bold* supported). Also used as email body fallback. */
  message: string;
  /** Email subject line. Defaults to 'Notifikasi Nikon'. */
  subject?: string;
  /** Custom HTML for email body. If omitted, message text is used. */
  html?: string;
}

/**
 * Send a notification to one or two targets (consumer + admin)
 * based on the configured channel.
 *
 * @param consumer - notification for the end-user
 * @param admin    - (optional) separate notification for admin;
 *                   if omitted no admin notification is sent
 */
export async function sendNotif(consumer: NotifTarget, admin?: NotifTarget): Promise<void> {
  const { channel, adminEmail } = await getSettings();

  const doWA    = channel === 'wa_only'    || channel === 'wa_and_email';
  const doEmail = channel === 'email_only' || channel === 'wa_and_email';

  console.log(`[notify] channel=${channel} | consumer.email=${consumer.email || '-'} | doWA=${doWA} | doEmail=${doEmail}`);

  const tasks: Promise<void>[] = [];

  // ── Consumer ──────────────────────────────────
  if (consumer.phone && doWA) {
    tasks.push(sendWA(consumer.phone, consumer.message));
  }
  if (consumer.email && doEmail) {
    tasks.push(sendEmail(
      consumer.email,
      consumer.subject || 'Notifikasi Nikon',
      consumer.message,
      consumer.html,
    ));
  }

  // ── Admin ─────────────────────────────────────
  if (admin) {
    const adminWA    = process.env.ADMIN_WA_NUMBER || '';
    const adminMail  = adminEmail;

    if (adminWA && doWA) {
      tasks.push(sendWA(adminWA, admin.message));
    }
    if (adminMail && doEmail) {
      tasks.push(sendEmail(
        adminMail,
        admin.subject || 'Notifikasi Admin — Nikon',
        admin.message,
        admin.html,
      ));
    }
  }

  await Promise.allSettled(tasks);
}
