import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN") || "xYsGrYetdkLXoK72dDtc";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://hfqnlttxxrqarmpvtnhu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Fungsi Generate ID (AN + 6 Digit Random)
function generateKonsumenID() {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `AN${randomDigits}`;
}
function isOperatingHours() {
  const now = new Date();
  const jakartaTime = new Date(now.toLocaleString("en-US", {
    timeZone: "Asia/Jakarta"
  }));
  const day = jakartaTime.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hour = jakartaTime.getHours();
  if (day >= 1 && day <= 5) {
    return hour >= 10 && hour < 16;
  } else if (day === 6) {
    return hour >= 10 && hour < 12;
  }
  return false;
}
function replacePlaceholders(template, data) {
  let result = template;
  for(const key in data){
    result = result.split(`{{${key}}}`).join(data[key]);
  }
  // Convert literal \n to actual newline characters
  return result.replace(/\\n/g, '\n');
}
async function balasKeWA(nomorTujuan, isiPesan, urlFile) {
  const params = new URLSearchParams();
  params.append("target", nomorTujuan);
  params.append("message", isiPesan);
  if (urlFile) params.append("url", urlFile);
  try {
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": FONNTE_TOKEN,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
  } catch (err) {
    console.error("Gagal kontak Fonnte API:", err);
  }
}
async function logErrorToDB(context: string, message: string, detail: unknown) {
  try {
    const payload = JSON.stringify({ context, message, detail, ts: new Date().toISOString() });
    await supabase.from('pengaturan_bot').upsert(
      { nama_pengaturan: 'bot_last_error', description: payload },
      { onConflict: 'nama_pengaturan' }
    );
  } catch (_) { /* silent — jangan sampai logging loop */ }
}

async function logSuccessToDB() {
  try {
    await supabase.from('pengaturan_bot').upsert(
      { nama_pengaturan: 'bot_last_success', description: new Date().toISOString() },
      { onConflict: 'nama_pengaturan' }
    );
  } catch (_) { /* silent */ }
}

