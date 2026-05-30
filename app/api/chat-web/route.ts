import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isOperatingHours(): boolean {
  const now = new Date();
  const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const day = jakartaTime.getDay();
  const hour = jakartaTime.getHours();
  if (day >= 1 && day <= 5) return hour >= 10 && hour < 16;
  if (day === 6) return hour >= 10 && hour < 12;
  return false;
}

function replacePlaceholders(template: string, data: Record<string, string>): string {
  let result = template;
  for (const key in data) {
    result = result.split(`{{${key}}}`).join(data[key]);
  }
  return result.replace(/\\n/g, '\n');
}

type Responses = Record<string, string>;

function getMsg(responses: Responses, key: string, fallback: string, data: Record<string, string> = {}): string {
  const template = responses[key] || fallback;
  return replacePlaceholders(template, data);
}

function isEmptyVal(v: string | null | undefined): boolean {
  return !v || v === '-' || v === 'BELUM_DIISI';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, session_id, nama } = body as { message?: string; session_id?: string; nama?: string };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }
    if (!session_id || typeof session_id !== 'string' || session_id.length < 4) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const isiPesan = message.trim();
    const nomor = `WEB-${session_id}`;
    const namaProfil = (nama && typeof nama === 'string') ? nama.slice(0, 60) : 'Pengunjung Web';

    // Ensure konsumen record exists (riwayat_pesan has FK to konsumen)
    let { data: user, error: userErr } = await supabase
      .from('konsumen')
      .select('id_konsumen, status_langkah, nama_lengkap')
      .eq('nomor_wa', nomor)
      .maybeSingle();

    if (userErr && userErr.code !== 'PGRST116') {
      console.error('[chat-web] konsumen lookup error:', userErr);
    }

    if (!user) {
      const newID = `AN${Math.floor(100000 + Math.random() * 900000)}`;
      const { error: createErr } = await supabase.from('konsumen').insert({
        nomor_wa: nomor,
        id_konsumen: newID,
        status_langkah: 'START',
        nama_lengkap: namaProfil,
        nik: 'BELUM_DIISI',
        alamat_rumah: 'BELUM_DIISI',
        kelurahan: 'BELUM_DIISI',
        kecamatan: 'BELUM_DIISI',
        kabupaten_kotamadya: 'BELUM_DIISI',
        provinsi: 'BELUM_DIISI',
        kodepos: 'BELUM_DIISI',
      });
      if (!createErr) {
        user = { id_konsumen: newID, status_langkah: 'START', nama_lengkap: namaProfil };
      }
    }

    // Log incoming message
    await supabase.from('riwayat_pesan').insert({
      nomor_wa: nomor,
      nama_profil_wa: namaProfil,
      arah_pesan: 'IN_WEB',
      isi_pesan: isiPesan,
      waktu_pesan: new Date().toISOString(),
    });

    // Load chatbot_responses templates
    const { data: dbResponses } = await supabase.from('chatbot_responses').select('key, message');
    const responses: Responses = {};
    dbResponses?.forEach(r => { responses[r.key] = r.message; });

    const sapaanID = user?.id_konsumen ? `(ID: *${user.id_konsumen}*)` : '';
    const statusSaatIni: string = user?.status_langkah || 'START';
    let balasanBot = '';

    // MENU / halo → reset ke menu utama
    if (isiPesan.toUpperCase() === 'MENU' || isiPesan.toLowerCase() === 'halo') {
      await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomor);
      balasanBot = getMsg(
        responses,
        'MAIN_MENU',
        `Hi *${user?.nama_lengkap || namaProfil}* ${sapaanID},\nSelamat datang di layanan *Nikon Indonesia*.\n\nSilakan ketik *Nomor Menu* berikut:\n\n*1.* Claim Promo\n*2.* Cek Status Claim\n*3.* Daftar Garansi Nikon\n*4.* Cek Status Garansi\n*5.* Cek Status Service\n*6.* Promo Nikon Terkini\n*7.* Alamat Service Center\n*8.* Daftar Dealer Resmi\n*9.* Hubungi CS\n*10.* Cek Jadwal Event\n\n_Balas dengan angka 1-10_\nKetik *MENU* kapan saja untuk kembali ke menu utama.`,
        { nama_user: user?.nama_lengkap || namaProfil, sapaan_id: sapaanID }
      );
    } else if (statusSaatIni === 'TALKING_TO_CS') {
      balasanBot = 'Anda sedang dalam antrean CS. Untuk respons lebih cepat silakan lanjutkan via WhatsApp. Ketik *MENU* untuk membatalkan.';
    } else {
      switch (statusSaatIni) {
        case 'START':
          switch (isiPesan) {
            case '1':
              balasanBot = getMsg(
                responses,
                'CLAIM_WEB_FORM_REDIRECT',
                'Baik, silakan lanjutkan pengisian data *Claim Promo* melalui tautan berikut:\n\n👉 https://altanikindo.com/nikon/form-claim\n\nSetelah selesai, Anda akan menerima konfirmasi. Ketik *MENU* untuk kembali.'
              );
              await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_UPLOAD_WEB' }).eq('nomor_wa', nomor);
              break;
            case '2':
              balasanBot = getMsg(responses, 'CLAIM_CHECK_STATUS_PROMPT', 'Silakan masukkan *Nomor Seri* barang Anda untuk mengecek Status Claim:');
              await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_SERI_CLAIM' }).eq('nomor_wa', nomor);
              break;
            case '3':
              balasanBot = getMsg(
                responses,
                'GARANSI_WEB_FORM_REDIRECT',
                'Baik, silakan daftarkan *Garansi Nikon* melalui tautan berikut:\n\n👉 https://altanikindo.com/nikon/form-garansi\n\nPengisian data Garansi mempermudah Anda saat service di Nikon Pusat Service. Ketik *MENU* untuk kembali.'
              );
              await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_UPLOAD_GARANSI_WEB' }).eq('nomor_wa', nomor);
              break;
            case '4':
              balasanBot = getMsg(responses, 'GARANSI_CHECK_STATUS_PROMPT', 'Silakan masukkan *Nomor Seri* barang Anda untuk mengecek Status Garansi:');
              await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_SERI_GARANSI' }).eq('nomor_wa', nomor);
              break;
            case '5':
              balasanBot = getMsg(responses, 'SERVICE_CHECK_STATUS_PROMPT', 'Silakan masukkan *Nomor Tanda Terima Service* Anda:');
              await supabase.from('konsumen').update({ status_langkah: 'MENUNGGU_RESI_SERVICE' }).eq('nomor_wa', nomor);
              break;
            case '6': {
              const { data: promoData } = await supabase
                .from('pengaturan_bot')
                .select('url_file')
                .eq('nama_pengaturan', 'promo_nikon')
                .maybeSingle();
              balasanBot = promoData?.url_file
                ? `Berikut Promo Nikon yang sedang berlangsung:\n\n👉 ${promoData.url_file}\n\nKetik *MENU* untuk kembali.`
                : getMsg(responses, 'PROMO_KOSONG', 'Mohon maaf, sedang tidak ada promo aktif saat ini.\n\nKetik *MENU* untuk kembali ke menu utama.');
              break;
            }
            case '7':
              balasanBot = getMsg(
                responses,
                'ALAMAT_SERVICE_CENTER',
                '*Nikon Pusat Service*\nKomplek Mangga Dua Square Blok H, No.1-2,\nJl. Layang, RT.12/RW.6, Ancol,\nKec. Pademangan, Jakarta Utara,\nDKI Jakarta 14430\n\n📍 Maps:\nhttps://maps.app.goo.gl/ysK9hvkm37bxoYGY9\n\nKetik *MENU* untuk kembali.'
              );
              break;
            case '8': {
              const { data: dealerData } = await supabase
                .from('pengaturan_bot')
                .select('url_file')
                .eq('nama_pengaturan', 'dealer_resmi')
                .maybeSingle();
              balasanBot = dealerData?.url_file
                ? `Daftar Dealer Resmi Nikon:\n👉 ${dealerData.url_file}\n\nKetik *MENU* untuk kembali.`
                : getMsg(responses, 'DEALER_BELUM_ADA', 'Daftar Dealer sedang dalam pembaruan.\n\nKetik *MENU* untuk kembali ke menu utama.');
              break;
            }
            case '9':
              if (!isOperatingHours()) {
                balasanBot = getMsg(
                  responses,
                  'CS_OFFLINE',
                  'Mohon maaf, CS sedang tidak online.\n\n⏰ Jam Operasional:\nSenin–Jumat: 10.00–16.00 WIB\nSabtu: 10.00–12.00 WIB\n\nSilakan tinggalkan pesan via WhatsApp dan kami akan membalas pada jam operasional.\n\nKetik *MENU* untuk kembali ke menu utama.'
                );
              } else {
                balasanBot =
                  'Untuk berbicara langsung dengan CS, silakan gunakan WhatsApp kami — CS sedang online dan siap melayani Anda sekarang. 🟢\n\nKetik *MENU* untuk kembali ke menu utama.';
              }
              break;
            case '10':
              balasanBot = getMsg(responses, 'EVENT_JADWAL', 'Cek Jadwal Event Nikon terbaru di sini:\n\n👉 https://www.altanikindo.com/events/register\n\nKetik *MENU* untuk kembali ke menu utama.');
              break;
            default:
              balasanBot = getMsg(
                responses,
                'WELCOME_NO_MENU',
                'Selamat datang di *Nikon Indonesia*. 👋\n\nKetik *MENU* untuk melihat daftar layanan yang tersedia.'
              );
              break;
          }
          break;

        case 'MENUNGGU_SERI_CLAIM': {
          const seriInput = isiPesan.trim();
          const { data: claimFound } = await supabase
            .from('claim_promo')
            .select('nomor_seri, tipe_barang, validasi_by_mkt, validasi_by_fa, nama_jasa_pengiriman, nomor_resi, catatan_mkt')
            .ilike('nomor_seri', seriInput)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (claimFound) {
            const s = claimFound;
            let msg = `Status Claim Promo:\n\n`;
            msg += `*No Seri:* ${s.nomor_seri || seriInput}\n`;
            msg += `*Barang:* ${s.tipe_barang || '-'}\n`;
            if (['HOLD', 'Valid'].includes(s.validasi_by_mkt)) msg += `*Status:* ${s.validasi_by_mkt}\n`;
            if (!isEmptyVal(s.nama_jasa_pengiriman)) msg += `*Jasa Kirim:* ${s.nama_jasa_pengiriman}\n`;
            if (!isEmptyVal(s.nomor_resi)) msg += `*No Resi:* ${s.nomor_resi}\n`;
            if (!isEmptyVal(s.catatan_mkt)) msg += `*Catatan:* ${s.catatan_mkt}\n`;
            msg += `\nKetik *MENU* untuk kembali ke menu utama.`;
            balasanBot = msg;
          } else {
            balasanBot = `Maaf, data claim dengan Nomor Seri *${seriInput}* tidak ditemukan.\n\nPastikan nomor seri sudah benar.\n\nKetik *MENU* untuk kembali ke menu utama.`;
          }
          await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomor);
          break;
        }

        case 'MENUNGGU_SERI_GARANSI': {
          const seriInput = isiPesan.trim();
          const { data: garansiFound } = await supabase
            .from('garansi')
            .select('id_claim, nomor_seri, tipe_barang, validasi_by_mkt, validasi_by_fa, jenis_garansi, lama_garansi, catatan_mkt')
            .ilike('nomor_seri', seriInput)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (garansiFound) {
            const g = garansiFound;
            let claimMkt: string | null = null;
            let claimFa: string | null = null;
            if (g.id_claim) {
              const { data: claimRel } = await supabase
                .from('claim_promo')
                .select('validasi_by_mkt, validasi_by_fa')
                .eq('id_claim', g.id_claim)
                .maybeSingle();
              if (claimRel) { claimMkt = claimRel.validasi_by_mkt; claimFa = claimRel.validasi_by_fa; }
            }
            const statusMkt = (claimMkt === 'Valid' || g.validasi_by_mkt === 'Valid') ? 'Valid' : (g.validasi_by_mkt || 'Menunggu Verifikasi');
            const statusFa = (claimFa === 'Valid' || g.validasi_by_fa === 'Valid') ? 'Valid' : (g.validasi_by_fa || 'Menunggu Verifikasi');
            let msg = `Status Garansi Anda:\n\n`;
            msg += `*No Seri:* ${g.nomor_seri || seriInput}\n`;
            msg += `*Barang:* ${g.tipe_barang || '-'}\n`;
            msg += `*Status MKT:* ${statusMkt}\n`;
            msg += `*Status FA:* ${statusFa}\n`;
            if (g.jenis_garansi) msg += `*Jenis Garansi:* ${g.jenis_garansi}\n`;
            if (g.lama_garansi) msg += `*Durasi:* ${g.lama_garansi}\n`;
            if (!isEmptyVal(g.catatan_mkt)) msg += `*Catatan:* ${g.catatan_mkt}\n`;
            msg += `\nKetik *MENU* untuk kembali ke menu utama.`;
            balasanBot = msg;
          } else {
            balasanBot = `Maaf, data garansi dengan Nomor Seri *${seriInput}* tidak ditemukan.\n\nKetik *3* untuk mendaftarkan garansi, atau ketik *MENU* untuk kembali ke menu utama.`;
          }
          await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomor);
          break;
        }

        default:
          if (statusSaatIni === 'MENUNGGU_UPLOAD_WEB') {
            balasanBot = `Silakan selesaikan pengisian form Claim Promo di:\n👉 https://altanikindo.com/nikon/form-claim\n\nKetik *MENU* untuk kembali ke menu utama.`;
          } else if (statusSaatIni === 'MENUNGGU_UPLOAD_GARANSI_WEB') {
            balasanBot = `Silakan selesaikan pendaftaran Garansi di:\n👉 https://altanikindo.com/nikon/form-garansi\n\nKetik *MENU* untuk kembali ke menu utama.`;
          } else {
            balasanBot = getMsg(
              responses,
              'WELCOME_NO_MENU',
              'Selamat datang di *Nikon Indonesia*. 👋\n\nKetik *MENU* untuk melihat daftar layanan yang tersedia.'
            );
          }
          break;
      }
    }

    const finalReply = balasanBot || 'Ketik *MENU* untuk memulai layanan.';

    // Log outgoing bot message
    await supabase.from('riwayat_pesan').insert({
      nomor_wa: nomor,
      nama_profil_wa: 'Sistem Bot Web',
      arah_pesan: 'OUT_WEB',
      isi_pesan: finalReply,
      waktu_pesan: new Date().toISOString(),
    });

    return NextResponse.json({ reply: finalReply });
  } catch (err: unknown) {
    console.error('[chat-web] error:', err);
    return NextResponse.json(
      { reply: 'Maaf, terjadi kesalahan sistem. Silakan coba lagi atau hubungi kami via WhatsApp.' },
      { status: 200 }
    );
  }
}
