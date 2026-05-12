import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FONNTE_TOKEN = process.env.FONNTE_TOKEN || '';

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
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Google Auth gagal: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function uploadToDrive(file: File, fileName: string, accessToken: string): Promise<string> {
  const metadata = { name: fileName, parents: [FOLDER_ID] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
  );
  const data = await res.json();
  if (!data.id) throw new Error(`Upload Drive gagal: ${JSON.stringify(data)}`);

  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  return `https://drive.google.com/uc?id=${data.id}&export=view`;
}

async function kirimWA(nomor: string, pesan: string) {
  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN },
      body: new URLSearchParams({ target: nomor, message: pesan }),
    });
  } catch (e) {
    console.error('Gagal kirim WA:', e);
  }
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
    const email               = (formData.get('email') as string)?.trim() || null;
    const tipe_kamera         = (formData.get('tipe_kamera') as string)?.trim();
    const kabupaten_kotamadya = (formData.get('kabupaten_kotamadya') as string)?.trim();
    const nama_bank           = (formData.get('nama_bank') as string)?.trim() || null;
    const no_rekening         = (formData.get('no_rekening') as string)?.trim() || null;
    const nama_pemilik_rekening = (formData.get('nama_pemilik_rekening') as string)?.trim() || null;

    const fileBukti = formData.get('bukti_transfer') as File | null;

    const required = { event_id, nama_lengkap, nomor_wa_input, tipe_kamera, kabupaten_kotamadya };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return NextResponse.json({ error: `Field '${k}' wajib diisi.` }, { status: 400 });
    }
    if (!fileBukti) {
      return NextResponse.json({ error: 'Bukti transfer wajib diunggah.' }, { status: 400 });
    }

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
      .select('id, event_title, event_status, event_partisipant_stock, event_payment_tipe, event_date')
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

    // Insert registrasi
    const { error: insertError } = await supabase.from('event_registrations').insert({
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
    });

    if (insertError) {
      return NextResponse.json({ error: 'Gagal menyimpan pendaftaran: ' + insertError.message }, { status: 500 });
    }

    // Kirim notif WA ke peserta (best-effort)
    const waMsg = `Halo *${nama_lengkap}*,\n\nPendaftaran Anda untuk event *${event.event_title}* telah kami terima ✅\n\nStatus: *Menunggu Validasi*\n\nKami akan memverifikasi bukti pembayaran Anda. Notifikasi konfirmasi akan dikirim via WhatsApp dalam 1-2 hari kerja.\n\nTerima kasih.`;
    // konversi 08... ke 62... untuk Fonnte
    const waTarget = nomor_wa.startsWith('0') ? '62' + nomor_wa.slice(1) : nomor_wa;
    await kirimWA(waTarget, waMsg);

    return NextResponse.json({ success: true, message: 'Pendaftaran event berhasil dikirim!' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
