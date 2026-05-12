// Edge Function: kirim WA reminder pengembalian barang H-3 dari tanggal_estimasi_pengembalian
// Dipanggil oleh cron harian (atau manual untuk testing)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN") || "xYsGrYetdkLXoK72dDtc";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://hfqnlttxxrqarmpvtnhu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function kirimWA(target: string, pesan: string) {
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: FONNTE_TOKEN, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ target, message: pesan }).toString(),
    });
    return res.ok;
  } catch (e) {
    console.error("Gagal kirim WA:", e);
    return false;
  }
}

function formatTanggalID(iso: string): string {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(iso);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

serve(async (req) => {
  // Allow manual trigger via GET / POST / cron
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysEnd = new Date(threeDaysFromNow);
  threeDaysEnd.setHours(23, 59, 59, 999);

  console.log(`[REMINDER] Cek peminjaman aktif dengan estimasi pengembalian ${threeDaysFromNow.toISOString()} - ${threeDaysEnd.toISOString()}`);

  // Cari peminjaman aktif dengan estimasi 3 hari dari sekarang & reminder belum dikirim
  const { data: lendings, error } = await supabase
    .from('peminjaman_barang')
    .select('id_peminjaman, nomor_wa_peminjam, nama_peminjam, tanggal_estimasi_pengembalian, items_dipinjam')
    .eq('status_peminjaman', 'aktif')
    .is('reminder_sent_at', null)
    .gte('tanggal_estimasi_pengembalian', threeDaysFromNow.toISOString())
    .lte('tanggal_estimasi_pengembalian', threeDaysEnd.toISOString());

  if (error) {
    console.error('[REMINDER] Error query:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`[REMINDER] Menemukan ${lendings?.length ?? 0} peminjaman yang perlu di-reminder`);

  const results: Array<{ id: string; sent: boolean; error?: string }> = [];

  for (const lending of (lendings ?? [])) {
    try {
      const items = (lending.items_dipinjam as Array<{ nama_barang: string; nomor_seri: string }>) || [];
      const itemsActive = items.filter(i => i && (!('status_pengembalian' in i) || (i as { status_pengembalian?: string }).status_pengembalian !== 'dikembalikan'));
      if (itemsActive.length === 0) {
        // Semua sudah dikembalikan, skip & mark agar tidak dicek lagi
        await supabase.from('peminjaman_barang')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id_peminjaman', lending.id_peminjaman);
        results.push({ id: lending.id_peminjaman, sent: false, error: 'no active items' });
        continue;
      }

      const daftarBarang = itemsActive
        .map((it, idx) => `${idx + 1}. *${it.nama_barang}* (SN: ${it.nomor_seri})`)
        .join('\n');

      const tglEstimasi = formatTanggalID(lending.tanggal_estimasi_pengembalian);

      const pesan = `Halo *${lending.nama_peminjam}*,\n\n📅 *Reminder Pengembalian Barang*\n\nKami ingin mengingatkan bahwa barang yang Anda pinjam dijadwalkan kembali pada:\n*${tglEstimasi}* (3 hari lagi)\n\nDaftar barang:\n${daftarBarang}\n\nMohon segera dikembalikan sesuai jadwal. Jika perlu perpanjangan, silakan hubungi kami.\n\nTerima kasih atas kerja samanya. 🙏`;

      // Normalize WA number ke format 62...
      let waTarget = lending.nomor_wa_peminjam.replace(/[^0-9]/g, '');
      if (waTarget.startsWith('0')) waTarget = '62' + waTarget.slice(1);

      const sent = await kirimWA(waTarget, pesan);

      // Mark sebagai sudah dikirim (mau berhasil atau gagal supaya tidak spam)
      await supabase.from('peminjaman_barang')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id_peminjaman', lending.id_peminjaman);

      results.push({ id: lending.id_peminjaman, sent });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: lending.id_peminjaman, sent: false, error: msg });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    checked: lendings?.length ?? 0,
    results,
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
