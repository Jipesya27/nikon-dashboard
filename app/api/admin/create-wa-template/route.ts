/**
 * ONE-TIME USE: Buat Meta WA template 'reset_password_karyawan'
 * Hapus file ini setelah template berhasil dibuat.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, verifyIdentityToken } from '@/app/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = await cookies();
  if (!(await verifyAdminSession(cookieStore))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const identityRaw = cookieStore.get('karyawan_identity')?.value ?? '';
  const identity = await verifyIdentityToken(identityRaw);
  if (!identity || !['Admin', 'Super Admin'].includes(identity.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return NextResponse.json({ error: 'WHATSAPP_ACCESS_TOKEN atau WHATSAPP_PHONE_NUMBER_ID tidak ditemukan di env' }, { status: 500 });
  }

  // Ambil WABA ID dari Phone Number ID
  const phoneRes = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}?fields=whatsapp_business_account&access_token=${token}`,
  );
  const phoneData = await phoneRes.json();
  if (!phoneRes.ok || !phoneData.whatsapp_business_account?.id) {
    return NextResponse.json({ error: 'Gagal ambil WABA ID', detail: phoneData }, { status: 500 });
  }
  const wabaId = phoneData.whatsapp_business_account.id;

  // Buat template
  const templateBody = {
    name: 'reset_password_karyawan',
    language: 'id',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Halo {{1}},\n\nPassword akun Nikon Dashboard Anda telah diubah oleh Admin.\n\nUsername Anda: {{2}}\n\nSilakan hubungi Admin untuk mendapatkan password baru Anda secara langsung.\n\naltanikindo.com',
        example: {
          body_text: [['Budi Santoso', 'budi.santoso']],
        },
      },
    ],
  };

  const createRes = await fetch(
    `https://graph.facebook.com/v20.0/${wabaId}/message_templates`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateBody),
    },
  );
  const createData = await createRes.json();

  if (!createRes.ok) {
    return NextResponse.json({ error: 'Gagal buat template', detail: createData }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Template berhasil dibuat! Hapus file app/api/admin/create-wa-template/route.ts sekarang.',
    template: createData,
  });
}
