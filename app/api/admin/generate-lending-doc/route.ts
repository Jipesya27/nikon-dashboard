import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/app/lib/session';
import { generateLendingDoc } from '@/app/lib/generate-lending-doc';
import type { PeminjamanItem } from '@/app/index';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    type: 'pinjam' | 'kembali';
    kodePeminjaman?: string | null;
    namaPeminjam: string;
    nomorWa: string;
    items: PeminjamanItem[];
    tanggalPeminjaman?: string | null;
    tanggalEstimasi?: string | null;
    tanggalPengembalian?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await generateLendingDoc(body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[generate-lending-doc] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
