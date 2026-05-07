import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const { registrationId, fullName, eventTitle, eventDate, eventDetail, cameraModel, paymentType } = await req.json();

    if (!registrationId || !fullName || !eventTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const qrData = `NIKON-EVT|${registrationId}|${eventTitle}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
    const qrBytes = Buffer.from(qrDataUrl.replace('data:image/png;base64,', ''), 'base64');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const yellow = rgb(1, 0.91, 0);
    const black = rgb(0, 0, 0);
    const darkGray = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.9, 0.9, 0.9);
    const midGray = rgb(0.5, 0.5, 0.5);

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.04, 0.04, 0.04) });
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: yellow });

    page.drawText('NIKON', { x: 40, y: height - 55, size: 36, font: fontBold, color: black });
    page.drawText('EVENT TICKET', { x: 140, y: height - 48, size: 13, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(`ID: ${registrationId.slice(0, 8).toUpperCase()}`, { x: width - 160, y: height - 48, size: 10, font: fontRegular, color: darkGray });

    const titleLines = wrapText(eventTitle, 42);
    let titleY = height - 120;
    for (const line of titleLines) {
      page.drawText(line, { x: 40, y: titleY, size: 22, font: fontBold, color: yellow });
      titleY -= 30;
    }

    if (eventDate) {
      page.drawRectangle({ x: 40, y: titleY - 10, width: 200, height: 28, color: yellow });
      page.drawText(`📅  ${eventDate}`, { x: 50, y: titleY - 2, size: 12, font: fontBold, color: black });
      titleY -= 50;
    } else {
      titleY -= 20;
    }

    page.drawLine({ start: { x: 40, y: titleY }, end: { x: width - 40, y: titleY }, thickness: 1, color: rgb(0.25, 0.25, 0.25) });
    titleY -= 20;

    page.drawText('PESERTA', { x: 40, y: titleY, size: 9, font: fontBold, color: midGray });
    titleY -= 16;
    page.drawText(fullName, { x: 40, y: titleY, size: 18, font: fontBold, color: rgb(1, 1, 1) });
    titleY -= 20;
    if (cameraModel) {
      page.drawText(`Kamera: ${cameraModel}`, { x: 40, y: titleY, size: 11, font: fontRegular, color: midGray });
      titleY -= 14;
    }
    if (paymentType === 'deposit') {
      page.drawRectangle({ x: 40, y: titleY - 4, width: 100, height: 18, color: rgb(0.9, 0.5, 0) });
      page.drawText('TIPE: DEPOSIT', { x: 45, y: titleY - 1, size: 8, font: fontBold, color: rgb(1, 1, 1) });
      titleY -= 26;
    }

    titleY -= 10;
    page.drawLine({ start: { x: 40, y: titleY }, end: { x: width - 40, y: titleY }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    titleY -= 20;

    if (eventDetail) {
      page.drawText('DETAIL ACARA', { x: 40, y: titleY, size: 9, font: fontBold, color: midGray });
      titleY -= 16;
      const detailLines = wrapText(eventDetail, 60).slice(0, 8);
      for (const line of detailLines) {
        if (titleY < 200) break;
        page.drawText(line, { x: 40, y: titleY, size: 10, font: fontRegular, color: lightGray });
        titleY -= 14;
      }
      titleY -= 10;
    }

    const qrImage = await pdfDoc.embedPng(qrBytes);
    const qrSize = 130;
    const qrX = width - qrSize - 40;
    const qrY = 80;

    page.drawRectangle({ x: qrX - 8, y: qrY - 8, width: qrSize + 16, height: qrSize + 16, color: rgb(1, 1, 1) });
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    page.drawText('Scan untuk', { x: qrX + 18, y: qrY - 18, size: 9, font: fontRegular, color: midGray });
    page.drawText('Registrasi Ulang', { x: qrX + 10, y: qrY - 30, size: 9, font: fontBold, color: midGray });

    page.drawRectangle({ x: 0, y: 0, width, height: 50, color: yellow });
    page.drawText('Tunjukkan tiket ini saat registrasi ulang di lokasi acara', { x: 40, y: 18, size: 10, font: fontRegular, color: black });

    const dashY = height - 80;
    for (let dy = 60; dy < dashY; dy += 14) {
      page.drawLine({ start: { x: width - 210, y: dy }, end: { x: width - 210, y: dy + 8 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    }

    const pdfBytes = await pdfDoc.save();
    const fileName = `Tiket_${fullName.replace(/\s+/g, '_')}_${registrationId.slice(0, 8)}.pdf`;
    const fileId = await uploadToGoogleDrive(new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' }), fileName, 'application/pdf');
    const ticketUrl = `https://drive.google.com/file/d/${fileId}/view`;

    return NextResponse.json({ success: true, ticketUrl, fileName });
  } catch (err: any) {
    console.error('generate-ticket error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate ticket' }, { status: 500 });
  }
}
