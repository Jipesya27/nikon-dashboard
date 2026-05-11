import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN") || "xYsGrYetdkLXoK72dDtc";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://hfqnlttxxrqarmpvtnhu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN") || "";
const FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Google Auth failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function uploadToGoogleDrive(file: File, fileName: string, accessToken: string) {
  const metadata = { name: fileName, parents: [FOLDER_ID] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}` },
    body: form,
  });
  const data = await res.json();

  if (!data.id) {
    throw new Error(`Google Drive upload failed: ${JSON.stringify(data)}`);
  }

  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

async function balasKeWA(nomorTujuan: string, isiPesan: string) {
  await fetch("https://api.fonnte.com/send", {
    method: "POST", headers: { "Authorization": FONNTE_TOKEN },
    body: new URLSearchParams({ target: nomorTujuan, message: isiPesan }),
  });
}

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const phone = formData.get('phone') as string;
    const fileGaransi = formData.get('foto_garansi') as File;
    const fileNota = formData.get('foto_nota') as File;

    if (!phone || !fileGaransi || !fileNota) return new Response(JSON.stringify({ error: "Data tidak lengkap" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Normalisasi nomor WA: coba beberapa format
    const phoneVariants = [phone];
    if (phone.startsWith('62')) phoneVariants.push('0' + phone.slice(2), '+' + phone);
    else if (phone.startsWith('0')) phoneVariants.push('62' + phone.slice(1), '+62' + phone.slice(1));
    else if (phone.startsWith('+62')) phoneVariants.push(phone.slice(1), '0' + phone.slice(3));

    let userStatus: any = null;
    let matchedPhone = phone;
    for (const variant of phoneVariants) {
      const { data, error } = await supabase.from('konsumen').select('status_langkah').eq('nomor_wa', variant).single();
      if (data && !error) { userStatus = data; matchedPhone = variant; break; }
    }
    if (!userStatus) throw new Error("Nomor WA tidak terdaftar dalam sistem. Pastikan Anda sudah mengisi data melalui WhatsApp Bot terlebih dahulu.");

    const statusUpload = userStatus.status_langkah;
    const extGaransi = fileGaransi.name.split('.').pop();
    const extNota = fileNota.name.split('.').pop();

    const accessToken = await getAccessToken();

    if (statusUpload === 'MENUNGGU_UPLOAD_WEB') {
        const { data: dataKlaim, error: errKlaim } = await supabase.from('claim_promo').select('id_claim, nomor_seri, tipe_barang').eq('nomor_wa', matchedPhone).order('created_at', { ascending: false }).limit(1).single();
        if (errKlaim || !dataKlaim) throw new Error("Data klaim tidak ditemukan.");

        const namaFileGaransi = `${dataKlaim.nomor_seri}_${dataKlaim.tipe_barang}_KartuGaransi.${extGaransi}`;
        const namaFileNota = `${dataKlaim.nomor_seri}_${dataKlaim.tipe_barang}_NotaPembelian.${extNota}`;

        const urlGaransi = await uploadToGoogleDrive(fileGaransi, namaFileGaransi, accessToken);
        const urlNota = await uploadToGoogleDrive(fileNota, namaFileNota, accessToken);

        await supabase.from('claim_promo').update({ link_kartu_garansi: urlGaransi, link_nota_pembelian: urlNota }).eq('id_claim', dataKlaim.id_claim);
        await supabase.from('konsumen').update({ status_langkah: 'TANYA_UPDATE_WA' }).eq('nomor_wa', matchedPhone);

        await balasKeWA(matchedPhone, "Pengisian data Claim berhasil dan dokumen telah diterima! 🎉\n\n*Untuk notifikasi update status Claim*, apakah Anda ingin menggunakan nomor WA ini, atau mendaftarkan nomor lain? Ketik *INI* atau *NOMOR LAIN*?");
    }
    else if (statusUpload === 'MENUNGGU_UPLOAD_WEB_FOR_OTHER') {
        // Sender mengupload atas nama orang lain
        // Data orang lain disimpan di kolom temp_state sender
        const { data: senderData, error: errSender } = await supabase.from('konsumen').select('temp_state').eq('nomor_wa', matchedPhone).single();
        if (errSender || !senderData?.temp_state?.target_wa) throw new Error("Data penerima claim (temp_state) tidak ditemukan.");

        const otherWa = senderData.temp_state.target_wa;
        const { data: dataKlaim, error: errKlaim } = await supabase.from('claim_promo').select('id_claim, nomor_seri, tipe_barang').eq('nomor_wa', otherWa).order('created_at', { ascending: false }).limit(1).single();
        if (errKlaim || !dataKlaim) throw new Error("Data klaim orang lain tidak ditemukan.");

        const namaFileGaransi = `${dataKlaim.nomor_seri}_${dataKlaim.tipe_barang}_KartuGaransi.${extGaransi}`;
        const namaFileNota = `${dataKlaim.nomor_seri}_${dataKlaim.tipe_barang}_NotaPembelian.${extNota}`;

        const urlGaransi = await uploadToGoogleDrive(fileGaransi, namaFileGaransi, accessToken);
        const urlNota = await uploadToGoogleDrive(fileNota, namaFileNota, accessToken);

        await supabase.from('claim_promo').update({ link_kartu_garansi: urlGaransi, link_nota_pembelian: urlNota }).eq('id_claim', dataKlaim.id_claim);
        // Update status SENDER (bukan orang lain) ke langkah berikutnya
        await supabase.from('konsumen').update({ status_langkah: 'TANYA_UPDATE_WA' }).eq('nomor_wa', matchedPhone);

        // Kirim WA ke SENDER (yang mengirim chat), bukan ke orang lain
        await balasKeWA(matchedPhone, "Pengisian data Claim untuk orang lain berhasil dan dokumen telah diterima! 🎉\n\n*Untuk notifikasi update status Claim*, apakah Anda ingin menggunakan nomor WA ini, atau mendaftarkan nomor lain? Ketik *INI* atau *NOMOR LAIN*?");
    }
    else if (statusUpload === 'MENU3_MENUNGGU_UPLOAD') {
        const { data: dataGaransi, error: errGaransi } = await supabase.from('garansi').select('id_garansi, nomor_seri, tipe_barang').order('created_at', { ascending: false }).limit(1).single();
        if (errGaransi || !dataGaransi) throw new Error("Data garansi tidak ditemukan.");

        const namaFileGaransi = `${dataGaransi.nomor_seri}_${dataGaransi.tipe_barang}_KartuGaransi.${extGaransi}`;
        const namaFileNota = `${dataGaransi.nomor_seri}_${dataGaransi.tipe_barang}_NotaPembelian.${extNota}`;

        const urlGaransi = await uploadToGoogleDrive(fileGaransi, namaFileGaransi, accessToken);
        const urlNota = await uploadToGoogleDrive(fileNota, namaFileNota, accessToken);

        await supabase.from('garansi').update({ link_kartu_garansi: urlGaransi, link_nota_pembelian: urlNota }).eq('id_garansi', dataGaransi.id_garansi);
        await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', matchedPhone);

        await balasKeWA(matchedPhone, "Pendaftaran Garansi berhasil dan dokumen telah diterima! 🎉\n\nAdmin akan melakukan Validasi data Anda. Maksimal validasi data adalah 14 hari kerja. Selanjutnya Anda akan mendapatkan *Pesan Update* berupa *Resi Pengiriman*.");
    }

    return new Response(JSON.stringify({ success: true, message: "Upload berhasil!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) { return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }); }
});
