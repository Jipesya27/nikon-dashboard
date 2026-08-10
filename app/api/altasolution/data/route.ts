import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

export async function GET() {
  const [{ data: products }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from('altasolution_products')
      .select('*')
      .eq('is_active', true)
      .order('urutan')
      .order('created_at', { ascending: false }),
    supabase.from('altasolution_categories').select('*').order('urutan').order('nama'),
    supabase.from('altasolution_brands').select('*').order('urutan').order('nama'),
  ]);

  return NextResponse.json({
    products: products || [],
    categories: categories || [],
    brands: brands || [],
  });
}
