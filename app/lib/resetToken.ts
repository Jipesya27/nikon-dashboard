// Helper token reset password self-service.
// Token asli hanya dikirim ke email user; DB menyimpan SHA-256 hash-nya saja.

import { createHash, randomBytes } from 'crypto';

/** Berlaku 1 jam sejak dibuat. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** 32 byte acak → string base64url (~43 char, aman dipakai di URL). */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash yang disimpan & dibandingkan di DB. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Origin situs untuk menyusun link reset. Fallback ke domain production. */
export function siteOrigin(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0]?.trim();
  if (host && !host.includes('localhost') && !host.startsWith('127.0.0.1')) {
    return `${proto}://${host}`;
  }
  return 'https://altanikindo.com';
}
