import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function balasKeWA(nomorTujuan: string, isiPesan: string) {
  const params = new URLSearchParams();
  params.append("target", nomorTujuan);
  params.append("message", isiPesan);
  try {
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { "Authorization": FONNTE_TOKEN, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) { console.error("Gagal kontak Fonnte API:", err); }
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

    // --- LOGIKA 1: TIMEOUT 1 JAM (60 MENIT) ---
    if (diffInMinutes >= 60) {
      console.log(`[TIMEOUT] Menutup sesi ${user.nomor_wa} (Inaktif: ${diffInMinutes.toFixed(0)}m)`);
      
      const closingMsg = responses['SESSION_TIMEOUT'] || "Terima Kasih telah menghubungi Nikon Indonesia. Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan ketik *MENU* kapan saja untuk memulai chat dengan kami.";
      await balasKeWA(user.nomor_wa, closingMsg);

      // Reset status ke START dan matikan flag CS jika ada
      await supabase
        .from('konsumen')
        .update({ status_langkah: 'START' })
        .eq('nomor_wa', user.nomor_wa);
      
      await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', user.nomor_wa);
      
      results.push({ wa: user.nomor_wa, action: "CLOSED" });
    } 
    
    // --- LOGIKA 2: NUDGE / LANJUTKAN SKEMA (Misal: Inaktif 20 menit) ---
    else if (diffInMinutes >= 20 && user.status_langkah !== 'TALKING_TO_CS') {
      // Cek apakah sudah pernah diingatkan untuk step ini (agar tidak spam)
      const lastReminded = user.last_reminded_at ? new Date(user.last_reminded_at) : null;
      
      if (!lastReminded || lastReminded < updatedAt) {
        console.log(`[NUDGE] Mengirim pengingat skema ke ${user.nomor_wa}`);

        let nudgeMsg = "";
        const sapaanID = user.id_konsumen ? `(ID: *${user.id_konsumen}*)` : "";

        // Tentukan pesan berdasarkan langkah terakhir yang belum selesai
        switch (user.status_langkah) {
          case 'CLAIM_NAMA': nudgeMsg = responses['CLAIM_PROMPT_NAMA']; break;
          case 'CLAIM_ALAMAT': nudgeMsg = responses['CLAIM_PROMPT_ALAMAT']; break;
          case 'MENU3_INPUT_NIK': nudgeMsg = responses['GARANSI_PROMPT_NIK']; break;
          case 'MENUNGGU_UPLOAD_WEB': nudgeMsg = responses['CLAIM_WAIT_UPLOAD']; break;
          // Tambahkan mapping status lainnya sesuai kebutuhan...
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
          
          // Simpan riwayat pesan keluar
          await supabase.from('riwayat_pesan').insert({
            nomor_wa: user.nomor_wa,
            nama_profil_wa: "Sistem Bot",
            arah_pesan: 'OUT',
            isi_pesan: finalMsg,
            waktu_pesan: now.toISOString()
          });
        }

        // Update timestamp agar tidak terus menerus mengirim nudge di iterasi cron berikutnya
        await supabase.from('konsumen').update({ last_reminded_at: now.toISOString() }).eq('nomor_wa', user.nomor_wa);
        results.push({ wa: user.nomor_wa, action: "NUDGED" });
      }
    }
  }

  return new Response(JSON.stringify({ status: "success", processed: results }), { headers: { "Content-Type": "application/json" } });
});
