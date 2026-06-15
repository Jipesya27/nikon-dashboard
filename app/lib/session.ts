// Uses Web Crypto (crypto.subtle) — works in Edge Runtime AND Node.js

const MAX_SESSION_AGE_MS = 2 * 24 * 60 * 60 * 1000; // 2 hari
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 2;

export interface KaryawanIdentity {
  nama: string;
  username: string;
  role: string;
}

/** Constant-time string comparison (prevents timing attacks) */
function safeEqual(a: string, b: string): boolean {
  // Pad to same length so we always do a full comparison (prevents length leak)
  const maxLen = Math.max(a.length, b.length);
  const enc = new TextEncoder();
  const aBytes = enc.encode(a.padEnd(maxLen, '\0'));
  const bBytes = enc.encode(b.padEnd(maxLen, '\0'));
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0 && a.length === b.length;
}

async function computeHmac(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    'raw', enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(data));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function sessionKey(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'nikon-fallback-key';
}

// ── Base64url helpers (Edge + Node.js 18+ safe) ──────────────────────────────

function toB64url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ── Session token (admin_session cookie) ─────────────────────────────────────

/**
 * Token format: "{issuedAt}.{hmac}"
 * hmac = HMAC-SHA256(SESSION_SECRET, SESSION_SECRET + issuedAt)
 */
export async function buildSessionToken(secret: string): Promise<string> {
  const key = sessionKey();
  const issuedAt = Date.now().toString();
  const hex = await computeHmac(key, secret + issuedAt);
  return `${issuedAt}.${hex}`;
}

export async function verifyAdminSession(
  cookieGetter: { get: (name: string) => { value: string } | undefined }
): Promise<boolean> {
  const session = cookieGetter.get('admin_session')?.value;
  if (!session) return false;

  const secret = process.env.ADMIN_PASSWORD || process.env.SESSION_SECRET || '';
  if (!secret) return false;

  const dotIdx = session.indexOf('.');

  // Format lama (tanpa titik): terima untuk backward compat, expired sendiri setelah 2 hari
  if (dotIdx === -1) {
    const key = sessionKey();
    const expected = await computeHmac(key, secret);
    return safeEqual(session, expected);
  }

  const issuedAtStr = session.substring(0, dotIdx);
  const hex = session.substring(dotIdx + 1);

  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt)) return false;
  if (Date.now() - issuedAt > MAX_SESSION_AGE_MS) return false;

  const key = sessionKey();
  const expected = await computeHmac(key, secret + issuedAtStr);
  return safeEqual(hex, expected);
}

// ── Identity token (karyawan_identity cookie) ─────────────────────────────────
//
// Format: {b64url_payload}.{hmac_hex}
// payload = base64url(JSON.stringify({nama, username, role}))
// hmac    = HMAC-SHA256(SESSION_SECRET, payload)
//
// Signed sehingga tidak bisa dimanipulasi tanpa kunci rahasia.

export async function buildIdentityToken(identity: KaryawanIdentity): Promise<string> {
  const payload = toB64url(JSON.stringify(identity));
  const hmac = await computeHmac(sessionKey(), payload);
  return `${payload}.${hmac}`;
}

/**
 * Verify signed identity token. Returns null jika invalid atau tampak seperti format lama.
 * Gunakan ini di routes yang butuh jaminan kriptografis (change-password, admin-password).
 */
export async function verifyIdentityToken(token: string): Promise<KaryawanIdentity | null> {
  if (!token) return null;

  // Format lama mengandung '|' — tidak bisa di-verify, tolak untuk konteks keamanan
  if (token.includes('|')) return null;

  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = token.substring(0, lastDot);
  const hmac = token.substring(lastDot + 1);

  const expected = await computeHmac(sessionKey(), payload);
  if (!safeEqual(hmac, expected)) return null;

  try {
    const json = fromB64url(payload);
    const identity = JSON.parse(json) as KaryawanIdentity;
    if (!identity.nama || !identity.username || !identity.role) return null;
    return identity;
  } catch {
    return null;
  }
}

/**
 * Parse identity cookie tanpa verifikasi signature — untuk konteks non-security
 * (audit log, nama pembuat, dsb). Mendukung format lama (nama|username|role) dan baru.
 */
export function parseIdentityCookieUnsafe(value: string): KaryawanIdentity | null {
  if (!value) return null;

  // Format lama: "nama|username|role"
  if (value.includes('|')) {
    const parts = value.split('|');
    if (parts.length < 3) return null;
    return { nama: parts[0] || '', username: parts[1] || '', role: parts[2] || '' };
  }

  // Format baru: "b64payload.hmac" — decode tanpa verifikasi
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return null;

  try {
    const json = fromB64url(value.substring(0, lastDot));
    const identity = JSON.parse(json) as KaryawanIdentity;
    if (!identity.username) return null;
    return identity;
  } catch {
    return null;
  }
}
