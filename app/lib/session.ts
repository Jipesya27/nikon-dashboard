// Uses Web Crypto (crypto.subtle) — works in Edge Runtime AND Node.js

const MAX_SESSION_AGE_MS = 2 * 24 * 60 * 60 * 1000; // 2 hari
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 2; // 2 hari dalam detik

/** Constant-time string comparison (prevents timing attacks) */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
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

/**
 * Token format: "{issuedAt}.{hmac}"
 * issuedAt = Date.now() timestamp saat login
 * hmac = HMAC-SHA256(key, secret + issuedAt)
 */
export async function buildSessionToken(secret: string): Promise<string> {
  const key = process.env.SESSION_SECRET || `nikon-auth-${secret}-v2`;
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

  // === Format lama (tanpa titik): HMAC saja — terima untuk backward compat,
  //     tapi cookie sudah diatur maxAge 2 hari sejak deployment, jadi akan expired sendiri ===
  if (dotIdx === -1) {
    const key = process.env.SESSION_SECRET || `nikon-auth-${secret}-v2`;
    const expected = await computeHmac(key, secret);
    return safeEqual(session, expected);
  }

  // === Format baru: {issuedAt}.{hmac} ===
  const issuedAtStr = session.substring(0, dotIdx);
  const hex = session.substring(dotIdx + 1);

  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt)) return false;

  // Cek umur token — maksimal 2 hari dari server side
  if (Date.now() - issuedAt > MAX_SESSION_AGE_MS) return false;

  const key = process.env.SESSION_SECRET || `nikon-auth-${secret}-v2`;
  const expected = await computeHmac(key, secret + issuedAtStr);
  return safeEqual(hex, expected);
}
