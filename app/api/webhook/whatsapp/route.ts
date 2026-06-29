import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  getAccessToken,
  getOrCreateFolder,
  uploadBufferToDrive,
  ROOT_FOLDER_ID,
} from '@/app/lib/googleDrive';

function generateKonsumenID() {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `AN${randomDigits}`;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Meta webhook verification (hub challenge)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WEBHOOK] Meta verification successful');
    return new Response(challenge, { status: 200 });
  }

  console.warn('[WEBHOOK] Meta verification failed — token mismatch');
  return new Response('Forbidden', { status: 403 });
}

// POST: Meta WhatsApp Business Cloud API incoming messages
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages: unknown[] = value.messages ?? [];
        const contacts: unknown[] = value.contacts ?? [];

        // Nomor telepon bisnis kita — pesan dari nomor ini adalah echo, skip
        const businessPhoneId = (value.metadata as Record<string, string>)?.phone_number_id || '';
        const businessDisplayPhone = (value.metadata as Record<string, string>)?.display_phone_number?.replace(/\D/g, '') || '';

        for (const msg of messages) {
          const m = msg as Record<string, unknown>;
          const msgType = m.type as string;

          // Hanya proses teks dan gambar
          const isSupportedType = ['text', 'image', 'document', 'video', 'audio'].includes(msgType);
          if (!isSupportedType) continue;

          const from = m.from as string;

          // Skip echo: pesan yang dikirim OLEH bisnis (bukan dari konsumen)
          const fromNorm = from.replace(/\D/g, '');
          if (businessDisplayPhone && fromNorm === businessDisplayPhone) continue;
          if (businessPhoneId && from === businessPhoneId) continue;
          const timestamp = m.timestamp as string;

          const contact = (contacts as Record<string, unknown>[]).find(
            (c) => (c.wa_id as string) === from
          );
          const senderName =
            ((contact?.profile as Record<string, string>)?.name) || from;

          const nomor_wa = from.replace(/\D/g, '');
          const normalizedWa = nomor_wa.startsWith('62')
            ? nomor_wa
            : `62${nomor_wa.slice(-12)}`;

          // Ambil isi pesan berdasarkan tipe
          let text = '';
          let mediaUrl = '';

          if (msgType === 'text') {
            text = (m.text as Record<string, string>)?.body ?? '';
          } else {
            // Gambar / dokumen / video / audio
            const mediaObj = m[msgType] as Record<string, string> | undefined;
            const mediaId = mediaObj?.id;
            const caption = mediaObj?.caption ?? '';
            text = caption || `[${msgType}]`;

            if (mediaId) {
              try {
                // Step 1: ambil info media dari Meta (URL temporary + mime_type)
                const metaRes = await fetch(
                  `https://graph.facebook.com/v25.0/${mediaId}`,
                  { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } }
                );
                const metaData = await metaRes.json() as Record<string, string>;
                const tempUrl  = metaData.url ?? '';
                const mimeType = metaData.mime_type ?? 'application/octet-stream';

                if (tempUrl) {
                  // Step 2: download file dari Meta
                  const dlRes = await fetch(tempUrl, {
                    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
                  });
                  const buffer = await dlRes.arrayBuffer();

                  // Step 3: upload permanen ke Google Drive folder message_attachment
                  const gToken   = await getAccessToken();
                  const folderId = await getOrCreateFolder('message_attachment', ROOT_FOLDER_ID, gToken);
                  const ext      = mimeType.split('/')[1]?.split(';')[0] ?? 'bin';
                  const fileName = `wa_${normalizedWa}_${Date.now()}.${ext}`;
                  mediaUrl = await uploadBufferToDrive(buffer, mimeType, fileName, folderId, gToken);
                  console.log(`[WEBHOOK] Media ${msgType} → Drive:`, mediaUrl);
                }
              } catch (e) {
                console.error('[WEBHOOK] Gagal upload media ke Drive:', e);
              }
            }
          }

          // STEP 1: Pastikan konsumen ada (FK ke tabel konsumen)
          const { data: konsumen, error: konsumenError } = await supabase
            .from('konsumen')
            .select('nomor_wa, id_konsumen')
            .eq('nomor_wa', normalizedWa)
            .single();

          if (konsumenError && konsumenError.code !== 'PGRST116') {
            console.error('[WEBHOOK] Error cek konsumen:', konsumenError.message);
          }

          if (!konsumen) {
            const newID = generateKonsumenID();
            const { error: createErr } = await supabase.from('konsumen').insert({
              nomor_wa: normalizedWa,
              id_konsumen: newID,
              status_langkah: 'START',
              nama_lengkap: senderName,
              nik: 'BELUM_DIISI',
              alamat_rumah: 'BELUM_DIISI',
              kelurahan: 'BELUM_DIISI',
              kecamatan: 'BELUM_DIISI',
              kabupaten_kotamadya: 'BELUM_DIISI',
              provinsi: 'BELUM_DIISI',
              kodepos: 'BELUM_DIISI',
            });
            if (createErr) {
              console.error('[WEBHOOK] Gagal buat konsumen:', createErr.message);
            } else {
              console.log('[WEBHOOK] Konsumen baru dibuat:', normalizedWa, newID);
            }
          }

          // STEP 2: Simpan pesan ke riwayat_pesan
          const pesanRecord: Record<string, unknown> = {
            nomor_wa: normalizedWa,
            nama_profil_wa: senderName,
            arah_pesan: 'IN',
            isi_pesan: text,
            waktu_pesan: new Date(Number(timestamp) * 1000).toISOString(),
            bicara_dengan_cs: false,
            created_at: new Date().toISOString(),
          };
          if (mediaUrl) pesanRecord.url_media = mediaUrl;

          const { error } = await supabase.from('riwayat_pesan').insert([pesanRecord]);

          if (error) {
            console.error('[WEBHOOK] Failed to save message:', error.message);
          } else {
            console.log('[WEBHOOK] Pesan tersimpan:', normalizedWa, text.substring(0, 50));
          }

          // STEP 3: Forward ke Edge Function untuk proses bot logic & kirim balasan
          const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/meta-bot`;
          fetch(edgeFnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              sender: normalizedWa,
              message: text,
              name: senderName,
              url_file: mediaUrl || undefined,
              skip_save: true, // sudah disimpan di atas
            }),
          }).catch((err) => console.error('[WEBHOOK] Gagal panggil edge function:', err));
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WEBHOOK] Error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
