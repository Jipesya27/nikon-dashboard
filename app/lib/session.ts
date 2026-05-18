// Uses Web Crypto (crypto.subtle) — works in Edge Runtime AND Node.js
export async function buildSessionToken(password: string): Promise<string> {
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
  const secret = process.env.ADMIN_PASSWORD || '';
  if (!secret || !session) return false;
  const expected = await buildSessionToken(secret);
  return session === expected;
}
