import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { sendNotif } from '@/app/lib/notify';
import { getAuditUser, writeAuditLog } from '@/app/lib/audit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabase();
    const cookieStore = await cookies();
    const auditUser = getAuditUser(cookieStore);
    const { id } = await params;
    const body = await req.json() as Record<string, string>;

    const allowed = ['validasi_by_mkt', 'validasi_by_fa', 'catatan_mkt', 'catatan_fa'];
    const update: Record<string, string> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const { data, error } = await supabase
      .from('claim_promo')
      .update(update)
      .eq('id_claim', id)
      .select()
      .single();

    if (error) throw error;

    void writeAuditLog({ user_name: auditUser, action: 'update', table_name: 'claim_promo', record_id: id, new_values: update });

    // Kirim notif ke konsumen jika status final
    const status = body.validasi_by_mkt || body.validasi_by_fa;
    if (status === 'Valid' || status === 'Tidak Valid') {
      const targetWa = data.nomor_wa_update || data.nomor_wa;
      if (targetWa) {
        const namaPenerima = data.nama_penerima_claim || data.nama_pendaftar || '-';
        const pesan = status === 'Valid'
          ? `Halo ${namaPenerima}, klaim promo untuk produk ${data.tipe_barang} (No. Seri: ${data.nomor_seri}) telah DISETUJUI. Hadiah akan segera diproses ke alamat pengiriman yang Anda daftarkan. Terima kasih!`
          : `Halo ${namaPenerima}, mohon maaf klaim promo untuk produk ${data.tipe_barang} tidak dapat diverifikasi. Alasan: ${body.catatan_mkt || body.catatan_fa || 'Data tidak sesuai'}. Hubungi CS kami untuk informasi lebih lanjut.`;

        // Ambil email konsumen dari tabel konsumen
        const supabaseClient = getSupabase();
        const { data: konsumenRow } = await supabaseClient
          .from('konsumen')
          .select('email')
          .eq('nomor_wa', data.nomor_wa)
          .maybeSingle();
        const konsumenEmail: string | null = konsumenRow?.email || null;

        const subjek = status === 'Valid'
          ? '✅ Claim Promo Anda Disetujui — Nikon'
          : '❌ Claim Promo Tidak Dapat Diproses — Nikon';

        const alasan = body.catatan_mkt || body.catatan_fa || 'Data tidak sesuai';
        const waTemplate = status === 'Valid'
          ? { name: 'notif_claim_approved', params: [namaPenerima, data.tipe_barang, data.nomor_seri] }
          : { name: 'notif_claim_rejected', params: [namaPenerima, data.tipe_barang, alasan] };

        await sendNotif({ phone: targetWa, email: konsumenEmail, message: pesan, subject: subjek, waTemplate });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
