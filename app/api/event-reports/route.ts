import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PREFIX = 'event_report_';

export async function GET(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get('eventId');
    if (eventId) {
      const { data } = await supabase
        .from('pengaturan_bot')
        .select('description')
        .eq('nama_pengaturan', `${PREFIX}${eventId}`)
        .maybeSingle();
      return NextResponse.json({ report: data?.description ? JSON.parse(data.description) : null });
    }
    const { data } = await supabase
      .from('pengaturan_bot')
      .select('nama_pengaturan, description')
      .like('nama_pengaturan', `${PREFIX}%`);
    const reports: Record<string, unknown> = {};
    for (const row of data ?? []) {
      const id = row.nama_pengaturan.replace(PREFIX, '');
      try { reports[id] = JSON.parse(row.description); } catch { /* skip */ }
    }
    return NextResponse.json({ reports });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { eventId, report } = await req.json();
    const { error } = await supabase
      .from('pengaturan_bot')
      .upsert(
        { nama_pengaturan: `${PREFIX}${eventId}`, description: JSON.stringify(report), url_file: null },
        { onConflict: 'nama_pengaturan' }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    await supabase.from('pengaturan_bot').delete().eq('nama_pengaturan', `${PREFIX}${eventId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
