import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { uploadToGoogleDrive } from '@/app/lib/google-drive';
import type { PeminjamanItem } from '@/app/index';

function wa(s: string): string {
  return (s || '').replace(/[^\x20-\xFF]/g, '').trim();
}

function sanitize(s: string): string {
  return (s || '').replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().substring(0, 60);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

export interface GenerateLendingDocInput {
  type: 'pinjam' | 'kembali';
  kodePeminjaman?: string | null;
  namaPeminjam: string;
  nomorWa: string;
  items: PeminjamanItem[];
  tanggalPeminjaman?: string | null;
  tanggalEstimasi?: string | null;
  tanggalPengembalian?: string | null;
}

export interface GenerateLendingDocResult {
  viewUrl: string;
  downloadUrl: string;
  fileName: string;
  fileId: string;
}

export async function generateLendingDoc(input: GenerateLendingDocInput): Promise<GenerateLendingDocResult> {
  const {
    type, kodePeminjaman, namaPeminjam, nomorWa,
    items, tanggalPeminjaman, tanggalEstimasi, tanggalPengembalian,
  } = input;

  const isPinjam = type === 'pinjam';
  const relevantItems = isPinjam
    ? items
    : items.filter(i => i.status_pengembalian === 'dikembalikan');

  const pdfDoc = await PDFDocument.create();
  const PAGE_W = 595;
  const PAGE_H = 842;
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const yellow      = rgb(1, 0.91, 0);
  const black       = rgb(0, 0, 0);
  const white       = rgb(1, 1, 1);
  const dim         = rgb(0.5, 0.5, 0.5);
  const textDark    = rgb(0.2, 0.2, 0.2);
  const bgPage      = rgb(0.96, 0.96, 0.97);
  const bgCard      = white;
  const divider     = rgb(0.83, 0.83, 0.83);

  // Background
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: bgPage });

  // ── HEADER ──────────────────────────────────────────
  const HDR_H = 80;
  const HDR_Y = PAGE_H - HDR_H;
  page.drawRectangle({ x: 0, y: HDR_Y, width: PAGE_W, height: HDR_H, color: yellow });
  page.drawText('NIKON', { x: 40, y: HDR_Y + 30, size: 32, font: fontBold, color: black });
  page.drawText(
    isPinjam ? 'SURAT PEMINJAMAN PERALATAN' : 'SURAT PENGEMBALIAN PERALATAN',
    { x: 41, y: HDR_Y + 12, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) },
  );
  if (kodePeminjaman) {
    const kTxt = `Kode: ${kodePeminjaman}`;
    const kW = fontBold.widthOfTextAtSize(kTxt, 11);
    page.drawText(kTxt, { x: PAGE_W - 40 - kW, y: HDR_Y + 30, size: 11, font: fontBold, color: black });
  }
  const tglHdr = `Tanggal: ${fmtDate(isPinjam ? tanggalPeminjaman : tanggalPengembalian)}`;
  const tglHdrW = fontReg.widthOfTextAtSize(tglHdr, 9);
  page.drawText(tglHdr, { x: PAGE_W - 40 - tglHdrW, y: HDR_Y + 12, size: 9, font: fontReg, color: rgb(0.3, 0.3, 0.3) });

  let cy = HDR_Y - 36;
  const L = 40;
  const R = PAGE_W - 40;
  const CX = 36;
  const CW = PAGE_W - 72;

  // ── INFO PEMINJAM ────────────────────────────────────
  const INFO_H = 76;
  page.drawRectangle({ x: CX, y: cy - INFO_H, width: CW, height: INFO_H, color: bgCard, borderColor: divider, borderWidth: 1 });
  page.drawText('INFORMASI PEMINJAM', { x: L + 4, y: cy - 14, size: 8, font: fontBold, color: dim });
  page.drawText(wa(namaPeminjam), { x: L + 4, y: cy - 32, size: 17, font: fontBold, color: black });
  page.drawText(`WhatsApp: ${wa(nomorWa)}`, { x: L + 4, y: cy - 52, size: 9, font: fontReg, color: textDark });

  if (isPinjam && tanggalEstimasi) {
    const est = `Estimasi Kembali: ${fmtDate(tanggalEstimasi)}`;
    const estW = fontBold.widthOfTextAtSize(est, 10);
    page.drawText(est, { x: R - estW, y: cy - 32, size: 10, font: fontBold, color: black });
  } else if (!isPinjam && tanggalPengembalian) {
    const ret = `Tanggal Kembali: ${fmtDate(tanggalPengembalian)}`;
    const retW = fontBold.widthOfTextAtSize(ret, 10);
    page.drawText(ret, { x: R - retW, y: cy - 32, size: 10, font: fontBold, color: black });
  }

  cy -= INFO_H + 22;

  // ── TABEL BARANG ─────────────────────────────────────
  page.drawText(
    isPinjam ? 'DAFTAR BARANG DIPINJAM' : 'DAFTAR BARANG DIKEMBALIKAN',
    { x: L, y: cy, size: 8, font: fontBold, color: dim },
  );
  cy -= 14;

  // Table header row
  const ROW_H = 26;
  page.drawRectangle({ x: CX, y: cy - ROW_H, width: CW, height: ROW_H, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('#',           { x: L + 4,   y: cy - 17, size: 8, font: fontBold, color: white });
  page.drawText('Nama Barang', { x: L + 22,  y: cy - 17, size: 8, font: fontBold, color: white });
  page.drawText('Nomor Seri',  { x: L + 215, y: cy - 17, size: 8, font: fontBold, color: white });
  page.drawText('Status',      { x: R - 55,  y: cy - 17, size: 8, font: fontBold, color: white });
  cy -= ROW_H;

  for (let i = 0; i < relevantItems.length; i++) {
    const item = relevantItems[i];
    const accs    = [item.accs1, item.accs2, item.accs3, item.accs4, item.accs5, item.accs6, item.accs7].filter(Boolean) as string[];
    const catatan = wa(isPinjam ? (item.catatan ?? '') : (item.catatan_pengembalian ?? ''));
    const extraLines = (accs.length > 0 ? 1 : 0) + (catatan ? 1 : 0);
    const rH = ROW_H + extraLines * 13;

    page.drawRectangle({
      x: CX, y: cy - rH, width: CW, height: rH,
      color: i % 2 === 0 ? white : rgb(0.96, 0.96, 0.98),
      borderColor: divider, borderWidth: 0.5,
    });

    const itemY = extraLines > 0 ? cy - 12 : cy - 17;
    page.drawText(`${i + 1}`,                          { x: L + 4,   y: itemY, size: 8.5, font: fontBold, color: black });
    page.drawText(wa(item.nama_barang).slice(0, 28),   { x: L + 22,  y: itemY, size: 8.5, font: fontBold, color: black });
    page.drawText(wa(item.nomor_seri).slice(0, 24),    { x: L + 215, y: itemY, size: 8.5, font: fontReg,  color: textDark });

    const statusTxt   = isPinjam ? 'Dipinjam' : 'Dikembalikan';
    const statusColor = isPinjam ? rgb(0.1, 0.4, 0.85) : rgb(0, 0.55, 0.27);
    page.drawText(statusTxt, { x: R - 55, y: itemY, size: 8, font: fontBold, color: statusColor });

    let extraY = cy - 28;
    if (accs.length > 0) {
      // Batasi total panjang teks agar tidak melewati kolom Status
      const accsLine = accs.join(', ');
      const maxAccsChars = 65;
      const accsDisplay = accsLine.length > maxAccsChars ? accsLine.slice(0, maxAccsChars) + '…' : accsLine;
      page.drawText(`Aksesori: ${accsDisplay}`, { x: L + 22, y: extraY, size: 7, font: fontReg, color: dim });
      extraY -= 13;
    }
    if (catatan) {
      const maxCatatanChars = 72;
      const catatanDisplay = catatan.length > maxCatatanChars ? catatan.slice(0, maxCatatanChars) + '…' : catatan;
      page.drawText(`Catatan: ${catatanDisplay}`, { x: L + 22, y: extraY, size: 7, font: fontReg, color: rgb(0.55, 0.35, 0) });
    }

    cy -= rH;
  }

  cy -= 28;

  // ── TANDA TANGAN ────────────────────────────────────
  if (cy > 140) {
    page.drawLine({ start: { x: L, y: cy }, end: { x: R, y: cy }, thickness: 0.5, color: divider });
    cy -= 22;
    const SIG_W = 140;
    page.drawText('Peminjam,',  { x: L,        y: cy, size: 9, font: fontReg, color: dim });
    page.drawText('Petugas,',   { x: R - SIG_W, y: cy, size: 9, font: fontReg, color: dim });
    cy -= 44;
    page.drawLine({ start: { x: L,        y: cy }, end: { x: L + SIG_W, y: cy }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    page.drawLine({ start: { x: R - SIG_W, y: cy }, end: { x: R,        y: cy }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    cy -= 12;
    page.drawText(wa(namaPeminjam), { x: L,        y: cy, size: 9, font: fontBold, color: black });
    page.drawText('Alta Nikindo',   { x: R - SIG_W, y: cy, size: 9, font: fontBold, color: black });
  }

  // ── FOOTER BAR ────────────────────────────────────
  const FTR_H = 34;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: FTR_H, color: yellow });
  const ftTxt = 'Dokumen ini diterbitkan secara digital oleh Alta Nikindo';
  const ftW = fontReg.widthOfTextAtSize(ftTxt, 9);
  page.drawText(ftTxt, { x: (PAGE_W - ftW) / 2, y: 12, size: 9, font: fontReg, color: black });

  const pdfBytes = await pdfDoc.save();
  const typeLabel  = isPinjam ? 'Peminjaman' : 'Pengembalian';
  const fileName   = `${typeLabel}_${sanitize(kodePeminjaman || 'doc')}_${sanitize(namaPeminjam)}.pdf`;

  const fileId = await uploadToGoogleDrive(
    new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }),
    fileName,
    { mimeType: 'application/pdf', folderName: 'Dokumen Peminjaman' },
  );

  // Gunakan proxy internal agar Meta (terutama iOS WhatsApp) mendapat URL
  // yang langsung mengembalikan byte PDF tanpa redirect.
  // Google Drive uc?export=download melakukan redirect 302 yang tidak selalu
  // diikuti oleh iOS WhatsApp saat mendownload document header template.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altanikindo.com';

  return {
    viewUrl:     `https://drive.google.com/file/d/${fileId}/view`,
    downloadUrl: `${baseUrl}/api/public/lending-doc?id=${fileId}`,
    fileName,
    fileId,
  };
}
