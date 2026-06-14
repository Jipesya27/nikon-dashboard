import { NextRequest, NextResponse } from 'next/server';

type VercelWebhookPayload = {
  type: 'deployment' | string;
  id: string;
  createdAt: number;
  url?: string;
  projectId: string;
  projectName: string;
  deploymentId: string;
  name: string;
  environment: 'production' | 'preview' | 'development';
  regions?: string[];
  eventSentAt?: number;
  state?: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
};

async function sendTelegramMessage(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

function formatDeploymentMessage(payload: VercelWebhookPayload): string {
  const projectName = payload.projectName || payload.name || 'Unknown Project';
  const environment = payload.environment || 'unknown';
  const state = payload.state || 'UNKNOWN';
  const url = payload.url || 'N/A';

  // Status emoji & color
  let statusEmoji = '⏳';
  let statusText = 'BUILDING';
  let statusColor = 'warning';

  if (state === 'READY') {
    statusEmoji = '✅';
    statusText = 'BERHASIL';
    statusColor = 'success';
  } else if (state === 'ERROR') {
    statusEmoji = '❌';
    statusText = 'GAGAL';
    statusColor = 'error';
  } else if (state === 'CANCELED') {
    statusEmoji = '⏹️';
    statusText = 'DIBATALKAN';
    statusColor = 'info';
  }

  const timestamp = new Date(payload.createdAt).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  let message = `${statusEmoji} <b>Deployment ${statusText}</b>\n\n`;
  message += `<b>Project:</b> ${projectName}\n`;
  message += `<b>Environment:</b> ${environment}\n`;
  message += `<b>Status:</b> ${statusText}\n`;
  message += `<b>Waktu:</b> ${timestamp} (WIB)\n`;

  if (url && url !== 'N/A') {
    message += `<b>URL:</b> <a href="${url}">${url}</a>\n`;
  }

  if (payload.deploymentId) {
    message += `<b>Deployment ID:</b> <code>${payload.deploymentId}</code>\n`;
  }

  return message;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as VercelWebhookPayload;

    // Validasi webhook dari Vercel
    if (payload.type !== 'deployment') {
      return NextResponse.json({ error: 'Invalid webhook type' }, { status: 400 });
    }

    // Format dan kirim message ke Telegram
    const message = formatDeploymentMessage(payload);
    const sent = await sendTelegramMessage(message);

    if (!sent) {
      console.warn('⚠️ Failed to send Telegram notification for deployment:', payload.deploymentId);
    }

    return NextResponse.json(
      { success: true, message: 'Webhook processed', telegramSent: sent },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'Vercel webhook endpoint is ready' }, { status: 200 });
}
