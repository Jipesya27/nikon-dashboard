import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const errFromGoogle = searchParams.get('error');

  if (errFromGoogle) {
    return NextResponse.redirect(`${origin}/admin/google-auth?error=${encodeURIComponent(errFromGoogle)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/admin/google-auth?error=no_code`);
  }

  const redirect_uri = `${origin}/api/auth/google/callback`;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code',
        code,
      }).toString(),
    });

    const data = await res.json();
    if (!data.refresh_token) {
      const detail = encodeURIComponent(JSON.stringify(data));
      return NextResponse.redirect(`${origin}/admin/google-auth?error=no_refresh_token&detail=${detail}`);
    }

    // Test access token: ambil info user supaya tau akun mana yang authorize
    let userEmail = '';
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      userEmail = userInfo.email || '';
    } catch {}

    const params = new URLSearchParams({
      refresh_token: data.refresh_token,
      email: userEmail,
      ts: String(Date.now()),
    });
    return NextResponse.redirect(`${origin}/admin/google-auth?${params.toString()}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.redirect(`${origin}/admin/google-auth?error=${encodeURIComponent(msg)}`);
  }
}
