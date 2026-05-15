import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_NIKON_CONFIG, NikonPageConfig } from '@/app/lib/homepageTypes';

const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const DB_KEY = 'nikon_page_config_v1';

export async function GET() {
   try {
      const { data } = await supabase
         .from('pengaturan_bot')
         .select('description')
         .eq('nama_pengaturan', DB_KEY)
         .maybeSingle();

      if (!data?.description) {
         return NextResponse.json({ config: DEFAULT_NIKON_CONFIG });
      }
      const saved = JSON.parse(data.description) as Partial<NikonPageConfig>;
      // Merge dengan default supaya field baru tetap ada
      return NextResponse.json({ config: { ...DEFAULT_NIKON_CONFIG, ...saved } });
   } catch {
      return NextResponse.json({ config: DEFAULT_NIKON_CONFIG });
   }
}

export async function POST(req: NextRequest) {
   try {
      const { config } = await req.json() as { config: NikonPageConfig };
      const { error } = await supabase
         .from('pengaturan_bot')
         .upsert(
            { nama_pengaturan: DB_KEY, description: JSON.stringify(config), url_file: null },
            { onConflict: 'nama_pengaturan' },
         );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
   } catch (err: unknown) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
   }
}
