import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export async function GET(req: Request) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID belum di-set di env.' }, { status: 500 });
  }
  const { origin } = new URL(req.url);
  const redirect_uri = `${origin}/api/auth/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirect_uri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/cloud-vision',
  ].join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent'); // wajib agar refresh_token selalu di-issue
  authUrl.searchParams.set('include_granted_scopes', 'true');

  return NextResponse.redirect(authUrl.toString());
}
