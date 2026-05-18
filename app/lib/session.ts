// Uses Web Crypto (crypto.subtle) — works in Edge Runtime AND Node.js

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

export async function buildSessionToken(password: string): Promise<string> {
  // SESSION_SECRET is a separate secret from ADMIN_PASSWORD — set it in env!
  const key = process.env.SESSION_SECRET || `nikon-auth-${password}-v2`;
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    'raw', enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(password));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyAdminSession(
  cookieGetter: { get: (name: string) => { value: string } | undefined }
): Promise<boolean> {
  const session = cookieGetter.get('admin_session')?.value;
  if (!session) return false;
  // ADMIN_PASSWORD is optional — fall back to SESSION_SECRET so karyawan login
  // (which uses the same derivation) can create a valid admin_session without it.
  const secret = process.env.ADMIN_PASSWORD || process.env.SESSION_SECRET || '';
  if (!secret) return false;
  const expected = await buildSessionToken(secret);
  return safeEqual(session, expected);
}
