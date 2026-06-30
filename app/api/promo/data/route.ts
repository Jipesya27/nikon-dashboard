import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

export async function GET() {
  const { data: promo } = await supabase
    .from('promo_datacolor')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!promo) return NextResponse.json({ promo: null, items: [] });

  const { data: items } = await supabase
    .from('promo_datacolor_items')
    .select('*')
    .eq('promo_id', promo.id)
    .order('urutan');

  return NextResponse.json({ promo, items: items || [] });
}
