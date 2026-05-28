// Edge Function: kirim WA reminder pengembalian barang H-3 dari tanggal_estimasi_pengembalian
// Dipanggil oleh cron harian (atau manual untuk testing)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_ACCESS_TOKEN    = Deno.env.get("WHATSAPP_ACCESS_TOKEN")    || "";
const WHATSAPP_PHONE_NUMBER_ID  = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")  || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://hfqnlttxxrqarmpvtnhu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function toE164(nomor: string): string {
  if (nomor.startsWith('+')) return nomor.slice(1);
  if (nomor.startsWith('0')) return '62' + nomor.slice(1);
  return nomor;
}

async function kirimWATemplate(target: string, templateName: string, params: string[]) {
  try {
    const to = toE164(target);
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: "id" },
            components: params.length > 0
              ? [{ type: "body", parameters: params.map(p => ({ type: "text", text: p })) }]
              : [],
          },
        }),
      },
    );
    return res.ok;
  } catch (e) {
    console.error("Gagal kirim WA template:", e);
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

      // Normalize WA number ke format 62...
      const waTarget = lending.nomor_wa_peminjam.replace(/[^0-9]/g, '');

      const sent = await kirimWATemplate(
        waTarget,
        'notif_lending_reminder',
        [lending.nama_peminjam, tglEstimasi, daftarBarang],
      );

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