serve(async (req)=>{
  // ── Health check endpoint ──────────────────────────────────────
  if (req.method === 'GET') {
    const { data: lastErr } = await supabase
      .from('pengaturan_bot')
      .select('description')
      .eq('nama_pengaturan', 'bot_last_error')
      .maybeSingle();
    const { data: lastOk } = await supabase
      .from('pengaturan_bot')
      .select('description')
      .eq('nama_pengaturan', 'bot_last_success')
      .maybeSingle();
    const { data: lastMsg } = await supabase
      .from('riwayat_pesan')
      .select('waktu_pesan, isi_pesan')
      .eq('arah_pesan', 'OUT')
      .order('waktu_pesan', { ascending: false })
      .limit(1)
      .maybeSingle();
    return new Response(JSON.stringify({
      status: 'ok',
      last_success: lastOk?.description ?? null,
      last_error: lastErr?.description ? JSON.parse(lastErr.description) : null,
      last_bot_reply: lastMsg ?? null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  console.log("[INDICATOR 1] Webhook diterima. Method:", req.method);
  if (req.method !== 'POST') return new Response('Method not allowed', {
    status: 405
  });
  try {
    const contentType = req.headers.get("content-type") || "";
    console.log("[INDICATOR 2] Content-Type:", contentType);
    let body;
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // Fonnte terkadang mengirim dalam format form-data/url-encoded
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    }
    console.log("[INDICATOR 3] Payload Body:", JSON.stringify(body));
    const nomorPengirim = body.sender;
    const isiPesanWA = (body.message || "").trim();
    const namaProfil = body.name || "Konsumen";
    const waktuSekarang = new Date().toISOString();
    if (!nomorPengirim) {
      console.error("[INDICATOR 4] Error: Nomor pengirim (sender) tidak ditemukan dalam payload.");
      return new Response(JSON.stringify({
        error: "sender field missing"
      }), {
        status: 400
      });
    }
    // ================================================================
    // STEP 1: Pastikan konsumen ada DULU (karena riwayat_pesan punya FK ke konsumen)
    // ================================================================
    console.log("[INDICATOR 5] Cek/buat konsumen untuk:", nomorPengirim);
    let { data: user, error: userError } = await supabase.from('konsumen').select('*').eq('nomor_wa', nomorPengirim).single();
    if (userError && userError.code !== 'PGRST116') {
      console.error("[INDICATOR 5b] Error saat cari konsumen:", userError);
    }
    let createErr_global = null;
    if (!user) {
      const newID = generateKonsumenID();
      console.log("[INDICATOR 5c] User baru, membuat konsumen dengan ID:", newID);
      const { error: createErr } = await supabase.from('konsumen').insert({
        nomor_wa: nomorPengirim,
        id_konsumen: newID,
        status_langkah: 'START',
        nama_lengkap: namaProfil,
        nik: "BELUM_DIISI",
        alamat_rumah: "BELUM_DIISI",
        kelurahan: "BELUM_DIISI",
        kecamatan: "BELUM_DIISI",
        kabupaten_kotamadya: "BELUM_DIISI",
        provinsi: "BELUM_DIISI",
        kodepos: "BELUM_DIISI"
      });
      if (createErr) {
        createErr_global = createErr;
        console.error("[INDICATOR 5d] Gagal buat konsumen:", createErr);
      } else {
        user = {
          status_langkah: 'START',
          id_konsumen: newID,
          alamat_rumah: null,
          nama_lengkap: namaProfil,
          nik: null
        };
      }
    } else if (!user.id_konsumen) {
      const newID = generateKonsumenID();
      await supabase.from('konsumen').update({
        id_konsumen: newID
      }).eq('nomor_wa', nomorPengirim);
      user.id_konsumen = newID;
    }
    // ================================================================
    // STEP 2: Sekarang aman insert ke riwayat_pesan (FK sudah terpenuhi)
    // ================================================================
    console.log("[INDICATOR 6] Menyimpan pesan masuk ke riwayat_pesan...");
    const { data: insertedData, error: insertError } = await supabase.from('riwayat_pesan').insert({
      nomor_wa: nomorPengirim,
      nama_profil_wa: namaProfil,
      arah_pesan: 'IN',
      isi_pesan: isiPesanWA || "[Media/File]",
      waktu_pesan: waktuSekarang
    }).select();
    if (insertError) {
      console.error("[INDICATOR 6b] Gagal simpan riwayat_pesan:", insertError);
    } else {
      console.log("[INDICATOR 6c] Berhasil simpan riwayat_pesan:", JSON.stringify(insertedData));
    }
    // ================================================================
    // STEP 3: Proses logika bot
    // ================================================================
    let balasanBot = "";
    let urlFileKirim = "";
    // Fetch chatbot responses
    const { data: dbResponses } = await supabase.from('chatbot_responses').select('key, message');
    const responses = {};
    dbResponses?.forEach((r)=>{
      responses[r.key] = r.message;
    });
    const getMsg = (key, fallback, data = {})=>{
      const template = responses[key] || fallback;
      return replacePlaceholders(template, data);
    };
    // Guard: jika user masih null (gagal dibuat), kembalikan success tanpa balas
    if (!user) {
      console.error("[INDICATOR 7] User null setelah upsert, skip logika bot.");
      return new Response(JSON.stringify({
        status: "error",
        indicator: "USER_NULL",
        error_detail: createErr_global
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    let statusSaatIni = user.status_langkah;
    const sapaanID = user.id_konsumen ? `(ID: *${user.id_konsumen}*)` : "";
    if (isiPesanWA && (isiPesanWA.toUpperCase() === "MENU" || isiPesanWA.toLowerCase() === "halo")) {
      await supabase.from('konsumen').update({
        status_langkah: 'START'
      }).eq('nomor_wa', nomorPengirim);
      await supabase.from('riwayat_pesan').update({
        bicara_dengan_cs: false
      }).eq('nomor_wa', nomorPengirim);
      balasanBot = getMsg('MAIN_MENU', `Hi *{{nama_user}}* {{sapaan_id}},\nSelamat datang di layanan *Nikon Indonesia*.\nSilakan ketik Nomor Menu berikut sesuai kebutuhan Anda...`, {
        nama_user: user.nama_lengkap || namaProfil,
        sapaan_id: sapaanID
      });
    } else if (statusSaatIni === 'TALKING_TO_CS') {
      // Jika sedang bicara dengan CS, chatbot diam (tidak intervensi)
      console.log(`[CS_MODE] Mengabaikan pesan dari ${nomorPengirim} karena sedang dalam mode CS.`);
      return new Response(JSON.stringify({
        status: "success",
        message: "Chatbot silent in CS mode"
      }), {
        status: 200
      });
    } else {
      // Refactor from a long if-else chain to a switch statement for better readability
      switch(statusSaatIni){
        case 'START':
          switch(isiPesanWA){
            case "1":
              // Langsung kirim link form web (penerima ditentukan di dalam form)
              balasanBot = getMsg('CLAIM_WEB_FORM_REDIRECT', 'Baik, silakan lanjutkan pengisian data Claim Promo dan unggah dokumen Anda melalui tautan aman berikut ini:\n\n👉 https://nikonindonesia-altanikindo.vercel.app/claim?phone={{phone}}\n\nDi dalam form Anda dapat memilih apakah claim untuk *diri sendiri* atau *orang lain*. Setelah selesai, Anda akan menerima konfirmasi melalui WhatsApp.', {
                phone: nomorPengirim
              });
              await supabase.from('konsumen').update({
                status_langkah: 'MENUNGGU_UPLOAD_WEB'
              }).eq('nomor_wa', nomorPengirim);
              break;
            case "2":
              balasanBot = getMsg('CLAIM_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Seri* barang Anda untuk mengecek Status Claim Anda :");
              await supabase.from('konsumen').update({
                status_langkah: 'MENUNGGU_SERI_CLAIM'
              }).eq('nomor_wa', nomorPengirim);
              break;
            case "3":
              balasanBot = getMsg('GARANSI_WEB_FORM_REDIRECT', 'Baik, silakan lanjutkan pendaftaran *Garansi Nikon* dan unggah dokumen Anda melalui tautan aman berikut:\n\n👉 https://nikonindonesia-altanikindo.vercel.app/garansi?phone={{phone}}\n\nPengisian data Garansi akan mempermudah Anda saat melakukan service di Nikon Pusat Service dan mendapatkan benefit service.', {
                phone: nomorPengirim
              });
              await supabase.from('konsumen').update({
                status_langkah: 'MENUNGGU_UPLOAD_GARANSI_WEB'
              }).eq('nomor_wa', nomorPengirim);
              break;
            case "4":
              balasanBot = getMsg('GARANSI_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Seri* barang Anda untuk mengecek Status Garansi:");
              await supabase.from('konsumen').update({
                status_langkah: 'MENUNGGU_SERI_GARANSI'
              }).eq('nomor_wa', nomorPengirim);
              break;
            case "5":
              balasanBot = getMsg('SERVICE_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Tanda Terima Service* Anda:");
              await supabase.from('konsumen').update({
                status_langkah: 'MENUNGGU_RESI_SERVICE'
              }).eq('nomor_wa', nomorPengirim);
              break;
            case "6":
              const { data: pengaturanPromo } = await supabase.from('pengaturan_bot').select('url_file').eq('nama_pengaturan', 'promo_nikon').single();
              balasanBot = pengaturanPromo?.url_file ? `Berikut Promo Nikon yang sedang berlangsung:\n\n👉 ${pengaturanPromo.url_file}` : getMsg('PROMO_KOSONG', "Mohon maaf, sedang tidak ada promo.");
              break;
            case "7":
              balasanBot = getMsg('ALAMAT_SERVICE_CENTER', "*Nikon Pusat Service*\nKomplek Mangga Dua Square Blok H, No.1-2,\nJl. Layang, RT.12/RW.6, Ancol,\nKec. Pademangan, Jakarta Utara,\nDKI Jakarta 14430\n\n📍 Maps :\nhttps://maps.app.goo.gl/ysK9hvkm37bxoYGY9");
              break;
            case "8":
              const { data: pengaturan } = await supabase.from('pengaturan_bot').select('url_file').eq('nama_pengaturan', 'dealer_resmi').single();
              balasanBot = pengaturan?.url_file ? `Daftar Dealer Resmi Nikon:\n👉 ${pengaturan.url_file}` : getMsg('DEALER_BELUM_ADA', "Daftar Dealer sedang pembaruan.");
              break;
            case "9":
              if (!isOperatingHours()) {
                balasanBot = getMsg('CS_OFFLINE', "Mohon maaf waktu operasional CS adalah :\nSenin-Jumat : 10.00-16.00 WIB\nSabtu : 10.00-12.00 WIB\n\nPesan Anda akan kami balas pada hari dan jam operasional.");
              } else {
                balasanBot = getMsg('CS_WAITING', "Mohon tunggu, kami sedang menugaskan CS untuk melayani Anda.");
                await supabase.from('konsumen').update({
                  status_langkah: 'TALKING_TO_CS'
                }).eq('nomor_wa', nomorPengirim);
                await supabase.from('riwayat_pesan').update({
                  bicara_dengan_cs: true
                }).eq('nomor_wa', nomorPengirim);
              }
              break;
            default:
              balasanBot = getMsg('WELCOME_NO_MENU', "Selamat datang di Nikon Indonesia, ketik MENU untuk memulai chat");
              break;
          }
          break;
        // Legacy state: redirect ke web form (sudah tidak ditanyakan via chat)
        case 'CLAIM_CHOOSE_RECIPIENT':
          balasanBot = getMsg('CLAIM_WEB_FORM_REDIRECT', 'Baik, silakan lanjutkan pengisian data Claim Promo dan unggah dokumen Anda melalui tautan aman berikut ini:\n\n👉 https://nikonindonesia-altanikindo.vercel.app/claim?phone={{phone}}\n\nDi dalam form Anda dapat memilih apakah claim untuk *diri sendiri* atau *orang lain*.', {
            phone: nomorPengirim
          });
          await supabase.from('konsumen').update({
            status_langkah: 'MENUNGGU_UPLOAD_WEB'
          }).eq('nomor_wa', nomorPengirim);
          break;
        // Setelah submit form, bot tanya nomor WA mana yang dipakai untuk notifikasi update
        case 'TANYA_UPDATE_WA':
          if (isiPesanWA.toUpperCase() === "INI") {
            // Pakai nomor WA pengirim sebagai nomor update
            await supabase.from('claim_promo').update({
              nomor_wa_update: nomorPengirim
            }).eq('nomor_wa', nomorPengirim).order('created_at', {
              ascending: false
            }).limit(1);
            balasanBot = `Baik, notifikasi update status Claim akan kami kirim ke nomor WhatsApp ini ✅\n\nProses verifikasi Claim memerlukan waktu maksimal 14 hari kerja.\n\n━━━━━━━━━━━━━━━━━━━━\n*Sekalian daftarkan Garansi Nikon?*\nData pembelian Anda akan otomatis terisi dari Claim. Anda tinggal melengkapi NIK dan upload ulang dokumen.\n\nBalas *YA* atau *TIDAK*.`;
            await supabase.from('konsumen').update({
              status_langkah: 'OFFER_GARANSI_AFTER_CLAIM'
            }).eq('nomor_wa', nomorPengirim);
          } else if (isiPesanWA.toUpperCase() === "NOMOR LAIN") {
            balasanBot = getMsg('CLAIM_NOTIF_PROMPT_NOMOR', "Silakan masukkan *Nomor WhatsApp* yang akan menerima notifikasi update status Claim (contoh: 6281234567890):");
            await supabase.from('konsumen').update({
              status_langkah: 'TANYA_UPDATE_WA_INPUT'
            }).eq('nomor_wa', nomorPengirim);
          } else {
            balasanBot = getMsg('CLAIM_NOTIF_ERROR', "Mohon balas dengan *INI* atau *NOMOR LAIN*.");
          }
          break;
        // Konsumen ketik nomor WA tujuan notifikasi
        case 'TANYA_UPDATE_WA_INPUT':
          {
            const nomorUpdate = isiPesanWA.replace(/[^0-9]/g, '');
            if (nomorUpdate.length < 10 || nomorUpdate.length > 15) {
              balasanBot = getMsg('CLAIM_NOTIF_INVALID', "Format nomor tidak valid. Silakan masukkan nomor WhatsApp dengan format angka (contoh: 6281234567890):");
            } else {
              await supabase.from('claim_promo').update({
                nomor_wa_update: nomorUpdate
              }).eq('nomor_wa', nomorPengirim).order('created_at', {
                ascending: false
              }).limit(1);
              balasanBot = `Baik, notifikasi update status Claim akan kami kirim ke nomor *${nomorUpdate}* ✅\n\nProses verifikasi memerlukan waktu maksimal 14 hari kerja.\n\n━━━━━━━━━━━━━━━━━━━━\n*Sekalian daftarkan Garansi Nikon?*\nData pembelian Anda akan otomatis terisi dari Claim. Anda tinggal melengkapi NIK dan upload ulang dokumen.\n\nBalas *YA* atau *TIDAK*.`;
              await supabase.from('konsumen').update({
                status_langkah: 'OFFER_GARANSI_AFTER_CLAIM'
              }).eq('nomor_wa', nomorPengirim);
            }
            break;
          }
        // Setelah submit claim, tawarkan ke konsumen untuk sekalian isi form garansi
        case 'OFFER_GARANSI_AFTER_CLAIM':
          if (isiPesanWA.toUpperCase() === "YA") {
            balasanBot = `Bagus! Silakan lanjutkan pendaftaran Garansi Nikon melalui tautan berikut. Data produk Anda sudah otomatis terisi dari Claim — Anda tinggal melengkapi NIK dan upload ulang dokumen:\n\n👉 https://nikonindonesia-altanikindo.vercel.app/garansi?phone=${nomorPengirim}&from_claim=1\n\nKetik *MENU* kapan saja untuk kembali ke menu utama.`;
            await supabase.from('konsumen').update({
              status_langkah: 'MENUNGGU_UPLOAD_GARANSI_WEB'
            }).eq('nomor_wa', nomorPengirim);
          } else if (isiPesanWA.toUpperCase() === "TIDAK") {
            balasanBot = `Baik, terima kasih. Pendaftaran Claim Anda sudah lengkap. 🙏\n\nKetik *MENU* untuk kembali ke menu utama.`;
            await supabase.from('konsumen').update({
              status_langkah: 'START'
            }).eq('nomor_wa', nomorPengirim);
          } else {
            balasanBot = `Mohon balas dengan *YA* atau *TIDAK*.`;
          }
          break;
        case 'MENUNGGU_SERI_CLAIM': {
          const nomorSeriInput = isiPesanWA.trim();
          console.log(`[CLAIM_STATUS] Cari nomor seri: "${nomorSeriInput}", WA: ${nomorPengirim}`);

          // Cari berdasarkan nomor_seri + nomor_wa pengirim
          let { data: claimFound } = await supabase
            .from('claim_promo')
            .select('nomor_seri, tipe_barang, validasi_by_mkt, validasi_by_fa, nama_jasa_pengiriman, nomor_resi, catatan_mkt')
            .ilike('nomor_seri', nomorSeriInput)
            .eq('nomor_wa', nomorPengirim)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Fallback: cari berdasarkan nomor_wa_update = pengirim
          if (!claimFound) {
            const { data: c2 } = await supabase
              .from('claim_promo')
              .select('nomor_seri, tipe_barang, validasi_by_mkt, validasi_by_fa, nama_jasa_pengiriman, nomor_resi, catatan_mkt')
              .ilike('nomor_seri', nomorSeriInput)
              .eq('nomor_wa_update', nomorPengirim)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            claimFound = c2;
          }

          // Fallback terakhir: nomor seri saja tanpa filter WA
          if (!claimFound) {
            const { data: c3 } = await supabase
              .from('claim_promo')
              .select('nomor_seri, tipe_barang, validasi_by_mkt, validasi_by_fa, nama_jasa_pengiriman, nomor_resi, catatan_mkt')
              .ilike('nomor_seri', nomorSeriInput)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            claimFound = c3;
          }

          console.log(`[CLAIM_STATUS] Hasil:`, JSON.stringify(claimFound));

          if (claimFound) {
            const s = claimFound;
            let msg = `Status Claim Promo Anda:\n\n`;
            msg += `*No Seri:* ${s.nomor_seri || nomorSeriInput}\n`;
            msg += `*Barang:* ${s.tipe_barang || '-'}\n`;
            msg += `*Status MKT:* ${s.validasi_by_mkt || 'Menunggu Verifikasi'}\n`;
            msg += `*Status FA:* ${s.validasi_by_fa || 'Menunggu Verifikasi'}\n`;
            const isEmptyVal = (v: string | null | undefined) => !v || v === '-' || v === 'BELUM_DIISI';
            if (!isEmptyVal(s.nama_jasa_pengiriman)) msg += `*Jasa Kirim:* ${s.nama_jasa_pengiriman}\n`;
            if (!isEmptyVal(s.nomor_resi)) msg += `*No Resi:* ${s.nomor_resi}\n`;
            if (!isEmptyVal(s.catatan_mkt)) msg += `*Catatan Marketing:* ${s.catatan_mkt}\n`;
            msg += `\nKetik *MENU* untuk kembali ke menu utama.`;
            balasanBot = msg;
          } else {
            balasanBot = `Maaf, kami tidak menemukan data claim dengan Nomor Seri *${nomorSeriInput}*.\n\nPastikan nomor seri yang Anda masukkan sudah benar.\n\nKetik *MENU* untuk kembali ke menu utama.`;
          }
          await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomorPengirim);
          break;
        }

        case 'MENUNGGU_SERI_GARANSI': {
          const nomorSeriInput = isiPesanWA.trim();
          console.log(`[GARANSI_STATUS] Cari nomor seri: "${nomorSeriInput}", WA: ${nomorPengirim}`);

          // Cari garansi by seri + nomor_wa
          let { data: garansiFound } = await supabase
            .from('garansi')
            .select('id_claim, nomor_seri, tipe_barang, validasi_by_mkt, validasi_by_fa, status_validasi, jenis_garansi, lama_garansi, catatan_mkt')
            .ilike('nomor_seri', nomorSeriInput)
            .eq('nomor_wa', nomorPengirim)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Fallback by nomor_wa_update
          if (!garansiFound) {
            const { data: g2 } = await supabase
              .from('garansi')
              .select('id_claim, nomor_seri, tipe_barang, validasi_by_mkt, validasi_by_fa, status_validasi, jenis_garansi, lama_garansi, catatan_mkt')
              .ilike('nomor_seri', nomorSeriInput)
              .eq('nomor_wa_update', nomorPengirim)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            garansiFound = g2;
          }

          // Fallback nomor seri saja
          if (!garansiFound) {
            const { data: g3 } = await supabase
              .from('garansi')
              .select('id_claim, nomor_seri, tipe_barang, validasi_by_mkt, validasi_by_fa, status_validasi, jenis_garansi, lama_garansi, catatan_mkt')
              .ilike('nomor_seri', nomorSeriInput)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            garansiFound = g3;
          }

          console.log(`[GARANSI_STATUS] Hasil:`, JSON.stringify(garansiFound));

          if (garansiFound) {
            const g = garansiFound;
            // Relasi dengan claim — kalau claim valid, garansi juga dianggap valid
            let claimMkt: string | null = null;
            let claimFa: string | null = null;
            if (g.id_claim) {
              const { data: claimRel } = await supabase
                .from('claim_promo')
                .select('validasi_by_mkt, validasi_by_fa')
                .eq('id_claim', g.id_claim)
                .maybeSingle();
              if (claimRel) {
                claimMkt = claimRel.validasi_by_mkt;
                claimFa = claimRel.validasi_by_fa;
              }
            }
            // Status final: kalau salah satu sumber (claim/garansi) Valid → tampilkan Valid
            const statusMkt = (claimMkt === 'Valid' || g.validasi_by_mkt === 'Valid') ? 'Valid' : (g.validasi_by_mkt || 'Menunggu Verifikasi');
            const statusFa = (claimFa === 'Valid' || g.validasi_by_fa === 'Valid') ? 'Valid' : (g.validasi_by_fa || 'Menunggu Verifikasi');

            let msg = `Status Garansi Anda:\n\n`;
            msg += `*No Seri:* ${g.nomor_seri || nomorSeriInput}\n`;
            msg += `*Barang:* ${g.tipe_barang || '-'}\n`;
            msg += `*Status MKT:* ${statusMkt}\n`;
            msg += `*Status FA:* ${statusFa}\n`;
            if (g.jenis_garansi) msg += `*Jenis Garansi:* ${g.jenis_garansi}\n`;
            if (g.lama_garansi) msg += `*Durasi:* ${g.lama_garansi}\n`;
            if (g.catatan_mkt) msg += `*Catatan:* ${g.catatan_mkt}\n`;
            if (g.id_claim) msg += `\n_Terhubung dengan pengajuan Claim Promo._\n`;
            msg += `\nKetik *MENU* untuk kembali ke menu utama.`;
            balasanBot = msg;
          } else {
            balasanBot = `Maaf, kami tidak menemukan data garansi dengan Nomor Seri *${nomorSeriInput}*.\n\nPastikan nomor seri yang Anda masukkan sudah benar, atau daftarkan garansi Anda terlebih dahulu via menu *3*.\n\nKetik *MENU* untuk kembali ke menu utama.`;
          }
          await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomorPengirim);
          break;
        }

        // ... [SISA LOGIKA NORMAL] ...
        default:
          if (statusSaatIni === 'MENUNGGU_UPLOAD_WEB') {
            balasanBot = getMsg('CLAIM_WEB_FORM_REDIRECT', 'Silakan klik tautan yang telah diberikan untuk melanjutkan pengisian data claim Anda:\n\n👉 https://nikonindonesia-altanikindo.vercel.app/claim?phone={{phone}}', {
              phone: nomorPengirim
            });
          } else if (statusSaatIni === 'MENUNGGU_UPLOAD_GARANSI_WEB') {
            balasanBot = `Silakan klik tautan yang telah diberikan untuk melanjutkan pendaftaran Garansi Anda:\n\n👉 https://nikonindonesia-altanikindo.vercel.app/garansi?phone=${nomorPengirim}\n\nKetik *MENU* kapan saja untuk kembali ke menu utama.`;
          }
          break;
      }
    }
    if (balasanBot !== "") {
      await balasKeWA(nomorPengirim, balasanBot, urlFileKirim !== "" ? urlFileKirim : undefined);
      await supabase.from('riwayat_pesan').insert({
        nomor_wa: nomorPengirim,
        nama_profil_wa: "Sistem Bot",
        arah_pesan: 'OUT',
        isi_pesan: balasanBot,
        waktu_pesan: new Date().toISOString()
      });
    }
    await logSuccessToDB();
    return new Response(JSON.stringify({
      status: "success",
      indicator: "DONE"
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("[INDICATOR ERROR] Global Catch Error:", error);
    await logErrorToDB("GLOBAL_CATCH", error?.message ?? String(error), error?.stack ?? null);
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      details: error.message,
      stack: error.stack
    }), {
      status: 500
    });
  }
});
