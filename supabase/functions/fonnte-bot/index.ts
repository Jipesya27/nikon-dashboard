import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      balasanBot = `Hi *${user.nama_lengkap || namaProfil}* ${sapaanID},\nSelamat datang di layanan *Nikon Indonesia*.\nSilakan ketik Nomor Menu berikut sesuai kebutuhan Anda :\n\n1. Claim - Mengisi Form Claim Promo/Hadiah\n2. Claim - Cek Status\n3. Garansi - Mengisi Form\n4. Garansi - Cek Status\n5. Service - Cek Status\n6. Promo Nikon yang sedang berlangsung\n7. Alamat Pusat Service Nikon\n8. Lihat Dealer Resmi Nikon\n9. Berbicara dengan CS\n\nKunjungi social media kami di IG @nikonindonesia untuk info update mengenai Nikon Indonesia.\n_Ketik *MENU* kapan saja untuk kembali._`;
    } 
    else if (statusSaatIni === 'TALKING_TO_CS') {
      // Jika sedang bicara dengan CS, chatbot diam (tidak intervensi)
      console.log(`[CS_MODE] Mengabaikan pesan dari ${nomorPengirim} karena sedang dalam mode CS.`);
      return new Response(JSON.stringify({ status: "success", message: "Chatbot silent in CS mode" }), { status: 200 });
    }
    else {
      if (statusSaatIni === 'START') {
        if (isiPesanWA === "1") {
          balasanBot = "Untuk melanjutkan proses Pengiriman Barang Promo, Apakah claim ini untuk diri Anda sendiri atau orang lain? Balas *SENDIRI* atau *ORANG LAIN*.";
          await supabase.from('konsumen').update({ status_langkah: 'CLAIM_CHOOSE_RECIPIENT' }).eq('nomor_wa', nomorPengirim);
        }
        else if (isiPesanWA === "2") {
          balasanBot = getMsg('CLAIM_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Seri* barang Anda untuk mengecek Status Claim Anda :");
          await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_SERI_CLAIM' }).eq('nomor_wa', nomorPengirim);
        }
        else if (isiPesanWA === "3") {
          // FITUR BARU: SKIP PENGISIAN DATA JIKA SUDAH ADA NIK
          if (user.nik && user.nik !== "BELUM_DIISI" && user.nama_lengkap) {
             const konfirmasiGaransi = getMsg('GARANSI_KONFIRMASI_DATA', `Sistem mengenali Anda ${sapaanID}.\nNama: ${user.nama_lengkap}\nNIK: ${user.nik}\n\nApakah Anda ingin sekaligus mengisi data *Garansi Nikon* menggunakan data pembelian ini? Pengisian data Garansi Nikon akan mempermudah anda melakukan service di Nikon Pusat Service dan mendapatkan benefit service\nBalas *YA* atau *TIDAK*.`, {
               id_sapaan: sapaanID,
               nama: user.nama_lengkap,
               nik: user.nik
             });
             await supabase.from('konsumen').update({ status_langkah: 'GARANSI_CONFIRM_DATA' }).eq('nomor_wa', nomorPengirim);
             balasanBot = konfirmasiGaransi;
          } else {
             balasanBot = getMsg('GARANSI_PROMPT_NIK', "Silakan isi Data Diri Anda untuk Garansi.\nMohon ketikkan *Nomor KTP (NIK)* Anda:");
             await supabase.from('konsumen').update({ status_langkah: 'MENU3_INPUT_NIK' }).eq('nomor_wa', nomorPengirim);
          }
        }
        else if (isiPesanWA === "4") {
          balasanBot = getMsg('GARANSI_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Seri* barang Anda untuk mengecek Status Garansi:");
          await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_SERI_GARANSI' }).eq('nomor_wa', nomorPengirim);
        }
        else if (isiPesanWA === "5") {
          balasanBot = getMsg('SERVICE_CHECK_STATUS_PROMPT', "Silakan masukkan *Nomor Tanda Terima Service* Anda:");
          await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_RESI_SERVICE' }).eq('nomor_wa', nomorPengirim);
        }
        else if (isiPesanWA === "6") {
          const { data: pengaturanPromo } = await supabase.from('pengaturan_bot').select('url_file').eq('nama_pengaturan', 'promo_nikon').single();
          if (pengaturanPromo?.url_file) {
            balasanBot = `Berikut Promo Nikon yang sedang berlangsung:\n\n👉 ${pengaturanPromo.url_file}`;
          } else { balasanBot = getMsg('PROMO_KOSONG', "Mohon maaf, sedang tidak ada promo."); }
          // Old logic:
          // const { data: promos } = await supabase.from('promosi').select('*').eq('status_aktif', true);
          // if (promos && promos.length > 0) {
          //   let listPromo = promos.map((p, idx) => `${idx + 1}. *${p.nama_promo}*\n   Produk: ${p.tipe_produk}\n   Periode: ${p.tanggal_mulai} s/d ${p.tanggal_selesai}`).join("\n\n");
          //   balasanBot = "Berikut Promo Nikon yang sedang berlangsung:\n\nhttps://drive.google.com/file/d/1SxFmHKs-fEwcMN8PQqmxsrPQm48OrgMf/view?usp=sharing";
          // } else { balasanBot = getMsg('PROMO_KOSONG', "Mohon maaf, sedang tidak ada promo."); }
        }
        else if (isiPesanWA === "7") {
          balasanBot = getMsg('ALAMAT_SERVICE_CENTER', "*Nikon Pusat Service*\nKomplek Mangga Dua Square Blok H, No.1-2,\nJl. Layang, RT.12/RW.6, Ancol,\nKec. Pademangan, Jakarta Utara,\nDKI Jakarta 14430\n\n📍 Maps :\nhttps://maps.app.goo.gl/ysK9hvkm37bxoYGY9");
        }
        else if (isiPesanWA === "8") {
          const { data: pengaturan } = await supabase.from('pengaturan_bot').select('url_file').eq('nama_pengaturan', 'dealer_resmi').single();
          if (pengaturan?.url_file) balasanBot = `Daftar Dealer Resmi Nikon:\n👉 ${pengaturan.url_file}`;
          else balasanBot = getMsg('DEALER_BELUM_ADA', "Daftar Dealer sedang pembaruan.");
        }
        else if (isiPesanWA === "9") {
          if (!isOperatingHours()) {
            balasanBot = "Mohon maaf waktu operasional CS adalah :\nSenin-Jumat : 10.00-16.00 WIB\nSabtu : 10.00-12.00 WIB\n\nPesan Anda akan kami balas pada hari dan jam operasional.";
          } else {
            balasanBot = getMsg('CS_WAITING', "Mohon tunggu, kami sedang menugaskan CS untuk melayani Anda.");
            await supabase.from('konsumen').update({ status_langkah: 'TALKING_TO_CS' }).eq('nomor_wa', nomorPengirim);
            await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: true }).eq('nomor_wa', nomorPengirim);
          }
        } else { balasanBot = "Selamat datang di Nikon Indonesia, ketik MENU untuk memulai chat"; }
      }
      
      // LOGIKA CLAIM CHOOSE RECIPIENT
      else if (statusSaatIni === 'CLAIM_CHOOSE_RECIPIENT') {
         if (isiPesanWA.toUpperCase() === "SENDIRI") {
             // lanjut normal
             if (user.alamat_rumah && user.alamat_rumah !== "BELUM_DIISI" && user.nama_lengkap) {
                const konfirmasiAlamat = getMsg('CLAIM_KONFIRMASI_ALAMAT', `Sistem mengenali Anda ${sapaanID}.\nData tersimpan:\nNama: ${user.nama_lengkap}\nAlamat: ${user.alamat_rumah}, Kel. ${user.kelurahan}, Kec. ${user.kecamatan}, ${user.kabupaten_kotamadya}, ${user.provinsi} ${user.kodepos}\n\nApakah Anda ingin menggunakan *alamat ini untuk pengiriman Hadiah Promo?*\nBalas *YA* atau *TIDAK*.`, {
                  id_sapaan: sapaanID,
                  nama: user.nama_lengkap,
                  alamat: user.alamat_rumah,
                  kelurahan: user.kelurahan || "",
                  kecamatan: user.kecamatan || "",
                  kabkot: user.kabupaten_kotamadya || "",
                  provinsi: user.provinsi || "",
                  kodepos: user.kodepos || ""
                });
                await supabase.from('konsumen').update({ status_langkah: 'CLAIM_CONFIRM_ALAMAT' }).eq('nomor_wa', nomorPengirim);
                balasanBot = konfirmasiAlamat;
             } else {
                balasanBot = getMsg('CLAIM_PROMPT_NAMA', "Silakan isi Data Diri Anda untuk keperluan Pengiriman Claim Promo Anda.\n\n*Langkah 1 dari 12:*\nMohon tuliskan *Nama Lengkap* Anda:");
                await supabase.from('konsumen').update({ status_langkah: 'CLAIM_NAMA' }).eq('nomor_wa', nomorPengirim);
             }
         } else if (isiPesanWA.toUpperCase() === "ORANG LAIN") {
             balasanBot = "Langkah 1 dari 12:\nSilakan masukkan *Nomor WhatsApp* orang lain yang akan melakukan claim (contoh: 6281234567890):";
             await supabase.from('konsumen').update({ status_langkah: 'CLAIM_OTHER_WA' }).eq('nomor_wa', nomorPengirim);
         } else {
             balasanBot = "Mohon balas dengan *SENDIRI* atau *ORANG LAIN*.";
         }
      }
      else if (statusSaatIni === 'CLAIM_OTHER_WA') {
         const otherWa = isiPesanWA;
         // Bikin baris konsumen untuk nomor penerima sekarang juga, supaya
         // update alamat/kelurahan/kecamatan/dst di langkah-langkah berikutnya
         // punya target dan tidak hilang (kolom-kolom itu NOT NULL di schema).
         const { data: existingOther } = await supabase.from('konsumen').select('nomor_wa').eq('nomor_wa', otherWa).maybeSingle();
         if (!existingOther) {
            const newID = generateKonsumenID();
            await supabase.from('konsumen').insert({
               nomor_wa: otherWa,
               id_konsumen: newID,
               status_langkah: 'PENDING_BY_OTHER',
               nama_lengkap: 'BELUM_DIISI',
               nik: 'BELUM_DIISI',
               alamat_rumah: 'BELUM_DIISI',
               kelurahan: 'BELUM_DIISI',
               kecamatan: 'BELUM_DIISI',
               kabupaten_kotamadya: 'BELUM_DIISI',
               provinsi: 'BELUM_DIISI',
               kodepos: 'BELUM_DIISI'
            });
         }
         await supabase.from('konsumen').update({ kodepos: otherWa, status_langkah: 'CLAIM_OTHER_NAME' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "Baik. Sekarang mohon tuliskan *Nama Lengkap* orang lain tersebut:";
      }
      else if (statusSaatIni === 'CLAIM_OTHER_NAME') {
         await supabase.from('konsumen').update({ kabupaten_kotamadya: isiPesanWA, status_langkah: 'CLAIM_ALAMAT_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "Langkah 2 dari 12:\nMohon tuliskan *Alamat Rumah Lengkap* orang tersebut:";
      }
      else if (statusSaatIni === 'CLAIM_ALAMAT_FOR_OTHER') {
         const other_wa = user.kodepos;
         await supabase.from('konsumen').update({ alamat_rumah: isiPesanWA }).eq('nomor_wa', other_wa);
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_KELURAHAN_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "Langkah 3 dari 12:\nNama *Kelurahan* orang tersebut?";
      }
      else if (statusSaatIni === 'CLAIM_KELURAHAN_FOR_OTHER') {
         const other_wa = user.kodepos;
         await supabase.from('konsumen').update({ kelurahan: isiPesanWA }).eq('nomor_wa', other_wa);
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_KECAMATAN_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "Langkah 4 dari 12:\nNama *Kecamatan* orang tersebut?";
      }
      else if (statusSaatIni === 'CLAIM_KECAMATAN_FOR_OTHER') {
         const other_wa = user.kodepos;
         await supabase.from('konsumen').update({ kecamatan: isiPesanWA }).eq('nomor_wa', other_wa);
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_KABUPATEN_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "Langkah 5 dari 12:\nNama *Kabupaten/Kotamadya* orang tersebut?";
      }
      else if (statusSaatIni === 'CLAIM_KABUPATEN_FOR_OTHER') {
         const other_wa = user.kodepos;
         await supabase.from('konsumen').update({ kabupaten_kotamadya: isiPesanWA }).eq('nomor_wa', other_wa);
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_PROVINSI_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "Langkah 6 dari 12:\nNama *Provinsi* orang tersebut?";
      }
      else if (statusSaatIni === 'CLAIM_PROVINSI_FOR_OTHER') {
         const other_wa = user.kodepos;
         await supabase.from('konsumen').update({ provinsi: isiPesanWA }).eq('nomor_wa', other_wa);
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_KODEPOS_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "Langkah 7 dari 12:\nBerapa *Kodepos* orang tersebut?";
      }
      else if (statusSaatIni === 'CLAIM_KODEPOS_FOR_OTHER') {
         const other_wa = user.kodepos;
         const other_nama = user.kabupaten_kotamadya;
         let { data: otherUser } = await supabase.from('konsumen').select('*').eq('nomor_wa', other_wa).single();
         if (!otherUser) {
            const newID = generateKonsumenID();
            await supabase.from('konsumen').insert({ nomor_wa: other_wa, id_konsumen: newID, nama_lengkap: other_nama, kodepos: isiPesanWA, status_langkah: 'MENUNGGU_UPLOAD_WEB' });
         } else {
            await supabase.from('konsumen').update({ nama_lengkap: other_nama, kodepos: isiPesanWA, status_langkah: 'MENUNGGU_UPLOAD_WEB' }).eq('nomor_wa', other_wa);
         }
         await supabase.from('claim_promo').insert({ nomor_wa: other_wa, nomor_seri: 'BELUM_DIISI', tipe_barang: 'BELUM_DIISI', tanggal_pembelian: 'BELUM_DIISI', nama_toko: 'BELUM_DIISI', jenis_promosi: 'BELUM_DIISI', nama_jasa_pengiriman: 'BELUM_DIISI', nomor_resi: 'BELUM_DIISI' });
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_NAMA_BARANG_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = `Data Diri berhasil disimpan! ✅\n\n*Langkah 8 dari 12:*\nApa *Nama/Tipe Barang* Nikon yang dibeli orang tersebut?\n_Contoh: Nikon Z5_`;
      }
      else if (statusSaatIni === 'CLAIM_NAMA_BARANG_FOR_OTHER') {
         const other_wa = user.kodepos; // Perbaikan: menggunakan kodepos sesuai alur penyimpanan awal
         const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', other_wa).order('created_at', { ascending: false }).limit(1).single();
         if (c) {
            // Cari promo yang sesuai dengan tipe barang
            const { data: activePromos } = await supabase.from('promosi').select('nama_promo, tipe_produk').eq('status_aktif', true);
            let jenisPromo = 'BELUM_DIISI';
            if (activePromos) {
               const matched = activePromos.find(p => (p.tipe_produk as any[])?.some(prod => 
                  isiPesanWA.toLowerCase().includes(prod.nama_produk.toLowerCase()) || 
                  prod.nama_produk.toLowerCase().includes(isiPesanWA.toLowerCase())
               ));
               if (matched) jenisPromo = matched.nama_promo;
            }
            await supabase.from('claim_promo').update({ tipe_barang: isiPesanWA, jenis_promosi: jenisPromo }).eq('id_claim', c.id_claim);
         }
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_NO_SERI_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "*Langkah 9 dari 12:*\nKetikkan *Nomor Seri* barang orang tersebut:";
      }
      else if (statusSaatIni === 'CLAIM_NO_SERI_FOR_OTHER') {
         const other_wa = user.kodepos;
         const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', other_wa).order('created_at', { ascending: false }).limit(1).single();
         if (c) { await supabase.from('claim_promo').update({ nomor_seri: isiPesanWA }).eq('id_claim', c.id_claim); }
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_TANGGAL_BELI_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "*Langkah 10 dari 12:*\nKapan *Tanggal Pembelian* orang tersebut? (Contoh: 2026-04-18)";
      }
      else if (statusSaatIni === 'CLAIM_TANGGAL_BELI_FOR_OTHER') {
         const other_wa = user.kodepos;
         const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', other_wa).order('created_at', { ascending: false }).limit(1).single();
         if (c) { await supabase.from('claim_promo').update({ tanggal_pembelian: isiPesanWA }).eq('id_claim', c.id_claim); }
         await supabase.from('konsumen').update({ status_langkah: 'CLAIM_NAMA_TOKO_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = "*Langkah 11 dari 12:*\nDi *Toko* mana orang tersebut membelinya?";
      }
      else if (statusSaatIni === 'CLAIM_NAMA_TOKO_FOR_OTHER') {
         const other_wa = user.kodepos;
         const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', other_wa).order('created_at', { ascending: false }).limit(1).single();
         if (c) {
            await supabase.from('claim_promo').update({ nama_toko: isiPesanWA }).eq('id_claim', c.id_claim);
         }
         await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_UPLOAD_WEB_FOR_OTHER' }).eq('nomor_wa', nomorPengirim);
         balasanBot = getMsg('CLAIM_PROMPT_UPLOAD', `Data pembelian tersimpan! ✅\n\n*Langkah 12 dari 12:*\nSilakan klik tautan khusus ini untuk unggah *Foto Garansi & Nota* orang tersebut:\n👉 https://altanikindo-bukticlaim.netlify.app/?phone=${nomorPengirim}`, { phone: nomorPengirim });
      }
      else if (statusSaatIni === 'MENUNGGU_UPLOAD_WEB_FOR_OTHER') {
         balasanBot = getMsg('CLAIM_WAIT_UPLOAD', "Silakan klik link upload sebelumnya. Ketik *MENU* untuk membatalkan.");
      }
      
      // LOGIKA SKIP ALAMAT (CLAIM)
      else if (statusSaatIni === 'CLAIM_CONFIRM_ALAMAT') {
         if (isiPesanWA.toUpperCase() === "YA") {
             await supabase.from('konsumen').update({ status_langkah: 'CLAIM_NAMA_BARANG' }).eq('nomor_wa', nomorPengirim);
             await supabase.from('claim_promo').insert({ nomor_wa: nomorPengirim, nomor_seri: 'BELUM_DIISI', tipe_barang: 'BELUM_DIISI', tanggal_pembelian: 'BELUM_DIISI', nama_toko: 'BELUM_DIISI', jenis_promosi: 'BELUM_DIISI', nama_jasa_pengiriman: 'BELUM_DIISI', nomor_resi: 'BELUM_DIISI' });
             balasanBot = getMsg('CLAIM_PROMPT_TIPE_BARANG', "Baik. Kita lanjutkan ke data pembelian.\n\n*Langkah 8 dari 12:*\nApa *Nama/Tipe Barang* Nikon yang Anda beli?\n_Contoh: Nikon Z5_");
         } else if (isiPesanWA.toUpperCase() === "TIDAK") {
             await supabase.from('konsumen').update({ status_langkah: 'CLAIM_ALAMAT' }).eq('nomor_wa', nomorPengirim);
             balasanBot = getMsg('CLAIM_ALAMAT_BARU', "Baik. Mohon tuliskan *Alamat Rumah BARU* Anda (Jalan, RT/RW, Blok/No):");
         } else { balasanBot = getMsg('YA_TIDAK_ERROR', "Mohon balas dengan *YA* atau *TIDAK*."); }
      }

      // LOGIKA SKIP DATA (GARANSI)
      else if (statusSaatIni === 'GARANSI_CONFIRM_DATA') {
         if (isiPesanWA.toUpperCase() === "YA") {
             await supabase.from('konsumen').update({ status_langkah: 'MENU3_INPUT_BARANG' }).eq('nomor_wa', nomorPengirim);
             await supabase.from('garansi').insert({ nomor_seri: 'BELUM_DIISI', status_validasi: 'Proses Validasi', tipe_barang: 'BELUM_DIISI', jenis_garansi: 'BELUM_DIISI', lama_garansi: 'BELUM_DIISI' });
             balasanBot = "Baik. Kita lanjutkan ke data pembelian.\n\n*Langkah 8 dari 10:*\nApa *Nama/Tipe Barang* Nikon yang Anda beli?\n_Contoh: Nikon Z5_";
         } else if (isiPesanWA.toUpperCase() === "TIDAK") {
             await supabase.from('konsumen').update({ status_langkah: 'MENU3_INPUT_NIK' }).eq('nomor_wa', nomorPengirim);
             balasanBot = "Silakan isi Data Diri Anda kembali.\nMohon ketikkan *Nomor KTP (NIK)* Anda yang baru:";
         } else { balasanBot = "Mohon balas dengan *YA* atau *TIDAK*."; }
      }

      // ... [SISA LOGIKA CLAIM SAMA SPT SEBELUMNYA] ...
      else if (statusSaatIni === 'CLAIM_NAMA') { await supabase.from('konsumen').update({ nama_lengkap: isiPesanWA, status_langkah: 'CLAIM_ALAMAT' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('CLAIM_PROMPT_ALAMAT', `Langkah 2 dari 12:\nMohon tuliskan *Alamat Rumah Lengkap* Anda:`); }
      else if (statusSaatIni === 'CLAIM_ALAMAT') { await supabase.from('konsumen').update({ alamat_rumah: isiPesanWA, status_langkah: 'CLAIM_KELURAHAN' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('CLAIM_PROMPT_KELURAHAN', "Langkah 3 dari 12:\nNama *Kelurahan* Anda?"); }
      else if (statusSaatIni === 'CLAIM_KELURAHAN') { await supabase.from('konsumen').update({ kelurahan: isiPesanWA, status_langkah: 'CLAIM_KECAMATAN' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('CLAIM_PROMPT_KECAMATAN', "Langkah 4 dari 12:\nNama *Kecamatan* Anda?"); }
      else if (statusSaatIni === 'CLAIM_KECAMATAN') { await supabase.from('konsumen').update({ kecamatan: isiPesanWA, status_langkah: 'CLAIM_KABUPATEN_KOTAMADYA' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('CLAIM_PROMPT_KABKOT', "Langkah 5 dari 12:\nNama *Kabupaten/Kotamadya* Anda?"); }
      else if (statusSaatIni === 'CLAIM_KABUPATEN_KOTAMADYA') { await supabase.from('konsumen').update({ kabupaten_kotamadya: isiPesanWA, status_langkah: 'CLAIM_PROVINSI' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('CLAIM_PROMPT_PROVINSI', "Langkah 6 dari 12:\nNama *Provinsi* Anda?"); }
      else if (statusSaatIni === 'CLAIM_PROVINSI') { await supabase.from('konsumen').update({ provinsi: isiPesanWA, status_langkah: 'CLAIM_KODEPOS' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('CLAIM_PROMPT_KODEPOS', "Langkah 7 dari 12:\nBerapa *Kodepos* Anda?"); }
      else if (statusSaatIni === 'CLAIM_KODEPOS') {
        await supabase.from('konsumen').update({ kodepos: isiPesanWA, status_langkah: 'CLAIM_NAMA_BARANG' }).eq('nomor_wa', nomorPengirim);
        await supabase.from('claim_promo').insert({ nomor_wa: nomorPengirim, nomor_seri: 'BELUM_DIISI', tipe_barang: 'BELUM_DIISI', tanggal_pembelian: 'BELUM_DIISI', nama_toko: 'BELUM_DIISI', jenis_promosi: 'BELUM_DIISI', nama_jasa_pengiriman: 'BELUM_DIISI', nomor_resi: 'BELUM_DIISI' });
        balasanBot = getMsg('CLAIM_DATA_DIRI_SIMPAN', `Data Diri berhasil disimpan! ✅\n\n*Langkah 8 dari 12:*\nApa *Nama/Tipe Barang* Nikon yang Anda beli?\n_Contoh: Nikon Z5_`);
      }
      else if (statusSaatIni === 'CLAIM_NAMA_BARANG') {
        const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', nomorPengirim).order('created_at', { ascending: false }).limit(1).single();
        if (c) {
           await supabase.from('claim_promo').update({ tipe_barang: isiPesanWA }).eq('id_claim', c.id_claim);
           await supabase.from('konsumen').update({ status_langkah: 'CLAIM_NO_SERI' }).eq('nomor_wa', nomorPengirim);
           balasanBot = getMsg('CLAIM_PROMPT_SERI', "*Langkah 9 dari 12:*\nKetikkan *Nomor Seri* barang Anda:");
        }
      }
      else if (statusSaatIni === 'CLAIM_NO_SERI') {
        const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', nomorPengirim).order('created_at', { ascending: false }).limit(1).single();
        if (c) { await supabase.from('claim_promo').update({ nomor_seri: isiPesanWA }).eq('id_claim', c.id_claim); await supabase.from('konsumen').update({ status_langkah: 'CLAIM_TANGGAL_BELI' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('CLAIM_PROMPT_TGL_BELI', "*Langkah 10 dari 12:*\nKapan *Tanggal Pembelian*? (Contoh: 2026-04-18)"); }
      }
      else if (statusSaatIni === 'CLAIM_TANGGAL_BELI') {
        const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', nomorPengirim).order('created_at', { ascending: false }).limit(1).single();
        if (c) {
          await supabase.from('claim_promo').update({ tanggal_pembelian: isiPesanWA }).eq('id_claim', c.id_claim);
          // --- NEW LOGIC START ---
          const { data: updatedClaim } = await supabase.from('claim_promo').select('tipe_barang, tanggal_pembelian').eq('id_claim', c.id_claim).single();
          if (updatedClaim && updatedClaim.tipe_barang && updatedClaim.tanggal_pembelian) {
              const purchaseDate = updatedClaim.tanggal_pembelian;
              const { data: activePromos } = await supabase.from('promosi')
                  .select('nama_promo, tipe_produk')
                  .eq('status_aktif', true)
                  .lte('tanggal_mulai', purchaseDate)
                  .gte('tanggal_selesai', purchaseDate);

              let jenisPromo = 'BELUM_DIISI';
              if (activePromos) {
                  const matched = activePromos.find(p => (p.tipe_produk as any[])?.some(prod => 
                      updatedClaim.tipe_barang.toLowerCase().includes(prod.nama_produk.toLowerCase()) || 
                      prod.nama_produk.toLowerCase().includes(updatedClaim.tipe_barang.toLowerCase())
                  ));
                  if (matched) jenisPromo = matched.nama_promo;
              }
              await supabase.from('claim_promo').update({ jenis_promosi: jenisPromo }).eq('id_claim', c.id_claim);
           }
           await supabase.from('konsumen').update({ status_langkah: 'CLAIM_NAMA_TOKO' }).eq('nomor_wa', nomorPengirim); 
           balasanBot = getMsg('CLAIM_PROMPT_TOKO', "*Langkah 11 dari 12:*\nDi *Toko* mana Anda membelinya?"); 
        }
      }
      else if (statusSaatIni === 'CLAIM_NAMA_TOKO') {
        const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', nomorPengirim).order('created_at', { ascending: false }).limit(1).single();
        if (c) {
          await supabase.from('claim_promo').update({ nama_toko: isiPesanWA }).eq('id_claim', c.id_claim); await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_UPLOAD_WEB' }).eq('nomor_wa', nomorPengirim);
          balasanBot = getMsg('CLAIM_PROMPT_UPLOAD', `Data pembelian tersimpan! ✅\n\n*Langkah 12 dari 12:*\nSilakan klik tautan khusus ini untuk unggah *Foto Garansi & Nota* Anda:\n👉 https://altanikindo-bukticlaim.netlify.app/?phone=${nomorPengirim}`, { phone: nomorPengirim });
        }
      }
      else if (statusSaatIni === 'MENUNGGU_UPLOAD_WEB') { balasanBot = getMsg('CLAIM_WAIT_UPLOAD', "Silakan klik link upload sebelumnya. Ketik *MENU* untuk membatalkan."); }
      
      // UPDATE WA & GARANSI DARI CLAIM
      else if (statusSaatIni === 'TANYA_UPDATE_WA') {
         if (isiPesanWA.toUpperCase() === "INI") {
             const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', nomorPengirim).order('created_at', { ascending: false }).limit(1).single();
             if (c) await supabase.from('claim_promo').update({ nomor_wa_update: nomorPengirim }).eq('id_claim', c.id_claim);
             await supabase.from('konsumen').update({ status_langkah: 'TANYA_LANJUT_GARANSI' }).eq('nomor_wa', nomorPengirim);
             balasanBot = "Baik. Untuk mendapatkan benefit di *Nikon Pusat Service*,\nApakah Anda ingin mengisi data *Garansi Nikon*? _Anda hanya perlu mengisi NIK/nomor KTP Anda._\nKetik *YA* atau *TIDAK*.";
         } else {
             await supabase.from('konsumen').update({ status_langkah: 'INPUT_WA_BARU' }).eq('nomor_wa', nomorPengirim);
             balasanBot = "Silakan ketik nomor WA baru:";
         }
      }
      else if (statusSaatIni === 'INPUT_WA_BARU') {
         const { data: c } = await supabase.from('claim_promo').select('id_claim').eq('nomor_wa', nomorPengirim).order('created_at', { ascending: false }).limit(1).single();
         if (c) await supabase.from('claim_promo').update({ nomor_wa_update: isiPesanWA }).eq('id_claim', c.id_claim);
         await supabase.from('konsumen').update({ status_langkah: 'TANYA_LANJUT_GARANSI' }).eq('nomor_wa', nomorPengirim);
         balasanBot = `Nomor WA terdaftar.\nUntuk mendapatkan benefit di Nikon Pusat Service,\nApakah Anda ingin sekaligus mengisi data *Garansi Nikon*? _Anda hanya perlu mengisi NIK/nomor KTP Anda._\nKetik *YA* atau *TIDAK*.`;
      }
      else if (statusSaatIni === 'TANYA_LANJUT_GARANSI') {
         if (isiPesanWA.toUpperCase() === "YA") {
             await supabase.from('konsumen').update({ status_langkah: 'GARANSI_NIK' }).eq('nomor_wa', nomorPengirim);
             balasanBot = "Silakan ketikkan *NIK (Nomor KTP)* Anda untuk Garansi:";
         } else if (isiPesanWA.toUpperCase() === "TIDAK") {
             await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomorPengirim);
             balasanBot = `Pengisian selesai🎉. Admin akan memvalidasi maksimal 14 hari kerja. Selanjutnya Anda akan mendapatkan *Pesan Update* berupa *Resi Pengiriman*. ${sapaanID}`;
         } else { balasanBot = "Mohon ketik *YA* atau *TIDAK*."; }
      }
      else if (statusSaatIni === 'GARANSI_NIK') {
        await supabase.from('konsumen').update({ nik: isiPesanWA }).eq('nomor_wa', nomorPengirim);
        const { data: c } = await supabase.from('claim_promo').select('*').eq('nomor_wa', nomorPengirim).order('created_at', { ascending: false }).limit(1).single();
        if (c) {
          await supabase.from('garansi').insert({
            id_claim: c.id_claim, nomor_seri: c.nomor_seri, tipe_barang: c.tipe_barang,
            tanggal_pembelian: c.tanggal_pembelian, link_kartu_garansi: c.link_kartu_garansi, link_nota_pembelian: c.link_nota_pembelian, status_validasi: 'Proses Validasi'
          });
          await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomorPengirim);
          balasanBot = `Data Garansi otomatis terisi berdasarkan dokumen sebelumnya. Pengisian selesai. ${sapaanID}\n\n_Silakan ketik *MENU* untuk kembali ke menu utama._`;
        }
      }

      // ... [SISA LOGIKA GARANSI MANUAL / MENU 3] ...
      else if (statusSaatIni === 'MENUNGGU_SERI_CLAIM') {
        const { data: claimData } = await supabase.from('claim_promo').select('tipe_barang, validasi_by_mkt, catatan_mkt').eq('nomor_seri', isiPesanWA).single();
        if (claimData) { 
          const catatanMkt = claimData.catatan_mkt && claimData.catatan_mkt !== 'BELUM_DIISI' ? `\nCatatan: ${claimData.catatan_mkt}` : "";
          balasanBot = `Data Ditemukan!\n\nNo Seri: ${isiPesanWA}\nTipe Barang: ${claimData.tipe_barang}\nStatus Validasi: ${claimData.validasi_by_mkt}${catatanMkt}\n\n_Silakan ketik MENU untuk kembali ke menu utama._`; 
          await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomorPengirim); 
        } 
        else { balasanBot = "Nomor seri tidak ditemukan. Ketik *MENU* untuk batal."; }
      }
      else if (statusSaatIni === 'MENU3_INPUT_NIK') { await supabase.from('konsumen').update({ nik: isiPesanWA, status_langkah: 'MENU3_INPUT_NAMA' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_NAMA', "Langkah 1 dari 10:\nNama Lengkap?"); }
      else if (statusSaatIni === 'MENU3_INPUT_NAMA') { await supabase.from('konsumen').update({ nama_lengkap: isiPesanWA, status_langkah: 'MENU3_INPUT_ALAMAT' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_ALAMAT', "Langkah 2 dari 10:\nAlamat Rumah Lengkap?"); }
      else if (statusSaatIni === 'MENU3_INPUT_ALAMAT') { await supabase.from('konsumen').update({ alamat_rumah: isiPesanWA, status_langkah: 'MENU3_INPUT_KELURAHAN' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_KELURAHAN', "Langkah 3 dari 10:\nNama Kelurahan?"); }
      else if (statusSaatIni === 'MENU3_INPUT_KELURAHAN') { await supabase.from('konsumen').update({ kelurahan: isiPesanWA, status_langkah: 'MENU3_INPUT_KECAMATAN' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_KECAMATAN', "Langkah 4 dari 10:\nNama Kecamatan?"); }
      else if (statusSaatIni === 'MENU3_INPUT_KECAMATAN') { await supabase.from('konsumen').update({ kecamatan: isiPesanWA, status_langkah: 'MENU3_INPUT_KABKOT' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_KABKOT', "Langkah 5 dari 10:\nKabupaten/Kotamadya?"); }
      else if (statusSaatIni === 'MENU3_INPUT_KABKOT') { await supabase.from('konsumen').update({ kabupaten_kotamadya: isiPesanWA, status_langkah: 'MENU3_INPUT_PROVINSI' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_PROVINSI', "Langkah 6 dari 10:\nProvinsi?"); }
      else if (statusSaatIni === 'MENU3_INPUT_PROVINSI') { await supabase.from('konsumen').update({ provinsi: isiPesanWA, status_langkah: 'MENU3_INPUT_KODEPOS' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_KODEPOS', "Langkah 7 dari 10:\nKodepos?"); }
      else if (statusSaatIni === 'MENU3_INPUT_KODEPOS') {
         await supabase.from('konsumen').update({ kodepos: isiPesanWA, status_langkah: 'MENU3_INPUT_BARANG' }).eq('nomor_wa', nomorPengirim);
         await supabase.from('garansi').insert({ nomor_seri: 'BELUM_DIISI', status_validasi: 'Proses Validasi', tipe_barang: 'BELUM_DIISI', jenis_garansi: 'BELUM_DIISI', lama_garansi: 'BELUM_DIISI' }); balasanBot = getMsg('MENU3_PROMPT_BARANG', "Langkah 8 dari 10:\nNama/Tipe Barang?");
      }
      else if (statusSaatIni === 'MENU3_INPUT_BARANG') {
         const { data: g } = await supabase.from('garansi').select('id_garansi').eq('nomor_seri', 'BELUM_DIISI').order('created_at', { ascending: false }).limit(1).single();
         if (g) { await supabase.from('garansi').update({ tipe_barang: isiPesanWA }).eq('id_garansi', g.id_garansi); await supabase.from('konsumen').update({ status_langkah: 'MENU3_INPUT_SERI' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_SERI', "Langkah 9 dari 10:\nNomor Seri barang?"); }
      }
      else if (statusSaatIni === 'MENU3_INPUT_SERI') {
         const { data: g } = await supabase.from('garansi').select('id_garansi').eq('nomor_seri', 'BELUM_DIISI').order('created_at', { ascending: false }).limit(1).single();
         if (g) { await supabase.from('garansi').update({ nomor_seri: isiPesanWA }).eq('id_garansi', g.id_garansi); await supabase.from('konsumen').update({ status_langkah: 'MENU3_INPUT_TGL' }).eq('nomor_wa', nomorPengirim); balasanBot = getMsg('MENU3_PROMPT_TGL', "Langkah 10 dari 10:\nTanggal Pembelian? (2026-04-18)"); }
      }
      else if (statusSaatIni === 'MENU3_INPUT_TGL') {
         const { data: g } = await supabase.from('garansi').select('id_garansi').order('created_at', { ascending: false }).limit(1).single();
         if (g) {
            await supabase.from('garansi').update({ tanggal_pembelian: isiPesanWA }).eq('id_garansi', g.id_garansi); await supabase.from('konsumen').update({ status_langkah: 'MENU3_MENUNGGU_UPLOAD' }).eq('nomor_wa', nomorPengirim);
            balasanBot = getMsg('MENU3_PROMPT_UPLOAD', `Data tersimpan! ✅\nKlik tautan ini untuk unggah Foto Garansi & Nota:\n👉 https://altanikindo-bukticlaim.netlify.app/?phone=${nomorPengirim}`, { phone: nomorPengirim });
         }
      }
      else if (statusSaatIni === 'MENU3_MENUNGGU_UPLOAD') { balasanBot = "Klik link upload sebelumnya. Ketik *MENU* untuk batal."; }
      else if (statusSaatIni === 'MENUNGGU_SERI_GARANSI') {
        const { data: g } = await supabase.from('garansi').select('tipe_barang, status_validasi, jenis_garansi').eq('nomor_seri', isiPesanWA).single();
        if (g) { balasanBot = `Data Garansi Ditemukan!\n\nNo Seri: ${isiPesanWA}\nBarang: ${g.tipe_barang}\nStatus: ${g.status_validasi}\n\n_Silakan ketik MENU untuk kembali ke menu utama._`; await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomorPengirim); } 
        else { balasanBot = "Nomor seri tidak ditemukan di sistem. Ketik *MENU* untuk batal."; }
      }
      else if (statusSaatIni === 'MENUNGGU_RESI_SERVICE') {
        const { data: s } = await supabase.from('status_service').select('nomor_seri, status_service').eq('nomor_tanda_terima', isiPesanWA).single();
        if (s) { balasanBot = `Data Service Ditemukan!\n\nNo Resi: ${isiPesanWA}\nStatus: *${s.status_service}*\n\n_Silakan ketik MENU untuk kembali ke menu utama._`; await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomorPengirim); } 
        else { balasanBot = "Nomor resi tidak ditemukan. Ketik *MENU* untuk batal."; }
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