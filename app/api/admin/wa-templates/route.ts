/**
 * /api/admin/wa-templates
 * Proxy ke Meta Graph API untuk CRUD Message Templates WhatsApp.
 * Semua request divalidasi dengan admin session.
 *
 * GET    → list semua templates
 * POST   → buat template baru
 * DELETE → hapus template (?name=xxx)
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
const TOKEN   = process.env.WHATSAPP_ACCESS_TOKEN || '';
const BASE    = 'https://graph.facebook.com/v25.0';

async function guard(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore);
}

// ─── GET: list all templates ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!WABA_ID || !TOKEN) return NextResponse.json({ error: 'WHATSAPP_WABA_ID atau WHATSAPP_ACCESS_TOKEN belum dikonfigurasi' }, { status: 500 });

  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  const fields = 'name,status,category,language,components,id,rejected_reason';
  const apiUrl = name
    ? `${BASE}/${WABA_ID}/message_templates?name=${encodeURIComponent(name)}&fields=${fields}&limit=100`
    : `${BASE}/${WABA_ID}/message_templates?fields=${fields}&limit=100`;

  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data?.error?.message || 'Meta API error' }, { status: res.status });
  return NextResponse.json(data);
}

// ─── POST: create template ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!WABA_ID || !TOKEN) return NextResponse.json({ error: 'WHATSAPP_WABA_ID atau WHATSAPP_ACCESS_TOKEN belum dikonfigurasi' }, { status: 500 });

  let payload: unknown;
  try { payload = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const res = await fetch(`${BASE}/${WABA_ID}/message_templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data?.error?.error_user_msg || data?.error?.message || 'Meta API error', meta: data?.error }, { status: res.status });
  return NextResponse.json(data);
}

// ─── DELETE: delete template by name ─────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!WABA_ID || !TOKEN) return NextResponse.json({ error: 'WHATSAPP_WABA_ID atau WHATSAPP_ACCESS_TOKEN belum dikonfigurasi' }, { status: 500 });

  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'Parameter ?name= wajib diisi' }, { status: 400 });

  const res = await fetch(`${BASE}/${WABA_ID}/message_templates?name=${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data?.error?.error_user_msg || data?.error?.message || 'Meta API error', meta: data?.error }, { status: res.status });
  return NextResponse.json(data);
}
