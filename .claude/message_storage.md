---
name: WhatsApp Message Storage System
description: All consumer and chatbot messages are saved to riwayat_pesan database
type: project
---

## Message Storage Implementation

**Status:** ✅ Complete - All messages now saved to database

## Architecture

### 1. Incoming Messages (Consumer → System)
- **Webhook Endpoint:** `/api/webhook/whatsapp`
- **Source:** Fonnte WhatsApp API webhook
- **Storage:** Automatically saved to `riwayat_pesan` table with `arah_pesan = 'IN'`
- **Fields:**
  - nomor_wa: Consumer phone number (normalized)
  - nama_profil_wa: Consumer profile name
  - arah_pesan: 'IN' (incoming)
  - isi_pesan: Message text
  - waktu_pesan: Message timestamp
  - bicara_dengan_cs: false
  - created_at: Server timestamp

### 2. Outgoing Messages (System → Consumer)
- **Saved in multiple places:**
  1. **CS Manual Replies** (`handleSendReply`): When staff manually reply to a message
  2. **New Chat Messages** (`handleSendNewChat`): When staff initiates new conversation
  3. **Status Updates** (`handleKirimStatusClaim`): When claim status is sent
  4. **Automated Messages**: Lending confirmations, event confirmations, password resets, etc.
  
- **Storage:** All saved with `arah_pesan = 'OUT'`

### 3. Helper Function
```typescript
const saveMessageToDatabase = async (
  nomor_wa: string,
  nama_profil_wa: string,
  arah_pesan: 'IN' | 'OUT',
  isi_pesan: string,
  bicara_dengan_cs: boolean = false
)
```

Available for use in any message-sending function for consistency.

## Setup Instructions

### Configure Fonnte Webhook
1. Go to Fonnte dashboard
2. Set webhook URL to: `https://yourdomain.com/api/webhook/whatsapp`
3. Events to subscribe: `incoming_message`
4. Webhook will automatically receive and save all incoming messages

### Supported Message Types
- Text messages from individuals ✅
- Group messages (ignored)
- Media messages (text content only for now)

## Data Flow

```
Consumer WA Message
    ↓
Fonnte Service
    ↓
/api/webhook/whatsapp (POST)
    ↓
Validate & Normalize
    ↓
Save to riwayat_pesan
    ↓
Dashboard displays in Messages tab
```

## Testing

To test the webhook:
```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "message_type": "incoming_message",
    "phone": "62812345678",
    "sender": "Test User",
    "message": "Test message",
    "timestamp": '$(date +%s)',
    "is_group": false
  }'
```

## Filtering

Messages can be filtered in the Messages tab:
- By phone number (search)
- By date range
- By read/unread status
- All message history is preserved
