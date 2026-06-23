import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_ACCESS_TOKEN    = Deno.env.get("WHATSAPP_ACCESS_TOKEN")    || "";
const WHATSAPP_PHONE_NUMBER_ID  = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")  || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function toE164(nomor: string): string {
  if (nomor.startsWith('+')) return nomor.slice(1);
  if (nomor.startsWith('0')) return '62' + nomor.slice(1);
  return nomor;
}

async function balasKeWA(nomorTujuan: string, isiPesan: string) {
  // Pengguna masih dalam sesi aktif (last message < 60 menit) → free-form OK
  try {
    await fetch(
      `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toE164(nomorTujuan),
          type: "text",
          text: { body: isiPesan },
        }),
      },
    );
  } catch (err) { console.error("Gagal kirim WA:", err); }
}

function replacePlaceholders(template: string, data: Record<string, string>) {
  let result = template;
  for (const key in data) {
    result = result.split(`{{${key}}}`).join(data[key]);
  }
  // Convert literal \n to actual newline characters
  return result.replace(/\\n/g, '\n');
}

serve(async (req) => {
  console.log("[CRON] Memulai pengecekan sesi aktif...");

  // 1. Ambil semua konsumen yang sesinya belum selesai (status_langkah !== 'START')
  const { data: activeUsers, error } = await supabase
    .from('konsumen')
    .select('*')
    .neq('status_langkah', 'START');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const now = new Date();
  const results = [];

  // Ambil template pesan dari database agar konsisten dengan bot utama
  const { data: dbResponses } = await supabase.from('chatbot_responses').select('key, message');
  const responses: Record<string, string> = {};
  dbResponses?.forEach(r => { responses[r.key] = r.message; });

  for (const user of activeUsers) {
    const updatedAt = new Date(user.updated_at);
    const diffInMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);

    // ================================================================
    // LOGIKA KHUSUS: SESI CS (TALKING_TO_CS)
    // Cek inaktivitas berdasarkan pesan masuk terakhir dari konsumen,
    // bukan updated_at konsumen (yang bisa diubah oleh CS saat membalas).
    // ================================================================
    if (user.status_langkah === 'TALKING_TO_CS') {
      // Ambil waktu pesan IN terakhir dari konsumen ini
      const { data: lastInMsg } = await supabase
        .from('riwayat_pesan')
        .select('waktu_pesan')
        .eq('nomor_wa', user.nomor_wa)
        .eq('arah_pesan', 'IN')
        .order('waktu_pesan', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Jika tidak ada pesan IN sama sekali, gunakan updated_at sebagai fallback
      const lastInTime = lastInMsg ? new Date(lastInMsg.waktu_pesan) : updatedAt;
      const inaktifMenit = (now.getTime() - lastInTime.getTime()) / (1000 * 60);
      const lastReminded = user.last_reminded_at ? new Date(user.last_reminded_at) : null;
      // Warning sudah dikirim jika last_reminded_at lebih baru dari pesan IN terakhir
      const warningTerkirim = lastReminded && lastReminded > lastInTime;

      if (warningTerkirim && inaktifMenit >= 70) {
        // --- TUTUP SESI CS: 10 menit setelah warning, masih tidak ada balasan ---
        console.log(`[CS_TIMEOUT] Menutup sesi CS ${user.nomor_wa} (${inaktifMenit.toFixed(0)}m tanpa balasan)`);

        const closingMsg = responses['CS_SESSION_CLOSED'] ||
          `Baik, karena tidak ada pesan lanjutan, sesi percakapan ini telah kami *akhiri secara otomatis*.\n\nTerima kasih telah menghubungi *Nikon Indonesia* — kami senang bisa membantu Anda. 🙏\n\nJika sewaktu-waktu ada yang ingin ditanyakan kembali, ketik *MENU* untuk memulai percakapan baru. Sampai jumpa! 😊`;

        await balasKeWA(user.nomor_wa, closingMsg);
        await supabase.from('riwayat_pesan').insert({
          nomor_wa: user.nomor_wa,
          nama_profil_wa: 'Sistem Bot',
          arah_pesan: 'OUT',
          isi_pesan: closingMsg,
          waktu_pesan: now.toISOString(),
          jenis_pesan: 'system',
        });

        await supabase.from('konsumen').update({ status_langkah: 'START', last_reminded_at: null }).eq('nomor_wa', user.nomor_wa);
        await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', user.nomor_wa);

        results.push({ wa: user.nomor_wa, action: 'CS_CLOSED' });

      } else if (!warningTerkirim && inaktifMenit >= 60) {
        // --- KIRIM WARNING: Konsumen diam 1 jam, beri tahu sesi hampir ditutup ---
        console.log(`[CS_WARNING] Kirim peringatan ke ${user.nomor_wa} (${inaktifMenit.toFixed(0)}m tanpa balasan)`);

        const namaKonsumen = user.nama_lengkap || 'Anda';
        const warningMsg = responses['CS_SESSION_WARNING'] ||
          `Halo *${namaKonsumen}* 👋\n\nKami perhatikan sudah cukup lama tidak ada pesan dari Anda dalam sesi ini.\n\nJika memang sudah tidak ada lagi yang ingin disampaikan dan percakapan ini telah membantu, sesi ini akan *otomatis ditutup dalam 10 menit* ke depan.\n\nNamun jika masih ada yang ingin Anda tanyakan atau sampaikan, silakan kirim pesan sekarang — kami siap membantu. 🙏\n\n_Nikon Indonesia Customer Service_`;

        await balasKeWA(user.nomor_wa, warningMsg);
        await supabase.from('riwayat_pesan').insert({
          nomor_wa: user.nomor_wa,
          nama_profil_wa: 'Sistem Bot',
          arah_pesan: 'OUT',
          isi_pesan: warningMsg,
          waktu_pesan: now.toISOString(),
          jenis_pesan: 'system',
        });

        await supabase.from('konsumen').update({ last_reminded_at: now.toISOString() }).eq('nomor_wa', user.nomor_wa);
        results.push({ wa: user.nomor_wa, action: 'CS_WARNING_SENT' });
      }

      // Jika konsumen membalas setelah warning → last_reminded_at < lastInTime → loop ini skip,
      // warning akan dikirim ulang hanya jika inaktif 60 menit lagi.
      continue;
    }

    // ================================================================
    // LOGIKA UMUM: NON-CS SESSION
    // ================================================================

    // --- LOGIKA 1: TIMEOUT 1 JAM (60 MENIT) ---
    if (diffInMinutes >= 60) {
      console.log(`[TIMEOUT] Menutup sesi ${user.nomor_wa} (Inaktif: ${diffInMinutes.toFixed(0)}m)`);

      const closingMsg = responses['SESSION_TIMEOUT'] || "Terima Kasih telah menghubungi Nikon Indonesia. Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan ketik *MENU* kapan saja untuk memulai chat dengan kami.";
      await balasKeWA(user.nomor_wa, closingMsg);

      await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', user.nomor_wa);
      await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', user.nomor_wa);

      results.push({ wa: user.nomor_wa, action: "CLOSED" });
    }

    // --- LOGIKA 2: NUDGE / LANJUTKAN SKEMA (Inaktif 20 menit) ---
    else if (diffInMinutes >= 20) {
      const lastReminded = user.last_reminded_at ? new Date(user.last_reminded_at) : null;

      if (!lastReminded || lastReminded < updatedAt) {
        console.log(`[NUDGE] Mengirim pengingat skema ke ${user.nomor_wa}`);

        let nudgeMsg = "";
        const sapaanID = user.id_konsumen ? `(ID: *${user.id_konsumen}*)` : "";

        switch (user.status_langkah) {
          case 'CLAIM_NAMA': nudgeMsg = responses['CLAIM_PROMPT_NAMA']; break;
          case 'CLAIM_ALAMAT': nudgeMsg = responses['CLAIM_PROMPT_ALAMAT']; break;
          case 'MENU3_INPUT_NIK': nudgeMsg = responses['GARANSI_PROMPT_NIK']; break;
          case 'MENUNGGU_UPLOAD_WEB': nudgeMsg = responses['CLAIM_WAIT_UPLOAD']; break;
          default:
            nudgeMsg = responses['GENERIC_NUDGE'] || `Halo *{{nama}}*, Anda belum menyelesaikan pengisian data sebelumnya. Silakan lanjutkan atau ketik *MENU* untuk kembali ke menu utama.`;
        }

        if (nudgeMsg) {
          const finalMsg = replacePlaceholders(nudgeMsg, {
            nama: user.nama_lengkap || "Konsumen",
            id_sapaan: sapaanID,
            phone: user.nomor_wa
          });

          await balasKeWA(user.nomor_wa, finalMsg);
          await supabase.from('riwayat_pesan').insert({
            nomor_wa: user.nomor_wa,
            nama_profil_wa: "Sistem Bot",
            arah_pesan: 'OUT',
            isi_pesan: finalMsg,
            waktu_pesan: now.toISOString()
          });
        }

        await supabase.from('konsumen').update({ last_reminded_at: now.toISOString() }).eq('nomor_wa', user.nomor_wa);
        results.push({ wa: user.nomor_wa, action: "NUDGED" });
      }
    }
  }

  return new Response(JSON.stringify({ status: "success", processed: results }), { headers: { "Content-Type": "application/json" } });
});
