export const chatbotTexts = {
  forgotPassword: (nama: string, pass: string) => `Halo *${nama}*,\n\nPassword Anda telah di-reset. Silakan gunakan password sementara berikut untuk login:\n\n*Password Baru:* \`${pass}\`\n\nSegera ganti password Anda setelah berhasil login.`,
  newKaryawan: (nama: string, user: string, pass: string) => `Selamat bergabung, *${nama}*!\n\nAkun Anda untuk dashboard Nikon telah dibuat.\n\n*Username:* \`${user}\`\n*Password:* \`${pass}\`\n\nSilakan login dan segera ganti password Anda.`,
  updatePasswordAdmin: (nama: string, pass: string) => `Halo *${nama}*,\n\nPassword Anda telah diperbarui oleh Admin.\n\n*Password Baru:* \`${pass}\``,
  resetPasswordAdmin: (nama: string, pass: string) => `Halo *${nama}*,\n\nPassword Anda telah di-reset oleh Admin.\n\n*Password Baru:* \`${pass}\``,
  lendingInitHeader: (nama: string) => `Halo *${nama}*,\n\nBerikut adalah detail peminjaman barang Anda:`,
  lendingInitItem: (idx: number, barang: string, sn: string, catatan: string) => `\n\n*Barang ${idx + 1}:* ${barang}\n*No. Seri:* ${sn}${catatan ? `\n*Catatan:* ${catatan}` : ''}`,
  lendingInitFooter: () => `\n\nMohon untuk menjaga kondisi barang dengan baik. Terima kasih.`,
  lendingReturnHeader: (nama: string) => `Halo *${nama}*,\n\nTerima kasih, kami telah menerima pengembalian barang berikut:`,
  lendingReturnItem: (idx: number, barang: string, sn: string, catatan: string) => `\n\n*Barang ${idx + 1}:* ${barang}\n*No. Seri:* ${sn}${catatan ? `\n*Catatan Pengembalian:* ${catatan}` : ''}`,
  lendingReturnFooter: () => `\n\nTerima kasih atas kerja sama Anda.`,
  statusClaim: (seri: string, barang: string, mkt: string, fa: string, kurir: string, resi: string, catatan: string) => `Update Status Claim Anda:\n\n*No. Seri:* ${seri}\n*Barang:* ${barang}\n\n*Status Marketing:* ${mkt}\n*Status Finance:* ${fa}\n*Jasa Kirim:* ${kurir}\n*No. Resi:* ${resi}\n${catatan ? `*Catatan:* ${catatan}\n` : ''}\nTerima kasih.`,
  statusGaransi: (seri: string, barang: string, jenis: string, lama: string, sisa: string) => `Update Status Garansi Anda:\n\n*No. Seri:* ${seri}\n*Barang:* ${barang}\n\n*Jenis Garansi:* ${jenis}\n*Durasi:* ${lama}\n*Sisa Garansi:* ${sisa}\n\nTerima kasih.`,
};