export const chatbotTexts = {
  forgotPassword: (nama: string, tempPw: string) =>
    `Halo ${nama},\n\nPermintaan reset password Anda telah diterima. Password sementara Anda adalah: *${tempPw}*\n\nSilakan login dan segera ubah password Anda di dashboard.`,

  newKaryawan: (nama: string, username: string, passwordToUse: string) =>
    `Halo ${nama},\n\nAnda telah terdaftar sebagai karyawan di Alta Nikindo Dashboard.\n\nUsername: *${username}*\nPassword: *${passwordToUse}*\n\nSilakan login dan segera ubah password Anda.`,

  updatePasswordAdmin: (nama: string, passwordBaru: string) =>
    `Halo ${nama},\n\nPassword akun Anda telah diperbarui oleh Admin.\n\nPassword baru: *${passwordBaru}*`,

  resetPasswordAdmin: (nama: string, passwordBaru: string) =>
    `Halo ${nama},\n\nPassword akun Anda telah di-reset oleh Admin.\n\nPassword baru: *${passwordBaru}*`,

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

  statusGaransi: (nomor_seri: string, tipe_barang: string, jenis_garansi: string, lama_garansi: string, sisa_garansi: string) =>
    `Status Garansi Anda:\n\nNo Seri: ${nomor_seri}\nTipe Barang: ${tipe_barang}\nJenis Garansi: ${jenis_garansi}\nLama Garansi: ${lama_garansi}\nSisa Garansi: ${sisa_garansi}\n\nTerima kasih.`,

  lendingInitHeader: (nama_peminjam: string) =>
    `Halo *${nama_peminjam}*,\n\nAnda telah meminjam barang-barang berikut dari Nikon Indonesia:\n\n`,

  lendingInitItem: (idx: number, nama_barang: string, nomor_seri: string, catatan: string) => {
    let text = `${idx + 1}. *${nama_barang}* (SN: ${nomor_seri})\n`;
    if (catatan) text += `   Catatan: ${catatan}\n`;
    return text;
  },

  lendingInitFooter: () =>
    `\nMohon jaga barang-barang ini dengan baik. Terima kasih!`,

  lendingReturnHeader: (nama_peminjam: string) =>
    `Halo *${nama_peminjam}*,\n\nBarang-barang berikut telah Anda kembalikan ke Nikon Indonesia:\n\n`,

  lendingReturnItem: (idx: number, nama_barang: string, nomor_seri: string, catatan_pengembalian: string) =>
    `${idx + 1}. *${nama_barang}* (SN: ${nomor_seri})${catatan_pengembalian ? ` - Catatan: ${catatan_pengembalian}` : ''}\n`,

  lendingReturnFooter: () =>
    `\nTerima kasih atas kerjasamanya!`
};