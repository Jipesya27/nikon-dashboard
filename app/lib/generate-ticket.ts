import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { uploadToGoogleDrive } from '@/app/lib/google-drive';

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function sanitize(s: string): string {
  return (s || '').replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().substring(0, 80);
}

export interface GenerateTicketInput {
  registrationId: string;
  fullName: string;
  nomorWa?: string;
  eventTitle: string;
  eventDate?: string;
  eventDetail?: string;
  cameraModel?: string;
  paymentType?: string;
}

export interface GenerateTicketResult {
  ticketUrl: string;
  fileName: string;
  fileId: string;
}

export async function generateTicket(input: GenerateTicketInput): Promise<GenerateTicketResult> {
  const { registrationId, fullName, nomorWa, eventTitle, eventDate, eventDetail, cameraModel, paymentType } = input;

  // QR
  const qrData = `NIKON-EVT|${registrationId}|${eventTitle}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
  const qrBytes = Buffer.from(qrDataUrl.replace('data:image/png;base64,', ''), 'base64');

  // Layout: A4 (595 x 842), tapi pakai landscape ticket-style layout
  const pdfDoc = await PDFDocument.create();
  const PAGE_W = 595;
  const PAGE_H = 842;
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Colors
  const yellow = rgb(1, 0.91, 0);
  const black = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);
  const dimText = rgb(0.6, 0.6, 0.6);
  const lightText = rgb(0.85, 0.85, 0.85);
  const cardBg = rgb(0.07, 0.07, 0.07);
  const dividerColor = rgb(0.18, 0.18, 0.18);
  const orange = rgb(0.9, 0.5, 0);

  // Background
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cardBg });

  // ====== HEADER (yellow band) ======
  const HEADER_H = 90;
  const HEADER_Y = PAGE_H - HEADER_H;
  page.drawRectangle({ x: 0, y: HEADER_Y, width: PAGE_W, height: HEADER_H, color: yellow });

  // NIKON logo text
  page.drawText('NIKON', { x: 40, y: HEADER_Y + 32, size: 38, font: fontBold, color: black });

  // Event Ticket subtitle (di bawah NIKON)
  page.drawText('EVENT TICKET', { x: 41, y: HEADER_Y + 14, size: 11, font: fontBold, color: rgb(0.25, 0.25, 0.25) });

  // ID di kanan
  const idText = `ID: ${registrationId.slice(0, 8).toUpperCase()}`;
  const idTextWidth = fontBold.widthOfTextAtSize(idText, 11);
  page.drawText('TICKET ID', { x: PAGE_W - 40 - 80, y: HEADER_Y + 50, size: 8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(idText, { x: PAGE_W - 40 - idTextWidth, y: HEADER_Y + 30, size: 11, font: fontBold, color: black });

  // ====== KONTEN ======
  const CONTENT_LEFT = 40;
  const CONTENT_RIGHT = PAGE_W - 40;
  const CONTENT_W = CONTENT_RIGHT - CONTENT_LEFT;
  let cursorY = HEADER_Y - 50;

  // Event title
  const titleLines = wrapText(eventTitle, 38);
  for (const line of titleLines) {
    page.drawText(line, { x: CONTENT_LEFT, y: cursorY, size: 24, font: fontBold, color: yellow });
    cursorY -= 32;
  }

  cursorY -= 8;

  // Date badge
  if (eventDate) {
    const dateText = `Tanggal: ${eventDate}`;
    const dateTextWidth = fontBold.widthOfTextAtSize(dateText, 12);
    const badgeW = dateTextWidth + 24;
    page.drawRectangle({ x: CONTENT_LEFT, y: cursorY - 8, width: badgeW, height: 26, color: yellow });
    page.drawText(dateText, { x: CONTENT_LEFT + 12, y: cursorY - 1, size: 12, font: fontBold, color: black });
    cursorY -= 38;
  } else {
    cursorY -= 16;
  }

  // Divider 1
  page.drawLine({ start: { x: CONTENT_LEFT, y: cursorY }, end: { x: CONTENT_RIGHT, y: cursorY }, thickness: 1, color: dividerColor });
  cursorY -= 24;

  // Peserta section
  page.drawText('PESERTA', { x: CONTENT_LEFT, y: cursorY, size: 9, font: fontBold, color: dimText });
  cursorY -= 20;
  page.drawText(fullName, { x: CONTENT_LEFT, y: cursorY, size: 20, font: fontBold, color: white });
  cursorY -= 24;

  if (cameraModel) {
    page.drawText(`Kamera: ${cameraModel}`, { x: CONTENT_LEFT, y: cursorY, size: 11, font: fontRegular, color: lightText });
    cursorY -= 20;
  }
  if (nomorWa) {
    page.drawText(`WA: ${nomorWa}`, { x: CONTENT_LEFT, y: cursorY, size: 11, font: fontRegular, color: lightText });
    cursorY -= 20;
  }

  // Deposit badge
  if (paymentType === 'deposit') {
    const depTxt = 'TIPE: DEPOSIT';
    const depW = fontBold.widthOfTextAtSize(depTxt, 9) + 16;
    page.drawRectangle({ x: CONTENT_LEFT, y: cursorY - 4, width: depW, height: 20, color: orange });
    page.drawText(depTxt, { x: CONTENT_LEFT + 8, y: cursorY + 1, size: 9, font: fontBold, color: white });
    cursorY -= 28;
  }

  cursorY -= 6;

  // Divider 2
  page.drawLine({ start: { x: CONTENT_LEFT, y: cursorY }, end: { x: CONTENT_RIGHT, y: cursorY }, thickness: 1, color: dividerColor });
  cursorY -= 24;

  // Detail acara
  if (eventDetail) {
    page.drawText('DETAIL ACARA', { x: CONTENT_LEFT, y: cursorY, size: 9, font: fontBold, color: dimText });
    cursorY -= 18;
    const detailLines = wrapText(eventDetail, 70);
    for (const line of detailLines) {
      if (cursorY < 290) break; // jangan masuk area QR
      page.drawText(line, { x: CONTENT_LEFT, y: cursorY, size: 10, font: fontRegular, color: lightText });
      cursorY -= 15;
    }
  }

  // ====== QR CODE BLOCK (centered) ======
  const QR_SIZE = 150;
  const QR_X = (PAGE_W - QR_SIZE) / 2;
  const QR_Y = 130;

  // White background untuk QR
  const qrPad = 12;
  page.drawRectangle({
    x: QR_X - qrPad,
    y: QR_Y - qrPad,
    width: QR_SIZE + qrPad * 2,
    height: QR_SIZE + qrPad * 2,
    color: white,
  });

  const qrImage = await pdfDoc.embedPng(qrBytes);
  page.drawImage(qrImage, { x: QR_X, y: QR_Y, width: QR_SIZE, height: QR_SIZE });

  // Label di bawah QR
  const labelTop = 'Scan QR Code untuk';
  const labelBot = 'Registrasi Ulang';
  const lbl1W = fontRegular.widthOfTextAtSize(labelTop, 10);
  const lbl2W = fontBold.widthOfTextAtSize(labelBot, 11);
  page.drawText(labelTop, { x: (PAGE_W - lbl1W) / 2, y: QR_Y - qrPad - 18, size: 10, font: fontRegular, color: dimText });
  page.drawText(labelBot, { x: (PAGE_W - lbl2W) / 2, y: QR_Y - qrPad - 32, size: 11, font: fontBold, color: white });

  // ====== FOOTER (yellow band) ======
  const FOOTER_H = 50;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: FOOTER_H, color: yellow });
  const footerText = 'Tunjukkan tiket ini saat registrasi ulang di lokasi acara';
  const footerW = fontBold.widthOfTextAtSize(footerText, 11);
  page.drawText(footerText, { x: (PAGE_W - footerW) / 2, y: 20, size: 11, font: fontBold, color: black });

  const pdfBytes = await pdfDoc.save();
  const fileName = [
    sanitize(eventDate || 'tgl'),
    sanitize(eventTitle || 'event'),
    sanitize(nomorWa || 'wa'),
    sanitize(fullName || 'nama'),
  ].join('_') + '.pdf';

  const fileId = await uploadToGoogleDrive(
    new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }),
    fileName,
    { mimeType: 'application/pdf', folderName: 'Tiket Event' }
  );
  const ticketUrl = `https://drive.google.com/file/d/${fileId}/view`;

  return { ticketUrl, fileName, fileId };
}
