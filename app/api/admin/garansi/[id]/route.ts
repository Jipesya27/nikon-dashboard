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

    const allowed = ['validasi_by_mkt', 'validasi_by_fa', 'catatan_mkt', 'catatan_fa', 'jenis_garansi', 'lama_garansi', 'status_validasi'];
    const update: Record<string, string> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const { data, error } = await supabase
      .from('garansi')
      .update(update)
      .eq('id_garansi', id)
      .select()
      .single();

    if (error) throw error;

    void writeAuditLog({ user_name: auditUser, action: 'update', table_name: 'garansi', record_id: id, new_values: update });

    // Kirim notif ke konsumen jika status final
    const status = body.validasi_by_mkt || body.validasi_by_fa;
    if (status === 'Valid' || status === 'Tidak Valid') {
      const targetWa = data.nomor_wa_update || data.nomor_wa;
      if (targetWa) {
        const pesan = status === 'Valid'
          ? `Halo ${data.nama_pendaftar}, registrasi garansi untuk produk ${data.tipe_barang} (No. Seri: ${data.nomor_seri}) telah DISETUJUI. Garansi aktif selama ${data.lama_garansi || '-'} dengan tipe ${data.jenis_garansi || '-'}. Terima kasih!`
          : `Halo ${data.nama_pendaftar}, mohon maaf registrasi garansi untuk produk ${data.tipe_barang} tidak dapat diverifikasi. Alasan: ${body.catatan_mkt || body.catatan_fa || 'Data tidak sesuai'}. Hubungi CS kami untuk informasi lebih lanjut.`;

        // Ambil email konsumen dari tabel konsumen
        const supabaseClient = getSupabase();
        const { data: konsumenRow } = await supabaseClient
          .from('konsumen')
          .select('email')
          .eq('nomor_wa', data.nomor_wa)
          .maybeSingle();
        const konsumenEmail: string | null = konsumenRow?.email || null;

        const subjek = status === 'Valid'
          ? '✅ Registrasi Garansi Anda Disetujui — Nikon'
          : '❌ Registrasi Garansi Tidak Dapat Diproses — Nikon';

        const alasan = body.catatan_mkt || body.catatan_fa || 'Data tidak sesuai';
        const waTemplate = status === 'Valid'
          ? { name: 'notif_garansi_approved', params: [data.nama_pendaftar || '-', data.tipe_barang, data.nomor_seri, data.lama_garansi || '-', data.jenis_garansi || '-'] }
          : { name: 'notif_garansi_rejected', params: [data.nama_pendaftar || '-', data.tipe_barang, alasan] };

        await sendNotif({ phone: targetWa, email: konsumenEmail, message: pesan, subject: subjek, waTemplate });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
