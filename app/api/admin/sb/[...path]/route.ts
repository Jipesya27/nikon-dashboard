/**
 * Supabase proxy — validates admin session, then forwards to Supabase
 * using the service_role key so RLS-protected tables are accessible
 * from client-side admin pages without exposing the service_role key.
 *
 * Usage: set the Supabase client base URL to '/api/admin/sb'
 *   createClient('/api/admin/sb', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Headers we strip from the incoming request before forwarding
const STRIP_HEADERS = new Set(['host', 'connection', 'authorization', 'apikey', 'content-length', 'transfer-encoding']);

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  // Validate admin session
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await params;
  const targetPath = path.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${SB_URL}/${targetPath}${search}`;

  // Build forwarded headers, replacing auth with service_role
  const headers = new Headers();
  for (const [k, v] of req.headers) {
    if (!STRIP_HEADERS.has(k.toLowerCase())) {
      headers.set(k, v);
    }
  }
  headers.set('Authorization', `Bearer ${SB_KEY}`);
  headers.set('apikey', SB_KEY);

  const method = req.method;
  const hasBody = !['GET', 'HEAD'].includes(method);

  // Read body as text to avoid ArrayBuffer transmission issues,
  // then set explicit Content-Length so PostgREST gets the full payload.
  let body: string | undefined;
  if (hasBody) {
    body = await req.text();
    if (body.length > 0) {
      headers.set('content-length', String(Buffer.byteLength(body, 'utf8')));
    }
  }

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body,
  });

  const data = await upstream.arrayBuffer();

  // Forward relevant response headers
  const outHeaders = new Headers();
  for (const h of [
    'content-type',
    'content-range',
    'preference-applied',
    'x-total-count',
    'x-error-code',
    'x-error-message',
  ]) {
    const v = upstream.headers.get(h);
    if (v) outHeaders.set(h, v);
  }

  return new NextResponse(data, { status: upstream.status, headers: outHeaders });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
