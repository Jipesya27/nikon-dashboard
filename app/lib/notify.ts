/**
 * notify.ts — Shared notification dispatcher (server-only).
 * Reads `notif_channel` from pengaturan_bot and dispatches to
 * WhatsApp (Meta Cloud API) and/or email (SMTP via nodemailer).
 *
 * Channel values: 'wa_only' | 'email_only' | 'wa_and_email'
 * Default: 'wa_only'
 *
 * Required env vars for WA:
 *   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
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

// ─── WhatsApp via Meta Cloud API ────────────────────────────────────────────

function toWaE164(nomor: string): string {
  if (nomor.startsWith('+')) return nomor.slice(1);
  if (nomor.startsWith('0')) return '62' + nomor.slice(1);
  return nomor;
}

async function sendWA(
  nomor: string,
  pesan: string,
  template?: { name: string; params: string[] },
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  if (!token || !phoneNumberId || !nomor) return;
  const target = toWaE164(nomor);

  let body: unknown;
  if (template) {
    body = {
      messaging_product: 'whatsapp',
      to: target,
      type: 'template',
      template: {
        name: template.name,
        language: { code: 'id' },
        components: template.params.length > 0
          ? [{ type: 'body', parameters: template.params.map(p => ({ type: 'text', text: p })) }]
          : [],
      },
    };
  } else {
    body = {
      messaging_product: 'whatsapp',
      to: target,
      type: 'text',
      text: { body: pesan },
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) console.error('[notify] Meta WA error:', res.status, await res.text());
  } catch (e) {
    console.error('[notify] Gagal kirim WA (non-kritis):', e);
  }
}

/**
 * Kirim WA template langsung ke nomor manapun (tanpa channel settings).
 * Gunakan untuk notifikasi satu arah ke konsumen di luar 24h window.
 */
export async function sendWATemplate(
  nomor: string,
  templateName: string,
  params: string[],
): Promise<void> {
  await sendWA(nomor, '', { name: templateName, params });
}

/**
 * Kirim WA AUTHENTICATION template (OTP / kode akses sementara).
 * Format berbeda dari UTILITY template — kode dikirim ke parameter tombol,
 * bukan ke body. Template harus punya OTP button dengan otp_type="COPY_CODE".
 *
 * @param nomor        - Nomor WA tujuan (format 62xxx atau 08xxx)
 * @param templateName - Nama template AUTHENTICATION (e.g. 'notif_kode_akun')
 * @param code         - Kode / password sementara yang akan dikirim
 */
export async function sendWAOtpTemplate(
  nomor: string,
  templateName: string,
  code: string,
): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  if (!token || !phoneNumberId || !nomor) return;
  const target = toWaE164(nomor);

  const body = {
    messaging_product: 'whatsapp',
    to: target,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'id' },
      components: [{
        type: 'button',
        sub_type: 'copy_code',
        index: '0',
        parameters: [{ type: 'coupon_code', coupon_code: code }],
      }],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) console.error('[notify] Meta WA OTP error:', res.status, await res.text());
  } catch (e) {
    console.error('[notify] Gagal kirim WA OTP (non-kritis):', e);
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
  if (!host || !user || !pass || !to) return;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    } as Parameters<typeof nodemailer.createTransport>[0]);

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Nikon Service Center'}" <${process.env.SMTP_FROM || user}>`,
      to,
      subject,
      html: buildEmailHtml(message, customHtml),
    });
  } catch (e) {
    console.error('[notify] Gagal kirim email (non-kritis):', e);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface NotifTarget {
  /** WA number — format 62xxx atau 08xxx (otomatis dikonversi). */
  phone?: string;
  /** Recipient email address. */
  email?: string | null;
  /** Plain-text message (WA markdown: *bold* supported). Also used as email body fallback. */
  message: string;
  /** Email subject line. Defaults to 'Notifikasi Nikon'. */
  subject?: string;
  /** Custom HTML for email body. If omitted, message text is used. */
  html?: string;
  /**
   * Meta WA template. Jika diisi, WA dikirim sebagai template message
   * (bekerja di luar 24-jam window). Jika tidak diisi, pakai free-form text.
   */
  waTemplate?: { name: string; params: string[] };
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

  const tasks: Promise<void>[] = [];

  // ── Consumer ──────────────────────────────────
  if (consumer.phone && doWA) {
    tasks.push(sendWA(consumer.phone, consumer.message, consumer.waTemplate));
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
      ));
    }
  }

  await Promise.allSettled(tasks);
}
