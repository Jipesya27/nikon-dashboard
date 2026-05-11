export const chatbotTexts = {
  // From HEAD, simple and clear
  forgotPassword: (nama: string, pass: string) => `Halo *${nama}*,\n\nPassword Anda telah di-reset. Silakan gunakan password sementara berikut untuk login:\n\n*Password Baru:* \`${pass}\`\n\nSegera ganti password Anda setelah berhasil login.`,
  newKaryawan: (nama: string, user: string, pass: string) => `Selamat bergabung, *${nama}*!\n\nAkun Anda untuk dashboard Nikon telah dibuat.\n\n*Username:* \`${user}\`\n*Password:* \`${pass}\`\n\nSilakan login dan segera ganti password Anda.`,
  updatePasswordAdmin: (nama: string, pass: string) => `Halo *${nama}*,\n\nPassword Anda telah diperbarui oleh Admin.\n\n*Password Baru:* \`${pass}\``,
  resetPasswordAdmin: (nama: string, pass: string) => `Halo *${nama}*,\n\nPassword Anda telah di-reset oleh Admin.\n\n*Password Baru:* \`${pass}\``,

  // From incoming, but adapted to HEAD's style for consistency
  lendingInitHeader: (nama: string) => `Halo *${nama}*,\n\nBerikut adalah detail peminjaman barang Anda:`,
  lendingInitItem: (idx: number, barang: string, sn: string, catatan: string) => `\n\n*Barang ${idx + 1}:* ${barang}\n*No. Seri:* ${sn}${catatan ? `\n*Catatan:* ${catatan}` : ''}`,
  lendingInitFooter: () => `\n\nMohon untuk menjaga kondisi barang dengan baik. Terima kasih.`,
  lendingReturnHeader: (nama: string) => `Halo *${nama}*,\n\nTerima kasih, kami telah menerima pengembalian barang berikut:`,
  lendingReturnItem: (idx: number, barang: string, sn: string, catatan: string) => `\n\n*Barang ${idx + 1}:* ${barang}\n*No. Seri:* ${sn}${catatan ? `\n*Catatan Pengembalian:* ${catatan}` : ''}`,
  lendingReturnFooter: () => `\n\nTerima kasih atas kerja sama Anda.`,

  // I'll use the more robust function from incoming for statusClaim
  statusClaim: (nomor_seri: string, tipe_barang: string, status_mkt: string, status_fa: string, jasa_kirim: string, nomor_resi: string, catatan_mkt?: string) => {
    let msg = `Status Claim Promo Anda:\n\n`;
    if (nomor_seri && nomor_seri !== 'BELUM_DIISI') msg += `No Seri: ${nomor_seri}\n`;
    if (tipe_barang && tipe_barang !== 'BELUM_DIISI') msg += `Barang: ${tipe_barang}\n`;
    if (status_mkt && status_mkt !== 'BELUM_DIISI') msg += `Status MKT: ${status_mkt}\n`;
    if (status_fa && status_fa !== 'BELUM_DIISI') msg += `Status FA: ${status_fa}\n`;
    if (jasa_kirim && jasa_kirim !== 'BELUM_DIISI' && jasa_kirim !== '-') msg += `Jasa Kirim: ${jasa_kirim}\n`;
    if (nomor_resi && nomor_resi !== 'BELUM_DIISI' && nomor_resi !== '-') msg += `No Resi: ${nomor_resi}\n`;
    if (catatan_mkt && catatan_mkt !== 'BELUM_DIISI' && catatan_mkt !== '-') msg += `Catatan MKT: ${catatan_mkt}\n`;
    msg += `\nTerima kasih.`;
    return msg;
  },
  // From HEAD, it's simpler and does the job
  statusGaransi: (seri: string, barang: string, jenis: string, lama: string, sisa: string) => `Update Status Garansi Anda:\n\n*No. Seri:* ${seri}\n*Barang:* ${barang}\n\n*Jenis Garansi:* ${jenis}\n*Durasi:* ${lama}\n*Sisa Garansi:* ${sisa}\n\nTerima kasih.`,

  // Add new messages from incoming
  eventRegistrationApproved: (nama: string, eventTitle: string, ticketLink: string) =>
    `Halo *${nama}*,\n\nSelamat! Pendaftaran Anda untuk acara *${eventTitle}* telah *dikonfirmasi* ✅\n\nSilakan download tiket Anda di link berikut:\n${ticketLink}\n\nTunjukkan tiket (atau QR code) ini saat registrasi ulang di lokasi acara.\n\nSampai jumpa di acara! 📸`,

  eventRegistrationRejected: (nama: string, eventTitle: string, reason?: string) => {
    let msg = `Halo *${nama}*,\n\nMaaf, kami tidak dapat mengonfirmasi pendaftaran Anda untuk acara *${eventTitle}*.`;
    if (reason) msg += `\n\nAlasan: ${reason}`;
    msg += `\n\nJika ada pertanyaan, silakan hubungi kami. Terima kasih.`;
    return msg;
  },

  depositRefundReady: (nama: string, eventTitle: string, refundLink: string) =>
    `Halo *${nama}*,\n\nDeposit Anda untuk acara *${eventTitle}* telah diproses dan siap dikembalikan 🎉\n\nLihat bukti pengembalian deposit di link berikut:\n${refundLink}\n\nTerima kasih telah berpartisipasi!`,
};

