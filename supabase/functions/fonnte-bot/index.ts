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
  const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
  const day = jakartaTime.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hour = jakartaTime.getHours();
  if (day >= 1 && day <= 5) { // Mon-Fri
    return hour >= 10 && hour < 16;
  } else if (day === 6) { // Saturday
    return hour >= 10 && hour < 12;
  }
  return false;
}

function replacePlaceholders(template: string, data: Record<string, string>) {
  let result = template;
  for (const key in data) {
    result = result.split(`{{${key}}}`).join(data[key]);
  }
  // Convert literal \n to actual newline characters
  return result.replace(/\\n/g, '\n');
}

async function balasKeWA(nomorTujuan: string, isiPesan: string, urlFile?: string) {
  const params = new URLSearchParams();
  params.append("target", nomorTujuan);
  params.append("message", isiPesan);
  if (urlFile) params.append("url", urlFile);

  try {
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { "Authorization": FONNTE_TOKEN, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) { console.error("Gagal kontak Fonnte API:", err); }
}

serve(async (req) => {
  console.log("[INDICATOR 1] Webhook diterima. Method:", req.method);
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const contentType = req.headers.get("content-type") || "";
    console.log("[INDICATOR 2] Content-Type:", contentType);

    let body: any;
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
      return new Response(JSON.stringify({ error: "sender field missing" }), { status: 400 });
    }

    // ================================================================
    // STEP 1: Pastikan konsumen ada DULU (karena riwayat_pesan punya FK ke konsumen)
    // ================================================================
    console.log("[INDICATOR 5] Cek/buat konsumen untuk:", nomorPengirim);
    let { data: user, error: userError } = await supabase
      .from('konsumen')
      .select('*')
      .eq('nomor_wa', nomorPengirim)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      console.error("[INDICATOR 5b] Error saat cari konsumen:", userError);
    }

    let createErr_global: any = null;
    if (!user) {
      const newID = generateKonsumenID();
      console.log("[INDICATOR 5c] User baru, membuat konsumen dengan ID:", newID);
      const { error: createErr } = await supabase
        .from('konsumen')
        .insert({ 
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
        user = { status_langkah: 'START', id_konsumen: newID, alamat_rumah: null, nama_lengkap: namaProfil, nik: null };
      }
    } else if (!user.id_konsumen) {
      const newID = generateKonsumenID();
      await supabase.from('konsumen').update({ id_konsumen: newID }).eq('nomor_wa', nomorPengirim);
      user.id_konsumen = newID;
    }

    // ================================================================
    // STEP 2: Sekarang aman insert ke riwayat_pesan (FK sudah terpenuhi)
    // ================================================================
    console.log("[INDICATOR 6] Menyimpan pesan masuk ke riwayat_pesan...");
    const { data: insertedData, error: insertError } = await supabase
      .from('riwayat_pesan')
      .insert({
        nomor_wa: nomorPengirim, 
        nama_profil_wa: namaProfil, 
        arah_pesan: 'IN', 
        isi_pesan: isiPesanWA || "[Media/File]",
        waktu_pesan: waktuSekarang
      })
      .select();

    if (insertError) {
      console.error("[INDICATOR 6b] Gagal simpan riwayat_pesan:", insertError);
    } else {
      console.log("[INDICATOR 6c] Berhasil simpan riwayat_pesan:", JSON.stringify(insertedData));
    }

    // ================================================================
    // STEP 3: Proses logika bot
    // ================================================================
    let balasanBot = ""; let urlFileKirim = ""; 

    // Fetch chatbot responses
    const { data: dbResponses } = await supabase.from('chatbot_responses').select('key, message');
    const responses: Record<string, string> = {};
    dbResponses?.forEach(r => { responses[r.key] = r.message; });

    const getMsg = (key: string, fallback: string, data: Record<string, string> = {}) => {
      const template = responses[key] || fallback;
      return replacePlaceholders(template, data);
    };

    // Guard: jika user masih null (gagal dibuat), kembalikan success tanpa balas
    if (!user) {
      console.error("[INDICATOR 7] User null setelah upsert, skip logika bot.");
      return new Response(JSON.stringify({ status: "error", indicator: "USER_NULL", error_detail: createErr_global }), {
        headers: { "Content-Type": "application/json" }, status: 200,
      });
    }

    let statusSaatIni = user.status_langkah;
    const sapaanID = user.id_konsumen ? `(ID: *${user.id_konsumen}*)` : "";

    if (isiPesanWA && (isiPesanWA.toUpperCase() === "MENU" || isiPesanWA.toLowerCase() === "halo")) {
      await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomorPengirim);
      await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', nomorPengirim);
      balasanBot = getMsg('MAIN_MENU', `Hi *{{nama_user}}* {{sapaan_id}},\nSelamat datang di layanan *Nikon Indonesia*.\nSilakan ketik Nomor Menu berikut sesuai kebutuhan Anda...`, { nama_user: user.nama_lengkap || namaProfil, sapaan_id: sapaanID });
    } 
    else if (statusSaatIni === 'TALKING_TO_CS') {
      // Jika sedang bicara dengan CS, chatbot diam (tidak intervensi)
      console.log(`[CS_MODE] Mengabaikan pesan dari ${nomorPengirim} karena sedang dalam mode CS.`);
      return new Response(JSON.stringify({ status: "success", message: "Chatbot silent in CS mode" }), { status: 200 });
    }
    else {
      // Refactor from a long if-else chain to a switch statement for better readability
      switch (statusSaatIni) {
        case 'START':
          switch (isiPesanWA) {
            case "1":
              balasanBot = getMsg('CLAIM_CHOOSE_RECIPIENT_PROMPT', "Untuk melanjutkan proses Pengiriman Barang Promo, Apakah claim ini untuk diri Anda sendiri atau orang lain? Balas *SENDIRI* atau *ORANG LAIN*.");
              await supabase.from('konsumen').update({ status_langkah: 'CLAIM_CHOOSE_RECIPIENT' }).eq('nomor_wa', nomorPengirim);
              break;
            case "2":
              balasanBot = getMsg('CLAIM_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Seri* barang Anda untuk mengecek Status Claim Anda :");
              await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_SERI_CLAIM' }).eq('nomor_wa', nomorPengirim);
              break;
            case "3":
              if (user.nik && user.nik !== "BELUM_DIISI" && user.nama_lengkap) {
                 const konfirmasiGaransi = getMsg('GARANSI_KONFIRMASI_DATA', `Sistem mengenali Anda ${sapaanID}.\nNama: ${user.nama_lengkap}\nNIK: ${user.nik}\n\nApakah Anda ingin sekaligus mengisi data *Garansi Nikon* menggunakan data pembelian ini? Pengisian data Garansi Nikon akan mempermudah anda melakukan service di Nikon Pusat Service dan mendapatkan benefit service\nBalas *YA* atau *TIDAK*.`, { id_sapaan: sapaanID, nama: user.nama_lengkap, nik: user.nik });
                 await supabase.from('konsumen').update({ status_langkah: 'GARANSI_CONFIRM_DATA' }).eq('nomor_wa', nomorPengirim);
                 balasanBot = konfirmasiGaransi;
              } else {
                 balasanBot = getMsg('GARANSI_PROMPT_NIK', "Silakan isi Data Diri Anda untuk Garansi.\nMohon ketikkan *Nomor KTP (NIK)* Anda:");
                 await supabase.from('konsumen').update({ status_langkah: 'MENU3_INPUT_NIK' }).eq('nomor_wa', nomorPengirim);
              }
              break;
            case "4":
              balasanBot = getMsg('GARANSI_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Seri* barang Anda untuk mengecek Status Garansi:");
              await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_SERI_GARANSI' }).eq('nomor_wa', nomorPengirim);
              break;
            case "5":
              balasanBot = getMsg('SERVICE_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Tanda Terima Service* Anda:");
              await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_RESI_SERVICE' }).eq('nomor_wa', nomorPengirim);
              break;
            case "6":
              const { data: pengaturanPromo } = await supabase.from('pengaturan_bot').select('url_file').eq('nama_pengaturan', 'promo_nikon').single();
              balasanBot = pengaturanPromo?.url_file 
                ? `Berikut Promo Nikon yang sedang berlangsung:\n\n👉 ${pengaturanPromo.url_file}`
                : getMsg('PROMO_KOSONG', "Mohon maaf, sedang tidak ada promo.");
              break;
            case "7":
              balasanBot = getMsg('ALAMAT_SERVICE_CENTER', "*Nikon Pusat Service*\nKomplek Mangga Dua Square Blok H, No.1-2,\nJl. Layang, RT.12/RW.6, Ancol,\nKec. Pademangan, Jakarta Utara,\nDKI Jakarta 14430\n\n📍 Maps :\nhttps://maps.app.goo.gl/ysK9hvkm37bxoYGY9");
              break;
            case "8":
              const { data: pengaturan } = await supabase.from('pengaturan_bot').select('url_file').eq('nama_pengaturan', 'dealer_resmi').single();
              balasanBot = pengaturan?.url_file 
                ? `Daftar Dealer Resmi Nikon:\n👉 ${pengaturan.url_file}`
                : getMsg('DEALER_BELUM_ADA', "Daftar Dealer sedang pembaruan.");
              break;
            case "9":
              if (!isOperatingHours()) {
                balasanBot = getMsg('CS_OFFLINE', "Mohon maaf waktu operasional CS adalah :\nSenin-Jumat : 10.00-16.00 WIB\nSabtu : 10.00-12.00 WIB\n\nPesan Anda akan kami balas pada hari dan jam operasional.");
              } else {
                balasanBot = getMsg('CS_WAITING', "Mohon tunggu, kami sedang menugaskan CS untuk melayani Anda.");
                await supabase.from('konsumen').update({ status_langkah: 'TALKING_TO_CS' }).eq('nomor_wa', nomorPengirim);
                await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: true }).eq('nomor_wa', nomorPengirim);
              }
              break;
            default:
              balasanBot = getMsg('WELCOME_NO_MENU', "Selamat datang di Nikon Indonesia, ketik MENU untuk memulai chat");
              break;
          }
          break;

        // LOGIKA CLAIM CHOOSE RECIPIENT
        case 'CLAIM_CHOOSE_RECIPIENT':
          if (isiPesanWA.toUpperCase() === "SENDIRI") {
            balasanBot = getMsg('CLAIM_WEB_FORM_REDIRECT', 'Baik, silakan lanjutkan pengisian data claim dan unggah dokumen Anda melalui tautan aman berikut ini:\n\n👉 https://nikon-dashboard.vercel.app/claim?phone={{phone}}\n\nSetelah selesai, Anda akan menerima konfirmasi lebih lanjut melalui WhatsApp.', { phone: nomorPengirim });
            await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_UPLOAD_WEB' }).eq('nomor_wa', nomorPengirim);
          } else if (isiPesanWA.toUpperCase() === "ORANG LAIN") {
            balasanBot = getMsg('CLAIM_OTHER_WA_PROMPT', "Langkah 1 dari 12:\nSilakan masukkan *Nomor WhatsApp* orang lain yang akan melakukan claim (contoh: 6281234567890):");
            await supabase.from('konsumen').update({ status_langkah: 'CLAIM_OTHER_WA' }).eq('nomor_wa', nomorPengirim);
          } else {
            balasanBot = getMsg('CLAIM_CHOOSE_RECIPIENT_ERROR', "Mohon balas dengan *SENDIRI* atau *ORANG LAIN*.");
          }
          break;

        // ... [SISA LOGIKA NORMAL] ...
        default:
          // Taruh sisa logika if-else di sini atau ubah menjadi case juga
          if (statusSaatIni === 'CLAIM_CONFIRM_ALAMAT') {
             if (isiPesanWA.toUpperCase() === "YA") {
                 balasanBot = getMsg('CLAIM_WEB_FORM_REDIRECT', 'Baik, silakan lanjutkan pengisian data claim dan unggah dokumen Anda melalui tautan aman berikut ini:\n\n👉 https://nikon-dashboard.vercel.app/claim?phone={{phone}}\n\nSetelah selesai, Anda akan menerima konfirmasi lebih lanjut melalui WhatsApp.', { phone: nomorPengirim });
                 await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_UPLOAD_WEB' }).eq('nomor_wa', nomorPengirim);
             } else if (isiPesanWA.toUpperCase() === "TIDAK") {
                 balasanBot = getMsg('CLAIM_WEB_FORM_REDIRECT', 'Baik, silakan lanjutkan pengisian data claim dan unggah dokumen Anda melalui tautan aman berikut ini:\n\n👉 https://nikon-dashboard.vercel.app/claim?phone={{phone}}\n\nSetelah selesai, Anda akan menerima konfirmasi lebih lanjut melalui WhatsApp.', { phone: nomorPengirim });
                 await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_UPLOAD_WEB' }).eq('nomor_wa', nomorPengirim);
             } else { balasanBot = getMsg('YA_TIDAK_ERROR', "Mohon balas dengan *YA* atau *TIDAK*."); }
          }
          // The old claim flow steps are now obsolete and handled by the web page.
          // We can add a generic handler here or just let it fall through.
          else if (statusSaatIni === 'MENUNGGU_UPLOAD_WEB') { balasanBot = getMsg('CLAIM_WEB_FORM_REDIRECT', 'Silakan klik tautan yang telah diberikan untuk melanjutkan pengisian data claim Anda:\n\n👉 https://nikon-dashboard.vercel.app/claim?phone={{phone}}', { phone: nomorPengirim }); }
          // ... dan seterusnya untuk sisa logika
          break;
      }
    }

    if (balasanBot !== "") {
      await balasKeWA(nomorPengirim, balasanBot, urlFileKirim !== "" ? urlFileKirim : undefined);
      await supabase.from('riwayat_pesan').insert({
        nomor_wa: nomorPengirim, nama_profil_wa: "Sistem Bot", arah_pesan: 'OUT', isi_pesan: balasanBot, waktu_pesan: new Date().toISOString()
      });
    }

    return new Response(JSON.stringify({ status: "success", indicator: "DONE" }), { headers: { "Content-Type": "application/json" }, status: 200 });
  } catch (error) { 
    console.error("[INDICATOR ERROR] Global Catch Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message, stack: error.stack }), { status: 500 }); 
  }
});