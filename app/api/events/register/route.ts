import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotif } from '@/app/lib/notify';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE env belum di-set.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getAccessToken() {
  let res: Response;
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    throw new Error('Google Auth timeout atau jaringan bermasalah. Coba lagi.');
  }
  const data = await res.json();
  if (!data.access_token) {
    const hint = data.error === 'invalid_grant'
      ? 'Refresh token expired — minta admin perbarui GOOGLE_REFRESH_TOKEN.'
      : JSON.stringify(data);
    throw new Error(`Google Auth gagal: ${hint}`);
  }
  return data.access_token as string;
}

async function uploadToDrive(file: File, fileName: string, accessToken: string): Promise<string> {
  const metadata = { name: fileName, parents: [FOLDER_ID] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  let res: Response;
  try {
    res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form, signal: AbortSignal.timeout(15000) }
    );
  } catch {
    throw new Error('Upload ke Google Drive timeout. File mungkin terlalu besar atau koneksi lambat.');
  }
  const data = await res.json();
  if (!data.id) throw new Error(`Upload Drive gagal: ${JSON.stringify(data)}`);


  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

// Parse tanggal Indonesia "1 Juli 2026" → Date
const ID_MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};
function parseIdDate(str: string): Date | null {
  if (!str) return null;
  const p = str.trim().toLowerCase().split(/\s+/);
  if (p.length < 3) return null;
  const d = parseInt(p[0]), m = ID_MONTHS[p[1]], y = parseInt(p[2]);
  if (isNaN(d) || m === undefined || isNaN(y)) return null;
  return new Date(y, m, d + 1);
}

