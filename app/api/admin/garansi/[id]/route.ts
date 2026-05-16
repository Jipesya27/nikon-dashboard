import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN || '';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function kirimWA(nomor: string, pesan: string) {
  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN },
      body: new URLSearchParams({ target: nomor, message: pesan }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* non-kritis */ }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabase();
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

    // Kirim notif WA ke konsumen jika status final
    const status = body.validasi_by_mkt || body.validasi_by_fa;
    if (status === 'Valid' || status === 'Tidak Valid') {
      const targetWa = data.nomor_wa_update || data.nomor_wa;
      if (targetWa) {
        const pesan = status === 'Valid'
          ? `✅ *Registrasi Garansi Anda DISETUJUI!*\n\nHalo ${data.nama_pendaftar},\n\nGaransi untuk produk *${data.tipe_barang}* (No. Seri: ${data.nomor_seri}) telah *terdaftar dan valid*.\n\nGaransi Anda aktif selama ${data.lama_garansi || '...'} dengan tipe ${data.jenis_garansi || '...'}. Terima kasih! 🎉`
          : `❌ *Registrasi Garansi Tidak Dapat Diproses*\n\nHalo ${data.nama_pendaftar},\n\nMohon maaf, registrasi garansi untuk produk *${data.tipe_barang}* tidak dapat diverifikasi.\n\nAlasan: ${body.catatan_mkt || body.catatan_fa || 'Data tidak sesuai'}\n\nHubungi CS kami untuk informasi lebih lanjut.`;
        await kirimWA(targetWa, pesan);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
