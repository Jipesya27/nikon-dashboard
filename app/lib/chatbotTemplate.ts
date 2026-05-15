import { SupabaseClient } from '@supabase/supabase-js';

export interface TemplateInfo {
   label: string;
   category: string;
   vars: string[];
   template: string;
}

export const DB_KEY_PREFIX = 'chatbot_text:';

export const TEMPLATE_CATEGORIES = ['Karyawan', 'Peminjaman', 'Claim', 'Garansi', 'Event'];

export const DEFAULT_TEMPLATES: Record<string, TemplateInfo> = {
   forgotPassword: {
      label: 'Reset Password (User Sendiri)',
      category: 'Karyawan',
      vars: ['nama', 'pass'],
      template: 'Halo *{nama}*,\n\nPassword Anda telah di-reset. Silakan gunakan password sementara berikut untuk login:\n\n*Password Baru:* `{pass}`\n\nSegera ganti password Anda setelah berhasil login.',
   },
   newKaryawan: {
      label: 'Karyawan Baru Dibuat',
      category: 'Karyawan',
      vars: ['nama', 'user', 'pass'],
      template: 'Selamat bergabung, *{nama}*!\n\nAkun Anda untuk dashboard Nikon telah dibuat.\n\n*Username:* `{user}`\n*Password:* `{pass}`\n\nSilakan login dan segera ganti password Anda.',
   },
   updatePasswordAdmin: {
      label: 'Password Diperbarui oleh Admin',
      category: 'Karyawan',
      vars: ['nama', 'pass'],
      template: 'Halo *{nama}*,\n\nPassword Anda telah diperbarui oleh Admin.\n\n*Password Baru:* `{pass}`',
   },
   resetPasswordAdmin: {
      label: 'Password Di-reset oleh Admin',
      category: 'Karyawan',
      vars: ['nama', 'pass'],
      template: 'Halo *{nama}*,\n\nPassword Anda telah di-reset oleh Admin.\n\n*Password Baru:* `{pass}`',
   },
   lendingInitHeader: {
      label: 'Peminjaman — Header Notifikasi',
      category: 'Peminjaman',
      vars: ['nama'],
      template: 'Halo *{nama}*,\n\nBerikut adalah detail peminjaman barang Anda:',
   },
   lendingInitItem: {
      label: 'Peminjaman — Baris Item Barang',
      category: 'Peminjaman',
      vars: ['idx', 'barang', 'sn', 'catatan'],
      template: '\n\n*Barang {idx}:* {barang}\n*No. Seri:* {sn}{?catatan}\n*Catatan:* {catatan}{/?catatan}',
   },
   lendingInitFooter: {
      label: 'Peminjaman — Footer Notifikasi',
      category: 'Peminjaman',
      vars: [],
      template: '\n\nMohon untuk menjaga kondisi barang dengan baik. Terima kasih.',
   },
   lendingReturnHeader: {
      label: 'Pengembalian — Header Notifikasi',
      category: 'Peminjaman',
      vars: ['nama'],
      template: 'Halo *{nama}*,\n\nTerima kasih, kami telah menerima pengembalian barang berikut:',
   },
   lendingReturnItem: {
      label: 'Pengembalian — Baris Item Barang',
      category: 'Peminjaman',
      vars: ['idx', 'barang', 'sn', 'catatan'],
      template: '\n\n*Barang {idx}:* {barang}\n*No. Seri:* {sn}{?catatan}\n*Catatan Pengembalian:* {catatan}{/?catatan}',
   },
   lendingReturnFooter: {
      label: 'Pengembalian — Footer Notifikasi',
      category: 'Peminjaman',
      vars: [],
      template: '\n\nTerima kasih atas kerja sama Anda.',
   },
   statusClaim: {
      label: 'Update Status Claim Promo',
      category: 'Claim',
      vars: ['nomor_seri', 'tipe_barang', 'status_mkt', 'status_fa', 'jasa_kirim', 'nomor_resi', 'catatan_mkt'],
      template: 'Status Claim Promo Anda:\n\n{?nomor_seri}No Seri: {nomor_seri}\n{/?nomor_seri}{?tipe_barang}Barang: {tipe_barang}\n{/?tipe_barang}{?status_mkt}Status MKT: {status_mkt}\n{/?status_mkt}{?status_fa}Status FA: {status_fa}\n{/?status_fa}{?jasa_kirim}Jasa Kirim: {jasa_kirim}\n{/?jasa_kirim}{?nomor_resi}No Resi: {nomor_resi}\n{/?nomor_resi}{?catatan_mkt}Catatan MKT: {catatan_mkt}\n{/?catatan_mkt}\nTerima kasih.',
   },
   statusGaransi: {
      label: 'Update Status Garansi',
      category: 'Garansi',
      vars: ['seri', 'barang', 'jenis', 'lama', 'sisa'],
      template: 'Update Status Garansi Anda:\n\n*No. Seri:* {seri}\n*Barang:* {barang}\n\n*Jenis Garansi:* {jenis}\n*Durasi:* {lama}\n*Sisa Garansi:* {sisa}\n\nTerima kasih.',
   },
   eventRegistrationApproved: {
      label: 'Event — Pendaftaran Disetujui',
      category: 'Event',
      vars: ['nama', 'eventTitle', 'ticketLink'],
      template: 'Halo *{nama}*,\n\nSelamat! Pendaftaran Anda untuk acara *{eventTitle}* telah *dikonfirmasi* ✅\n\nSilakan download tiket Anda di link berikut:\n{ticketLink}\n\nTunjukkan tiket (atau QR code) ini saat registrasi ulang di lokasi acara.\n\nSampai jumpa di acara! 📸',
   },
   eventRegistrationRejected: {
      label: 'Event — Pendaftaran Ditolak',
      category: 'Event',
      vars: ['nama', 'eventTitle', 'reason'],
      template: 'Halo *{nama}*,\n\nMaaf, kami tidak dapat mengonfirmasi pendaftaran Anda untuk acara *{eventTitle}*.\n\n{?reason}Alasan: {reason}\n\n{/?reason}Jika ada pertanyaan, silakan hubungi kami. Terima kasih.',
   },
   depositRefundReady: {
      label: 'Event — Refund Deposit Siap',
      category: 'Event',
      vars: ['nama', 'eventTitle', 'refundLink'],
      template: 'Halo *{nama}*,\n\nDeposit Anda untuk acara *{eventTitle}* telah diproses dan siap dikembalikan 🎉\n\nLihat bukti pengembalian deposit di link berikut:\n{refundLink}\n\nTerima kasih telah berpartisipasi!',
   },
};