// GET: list event aktif (status In stock, kuota belum penuh, belum lewat)
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Hitung jumlah registrasi per event
    const eventIds = (events || []).map(e => e.id);
    const counts: Record<string, number> = {};
    if (eventIds.length > 0) {
      const { data: regs } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds);
      (regs || []).forEach(r => {
        if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
    }

    // Filter event yang masih bisa didaftar
    const now = new Date();
    const activeEvents = (events || []).filter(e => {
      if (e.event_status === 'close' || e.event_status === 'Out of stock') return false;
      const evtDate = parseIdDate(e.event_date);
      if (evtDate && evtDate < now) return false;
      const regCount = counts[e.id] || 0;
      if (e.event_partisipant_stock > 0 && regCount >= e.event_partisipant_stock) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      events: activeEvents.map(e => ({
        id: e.id,
        event_title: e.event_title,
        event_date: e.event_date,
        event_price: e.event_price,
        event_image: e.event_image,
        event_description: e.event_description,
        event_speaker: e.event_speaker,
        event_speaker_genre: e.event_speaker_genre,
        event_payment_tipe: e.event_payment_tipe,
        deposit_amount: e.deposit_amount,
        bank_info: e.bank_info,
        event_partisipant_stock: e.event_partisipant_stock,
        registered_count: counts[e.id] || 0,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: submit pendaftaran event
export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const formData = await req.formData();

    const event_id            = (formData.get('event_id') as string)?.trim();
    const nama_lengkap        = (formData.get('nama_lengkap') as string)?.trim();
    const nomor_wa_input      = (formData.get('nomor_wa') as string)?.trim() || '';
    const email               = (formData.get('email') as string)?.trim().toLowerCase() || null;
    const tipe_kamera         = (formData.get('tipe_kamera') as string)?.trim();
    const kabupaten_kotamadya = (formData.get('kabupaten_kotamadya') as string)?.trim();
    const nama_bank           = (formData.get('nama_bank') as string)?.trim() || null;
    const no_rekening         = (formData.get('no_rekening') as string)?.trim() || null;
    const nama_pemilik_rekening = (formData.get('nama_pemilik_rekening') as string)?.trim() || null;

    const fileBukti = formData.get('bukti_transfer') as File | null;

    const required = { event_id, nama_lengkap, nomor_wa_input, email, tipe_kamera, kabupaten_kotamadya };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return NextResponse.json({ error: `Field '${k}' wajib diisi.` }, { status: 400 });
    }
    if (!fileBukti) {
      return NextResponse.json({ error: 'Bukti transfer wajib diunggah.' }, { status: 400 });
    }

    // Validasi tipe dan ukuran file bukti transfer
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (!ALLOWED_MIME_TYPES.includes(fileBukti.type)) {
      return NextResponse.json({ error: 'File bukti transfer: tipe tidak diizinkan. Gunakan JPG, PNG, WEBP, GIF, atau PDF.' }, { status: 400 });
    }
    if (fileBukti.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File bukti transfer: ukuran maksimal 10 MB.' }, { status: 400 });
    }

    // Validasi panjang input
    if (nama_lengkap && nama_lengkap.length > 150) return NextResponse.json({ error: 'Nama terlalu panjang.' }, { status: 400 });
    if (email && email.length > 200) return NextResponse.json({ error: 'Email terlalu panjang.' }, { status: 400 });
    if (tipe_kamera && tipe_kamera.length > 100) return NextResponse.json({ error: 'Tipe kamera terlalu panjang.' }, { status: 400 });
    if (kabupaten_kotamadya && kabupaten_kotamadya.length > 100) return NextResponse.json({ error: 'Kabupaten/kotamadya terlalu panjang.' }, { status: 400 });

    // Normalisasi nomor_wa ke format 08...
    let nomor_wa = nomor_wa_input.replace(/[^0-9]/g, '');
    if (nomor_wa.startsWith('62')) nomor_wa = '0' + nomor_wa.slice(2);
    else if (!nomor_wa.startsWith('0')) nomor_wa = '0' + nomor_wa;
    if (nomor_wa.length < 10 || nomor_wa.length > 15) {
      return NextResponse.json({ error: 'Format nomor WhatsApp tidak valid.' }, { status: 400 });
    }

    // Ambil detail event
    const { data: event } = await supabase
      .from('events')
      .select('id, event_title, event_status, event_partisipant_stock, event_payment_tipe, event_date, event_price, event_speaker, event_speaker_genre, event_description, event_image')
      .eq('id', event_id)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 });
    }
    if (event.event_status === 'close') {
      return NextResponse.json({ error: 'Pendaftaran event ini sudah ditutup.' }, { status: 400 });
    }
    const evtDate = parseIdDate(event.event_date);
    if (evtDate && evtDate < new Date()) {
      return NextResponse.json({ error: 'Event sudah selesai.' }, { status: 400 });
    }

    // Cek kuota
    if (event.event_partisipant_stock > 0) {
      const { count } = await supabase
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id);
      if ((count ?? 0) >= event.event_partisipant_stock) {
        return NextResponse.json({ error: 'Kuota event sudah penuh.' }, { status: 400 });
      }
    }

    // Cek duplikasi: nomor WA sama untuk event sama
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('id, status_pendaftaran')
      .eq('event_id', event_id)
      .eq('nomor_wa', nomor_wa)
      .maybeSingle();
    if (existing && existing.status_pendaftaran !== 'ditolak') {
      return NextResponse.json({ error: 'Nomor WhatsApp ini sudah terdaftar di event ini.' }, { status: 400 });
    }

    // Validasi deposit field
    const isDeposit = event.event_payment_tipe === 'deposit';
    if (isDeposit && (!nama_bank || !no_rekening || !nama_pemilik_rekening)) {
      return NextResponse.json({
        error: 'Data rekening bank wajib diisi untuk event tipe deposit (untuk refund nanti).',
      }, { status: 400 });
    }

    // Upload bukti transfer ke Drive
    const accessToken = await getAccessToken();
    const ext = fileBukti.name.split('.').pop() || 'jpg';
    const fileName = `EventReg_${event.event_title}_${nama_lengkap}_${Date.now()}.${ext}`;
    const buktiUrl = await uploadToDrive(fileBukti, fileName, accessToken);

    // Insert registrasi — return id untuk nomor tiket
    const { data: insertedReg, error: insertError } = await supabase
      .from('event_registrations')
      .insert({
        event_id,
        event_name: event.event_title,
        nama_lengkap,
        nomor_wa,
        email,
        tipe_kamera,
        kabupaten_kotamadya,
        payment_type: event.event_payment_tipe || 'regular',
        bukti_transfer_url: buktiUrl,
        status_pendaftaran: 'menunggu_validasi',
        nama_bank,
        no_rekening,
        nama_pemilik_rekening,
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Gagal menyimpan pendaftaran: ' + insertError.message }, { status: 500 });
    }

    // Format nomor tiket dari UUID atau integer
    const rawId = insertedReg?.id ?? '';
    const ticketNo = typeof rawId === 'number'
      ? `EVT-${String(rawId).padStart(6, '0')}`
      : `EVT-${String(rawId).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

    const hargaFormatted = event.event_price
      ? `Rp ${Number(event.event_price).toLocaleString('id-ID')}`
      : 'Gratis';

    // ── HTML Tiket Email ───────────────────────────────────────────────────
    const ticketHtml = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tiket Event ${event.event_title}</title></head>
<body style="margin:0;padding:20px 8px;background:#1a1a1a;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:580px;margin:0 auto">

  <!-- Header Nikon -->
  <div style="background:#111;padding:20px 24px 16px;border-radius:12px 12px 0 0;text-align:center">
    <div style="display:inline-block;background:#FFE000;padding:4px 14px;border-radius:4px;margin-bottom:10px">
      <span style="font-size:18px;font-weight:900;color:#000;letter-spacing:3px">NIKON</span>
    </div>
    <p style="color:#ccc;font-size:12px;margin:0;letter-spacing:1px;text-transform:uppercase">Tiket Pendaftaran Event</p>
  </div>

  <!-- Event Banner -->
  ${event.event_image ? `<div style="background:#222;height:160px;overflow:hidden">
    <img src="${event.event_image}" alt="${event.event_title}" style="width:100%;height:100%;object-fit:cover;opacity:0.85">
  </div>` : `<div style="background:linear-gradient(135deg,#222,#333);height:80px;display:flex;align-items:center;justify-content:center">
    <span style="color:#FFE000;font-size:32px">📷</span>
  </div>`}

  <!-- Ticket body -->
  <div style="background:#fff;padding:24px">

    <!-- Event title & date -->
    <h1 style="font-size:20px;font-weight:900;color:#111;margin:0 0 4px;line-height:1.3">${event.event_title}</h1>
    ${event.event_speaker ? `<p style="margin:0 0 16px;font-size:13px;color:#666">🎤 ${event.event_speaker}${event.event_speaker_genre ? ` · ${event.event_speaker_genre}` : ''}</p>` : '<div style="margin-bottom:16px"></div>'}

    <!-- Info grid -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr style="background:#f9f9f9">
        <td style="padding:10px 12px;font-size:12px;color:#888;width:38%;border-bottom:1px solid #eee">📅 Tanggal</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#111;border-bottom:1px solid #eee">${event.event_date || '-'}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:12px;color:#888;border-bottom:1px solid #eee">💰 Harga</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#111;border-bottom:1px solid #eee">${hargaFormatted}</td>
      </tr>
      <tr style="background:#f9f9f9">
        <td style="padding:10px 12px;font-size:12px;color:#888;border-bottom:1px solid #eee">💳 Tipe Pembayaran</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#111;border-bottom:1px solid #eee;text-transform:capitalize">${event.event_payment_tipe || 'regular'}</td>
      </tr>
    </table>

    <!-- Dashed separator (ticket style) -->
    <div style="border-top:2px dashed #ddd;margin:20px -24px;position:relative">
      <div style="position:absolute;left:-12px;top:-12px;width:24px;height:24px;background:#fff;border-radius:50%;border:2px dashed #ddd"></div>
      <div style="position:absolute;right:-12px;top:-12px;width:24px;height:24px;background:#fff;border-radius:50%;border:2px dashed #ddd"></div>
    </div>

    <!-- Peserta info -->
    <p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Data Peserta</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr>
        <td style="padding:7px 0;font-size:12px;color:#888;width:38%">Nama Lengkap</td>
        <td style="padding:7px 0;font-size:13px;font-weight:700;color:#111">${nama_lengkap}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;font-size:12px;color:#888">No. WhatsApp</td>
        <td style="padding:7px 0;font-size:13px;color:#333">${nomor_wa}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;font-size:12px;color:#888">Kamera</td>
        <td style="padding:7px 0;font-size:13px;color:#333">${tipe_kamera}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;font-size:12px;color:#888">Kota</td>
        <td style="padding:7px 0;font-size:13px;color:#333">${kabupaten_kotamadya}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;font-size:12px;color:#888">Waktu Daftar</td>
        <td style="padding:7px 0;font-size:13px;color:#333">${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    </table>

    <!-- Nomor Tiket -->
    <div style="background:#111;border-radius:8px;padding:16px;text-align:center;margin-bottom:16px">
      <p style="margin:0 0 4px;font-size:11px;color:#999;letter-spacing:2px;text-transform:uppercase">Nomor Tiket</p>
      <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:4px;color:#FFE000;font-family:monospace">${ticketNo}</p>
    </div>

    <!-- Status badge -->
    <div style="background:#FFF8E1;border:1px solid #FFD740;border-radius:8px;padding:14px 16px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#F57F17">⏳ Status: Menunggu Validasi Pembayaran</p>
      <p style="margin:0;font-size:12px;color:#795548;line-height:1.5">
        Bukti pembayaran Anda sedang diverifikasi oleh tim kami.<br>
        Konfirmasi akan dikirim ke email ini dalam <strong>1–2 hari kerja</strong>.<br>
        Simpan nomor tiket ini sebagai referensi.
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#111;padding:16px 24px;border-radius:0 0 12px 12px;text-align:center">
    <p style="color:#666;font-size:11px;margin:0 0 4px">Nikon Service Center — Alta Nikon Indo</p>
    <p style="color:#444;font-size:10px;margin:0">Email ini dikirim otomatis, mohon jangan dibalas. Pertanyaan? Hubungi kami via WhatsApp.</p>
  </div>

</div>
</body></html>`;

    // Notif ke peserta & admin (channel: WA / Email / keduanya)
    const pesanWA = `Halo *${nama_lengkap}*,\n\nPendaftaran Anda untuk event *${event.event_title}* telah kami terima ✅\n\nNo. Tiket: *${ticketNo}*\nStatus: *Menunggu Validasi*\n\nKami akan memverifikasi bukti pembayaran Anda. Konfirmasi akan dikirim dalam 1–2 hari kerja.\n\nTerima kasih.`;
    const pesanAdmin =
      `🔔 *Pendaftar Event Baru!*\n\n` +
      `📋 *Event:* ${event.event_title}\n` +
      `👤 *Nama:* ${nama_lengkap}\n` +
      `📱 *WhatsApp:* ${nomor_wa}\n` +
      `📧 *Email:* ${email || '-'}\n` +
      `📷 *Kamera:* ${tipe_kamera}\n` +
      `📍 *Kota:* ${kabupaten_kotamadya}\n` +
      `🎫 *No. Tiket:* ${ticketNo}\n` +
      `⏰ *Waktu Daftar:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
      `Status: *Menunggu Validasi* — silakan cek tab Event di dashboard.`;

    // konversi 08... ke 62... untuk WA
    const waTarget = nomor_wa.startsWith('0') ? '62' + nomor_wa.slice(1) : nomor_wa;
    await sendNotif(
      {
        phone: waTarget,
        email,
        message: pesanWA,
        subject: `🎫 Tiket Pendaftaran — ${event.event_title}`,
        html: ticketHtml,
      },
      { message: pesanAdmin, subject: `🔔 Pendaftar Event Baru — ${event.event_title}` },
    );

    return NextResponse.json({ success: true, message: 'Pendaftaran event berhasil dikirim!' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
