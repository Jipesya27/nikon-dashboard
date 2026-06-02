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


function claimStatus(mkt: string | null, fa: string | null): { label: string; color: string } {
  if (!mkt && !fa)                                       return { label: 'Menunggu Review',     color: 'yellow'  };
  if (mkt === 'Valid' && fa === 'Valid')                 return { label: 'Disetujui',           color: 'green'   };
  if (mkt === 'Tidak Valid' || fa === 'Tidak Valid')     return { label: 'Tidak Valid',         color: 'red'     };
  if (mkt === 'Valid' && !fa)                            return { label: 'Verifikasi FA',       color: 'blue'    };
  return { label: 'Sedang Diproses', color: 'yellow' };
}

// GET /api/cek-status?serial=xxx&type=claim|garansi
export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const serial = searchParams.get('serial')?.trim() || '';
    const type   = searchParams.get('type') === 'garansi' ? 'garansi' : 'claim';

    if (!serial || serial.length < 3) {
      return NextResponse.json({ error: 'Nomor seri tidak valid (minimal 3 karakter).' }, { status: 400 });
    }

    if (type === 'claim') {
      const { data: rows } = await supabase
        .from('claim_promo')
        .select('id_claim, tipe_barang, nomor_seri, jenis_promosi, tanggal_pembelian, created_at, validasi_by_mkt, validasi_by_fa, nama_penerima_claim')
        .ilike('nomor_seri', serial)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ found: false, message: 'Tidak ada data claim untuk nomor seri ini.' });
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
    const { data: rows } = await supabase
      .from('garansi')
      .select('id, tipe_barang, nomor_seri, tanggal_pembelian, created_at, status_validasi, validasi_by_mkt, validasi_by_fa')
      .ilike('nomor_seri', serial)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ found: false, message: 'Tidak ada data garansi untuk nomor seri ini.' });
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