/**
 * Apply a template string with variable substitution.
 * Supports {varName} placeholders and {?varName}...{/?varName} conditionals.
 * Conditionals are hidden if the variable is empty, '-', or 'BELUM_DIISI'.
 */
export function applyTemplate(template: string, vars: Record<string, string | number>): string {
   const isEmpty = (v: string) => !v || v === '-' || v === 'BELUM_DIISI';
   // Process {?var}...{/?var} conditionals
   let result = template.replace(/\{\?(\w+)\}([\s\S]*?)\{\/\?\1\}/g, (_match, key, content) => {
      const val = String(vars[key] ?? '');
      return isEmpty(val) ? '' : content;
   });
   // Replace {var} placeholders
   result = result.replace(/\{(\w+)\}/g, (_match, key) => String(vars[key] ?? ''));
   return result;
}

/** Load all saved templates from Supabase pengaturan_bot table. */
export async function loadChatbotTemplates(supabase: SupabaseClient): Promise<Record<string, string>> {
   const { data } = await supabase
      .from('pengaturan_bot')
      .select('nama_pengaturan, description')
      .like('nama_pengaturan', `${DB_KEY_PREFIX}%`);

   const result: Record<string, string> = {};
   for (const row of (data || []) as { nama_pengaturan: string; description: string | null }[]) {
      const key = row.nama_pengaturan.replace(DB_KEY_PREFIX, '');
      if (row.description) result[key] = row.description;
   }
   return result;
}

/** Build a message using DB overrides or fallback to defaults. */
export function buildChatbotMsg(
   loadedTemplates: Record<string, string>,
   key: string,
   vars: Record<string, string | number>,
): string {
   const tmpl = loadedTemplates[key] ?? DEFAULT_TEMPLATES[key]?.template ?? '';
   return applyTemplate(tmpl, vars);
}
