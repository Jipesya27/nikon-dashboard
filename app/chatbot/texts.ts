export const chatbotTexts = {
  forgotPassword: (nama: string, tempPw: string) =>
    `Halo ${nama},\n\nPermintaan reset password Anda telah diterima. Password sementara Anda adalah: *${tempPw}*\n\nSilakan login dan segera ubah password Anda di dashboard.`,

  newKaryawan: (nama: string, username: string, passwordToUse: string) =>
    `Halo ${nama},\n\nAnda telah terdaftar sebagai karyawan di Alta Nikindo Dashboard.\n\nUsername: *${username}*\nPassword: *${passwordToUse}*\n\nSilakan login dan segera ubah password Anda.`,

  updatePasswordAdmin: (nama: string, passwordBaru: string) =>
    `Halo ${nama},\n\nPassword akun Anda telah diperbarui oleh Admin.\n\nPassword baru: *${passwordBaru}*`,

  resetPasswordAdmin: (nama: string, passwordBaru: string) =>
    `Halo ${nama},\n\nPassword akun Anda telah di-reset oleh Admin.\n\nPassword baru: *${passwordBaru}*`,

  statusClaim: (nomor_seri: string, tipe_barang: string, status_mkt: string, status_fa: string, jasa_kirim: string, nomor_resi: string) =>
    `Status Claim Promo Anda:\n\nNo Seri: ${nomor_seri}\nBarang: ${tipe_barang}\nStatus MKT: ${status_mkt}\nStatus FA: ${status_fa}\nJasa Kirim: ${jasa_kirim}\nNo Resi: ${nomor_resi}\n\nTerima kasih.`,

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
