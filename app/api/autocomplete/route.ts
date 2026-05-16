import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE env belum di-set.');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// GET: semua item autocomplete
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('autocomplete_items')
    .select('*')
    .order('field_key')
    .order('value');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: tambah/upsert item (pinned atau hidden)
export async function POST(req: Request) {
  const supabase = getSupabase();
  const body = await req.json();
  const { field_key, value, hidden = false } = body;
  if (!field_key || !value?.trim()) {
    return NextResponse.json({ error: 'field_key dan value wajib.' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('autocomplete_items')
    .upsert({ field_key, value: value.trim(), hidden }, { onConflict: 'field_key,value' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH: toggle hidden state
export async function PATCH(req: Request) {
  const supabase = getSupabase();
  const { id, hidden } = await req.json();
  if (!id) return NextResponse.json({ error: 'id wajib.' }, { status: 400 });
  const { data, error } = await supabase
    .from('autocomplete_items')
    .update({ hidden })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: hapus item
export async function DELETE(req: Request) {
  const supabase = getSupabase();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id wajib.' }, { status: 400 });
  const { error } = await supabase.from('autocomplete_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
