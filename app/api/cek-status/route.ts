import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env belum di-set.');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function normalizePhone(phone: string): string[] {
  const p = phone.replace(/[^0-9]/g, '');
  const variants = [p];
  if (p.startsWith('62'))       variants.push('0' + p.slice(2), '+' + p);
  else if (p.startsWith('0'))   variants.push('62' + p.slice(1), '+62' + p.slice(1));
  else if (p.startsWith('+62')) variants.push(p.slice(1), '0' + p.slice(3));
  return [...new Set(variants)];
}

function claimStatus(mkt: string | null, fa: string | null): { label: string; color: string } {
  if (!mkt && !fa)                                       return { label: 'Menunggu Review',     color: 'yellow'  };
  if (mkt === 'Valid' && fa === 'Valid')                 return { label: 'Disetujui',           color: 'green'   };
  if (mkt === 'Tidak Valid' || fa === 'Tidak Valid')     return { label: 'Tidak Valid',         color: 'red'     };
  if (mkt === 'Valid' && !fa)                            return { label: 'Verifikasi FA',       color: 'blue'    };
  return { label: 'Sedang Diproses', color: 'yellow' };
}

// GET /api/cek-status?phone=628xxx&type=claim|garansi
export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone')?.trim() || '';
    const type     = searchParams.get('type') === 'garansi' ? 'garansi' : 'claim';

    if (!rawPhone || rawPhone.replace(/[^0-9]/g, '').length < 8) {
      return NextResponse.json({ error: 'Nomor WA tidak valid (minimal 8 digit).' }, { status: 400 });
    }

    const variants = normalizePhone(rawPhone);

    if (type === 'claim') {
      // Cari di semua varian nomor
      let rows: Record<string, unknown>[] = [];
      for (const v of variants) {
        const { data } = await supabase
          .from('claim_promo')
          .select('id_claim, tipe_barang, nomor_seri, jenis_promosi, tanggal_pembelian, created_at, validasi_by_mkt, validasi_by_fa, nama_penerima_claim')
          .eq('nomor_wa', v)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data && data.length > 0) { rows = data; break; }
      }

      if (rows.length === 0) {
        return NextResponse.json({ found: false, message: 'Tidak ada data claim untuk nomor ini.' });
      }

      const result = rows.map(r => ({
        id:          r.id_claim,
        produk:      r.tipe_barang,
        nomor_seri:  r.nomor_seri,
        promosi:     r.jenis_promosi || '-',
        tgl_beli:    r.tanggal_pembelian || '-',
        tgl_daftar:  r.created_at,
        penerima:    r.nama_penerima_claim || '-',
        ...claimStatus(r.validasi_by_mkt as string | null, r.validasi_by_fa as string | null),
      }));

      return NextResponse.json({ found: true, type: 'claim', data: result });
    }

    // garansi
    let rows: Record<string, unknown>[] = [];
    for (const v of variants) {
      const { data } = await supabase
        .from('garansi')
        .select('id, tipe_barang, nomor_seri, tanggal_pembelian, created_at, status_validasi, validasi_by_mkt, validasi_by_fa')
        .eq('nomor_wa', v)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) { rows = data; break; }
    }

    if (rows.length === 0) {
      return NextResponse.json({ found: false, message: 'Tidak ada data garansi untuk nomor ini.' });
    }

    const result = rows.map(r => {
      const sv = (r.status_validasi as string) || '';
      let color = 'yellow';
      if (sv === 'Valid')              color = 'green';
      else if (sv === 'Tidak Valid')   color = 'red';
      else if (sv === 'Proses Validasi' || !sv) color = 'yellow';
      return {
        id:         r.id,
        produk:     r.tipe_barang,
        nomor_seri: r.nomor_seri,
        tgl_beli:   r.tanggal_pembelian || '-',
        tgl_daftar: r.created_at,
        label:      sv || 'Menunggu Review',
        color,
      };
    });

    return NextResponse.json({ found: true, type: 'garansi', data: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
