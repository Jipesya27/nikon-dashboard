@AGENTS.md

# Nikon Dashboard — Project Memory

## Tech Stack
- **Framework**: Next.js App Router (`/app` directory)
- **Database**: Supabase (Postgres)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Supabase Client Pattern
```ts
const supabase = createClient(
  typeof window !== 'undefined' ? (window.location.origin + '/api/admin/sb') : (process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
);
```
Admin pages proxy through `/api/admin/sb` — jangan hardcode URL Supabase langsung.

## Warna Brand
- Nikon yellow: `#FFE800`

## Tabel Database Utama

### `events`
`id`, `event_title`, `event_date`, `event_price`, `event_image`, `event_partisipant_stock`, `event_status` (`available`|`sold_out`), `event_description`, `event_payment_tipe` (`regular`|`deposit`|`gratis`), `event_speaker`, `event_speaker_genre`, `bank_info`, `deposit_amount`, `proposal_event_id`

### `event_registrations`
`id`, `created_at`, `nama_lengkap`, `nomor_wa`, `email`, `kabupaten_kotamadya`, `tipe_kamera`, `event_name`, `event_id`, `bukti_transfer_url`, `status_pendaftaran` (`menunggu_validasi`|`terdaftar`|`ditolak`), `payment_type` (`regular`|`deposit`), `ticket_url`, `rejection_reason`, `is_attended`, `attended_at`, `attended_by`, `nama_bank`, `no_rekening`, `nama_pemilik_rekening`, `status_pengembalian_deposit` (`requested`|`Processed`), `bukti_pengembalian_deposit`, `refund_requested_at`

## Halaman Admin Events
| Path | Fungsi |
|------|--------|
| `app/admin/events/page.tsx` | Validasi pembayaran + daftar registrasi |
| `app/admin/events/attendance/page.tsx` | Absensi via QR code |
| `app/admin/events/deposit/page.tsx` | Kelola refund deposit |
| `app/admin/events/layout.tsx` | Layout + `RoleGate` access control |

## API Routes Events
- `POST /api/events/validate-payment` — approve/reject registrasi, kirim tiket
- `GET|POST|DELETE /api/events/attendance` — lookup & tandai hadir
- `POST /api/events/deposit-refund` — proses refund deposit
- `GET /api/events/register` — daftar event untuk publik

## Notifikasi & Utilitas
- WhatsApp: `sendWATemplate`, `sendNotif` dari `app/lib/notify.ts`
- Tiket PDF: `generateTicket` dari `app/lib/generate-ticket.ts`
- Google Drive proxy: `/api/drive-file?id=<id>` dan `/api/events/image`

## Access Control
`RoleGate` di `app/components/RoleGate.tsx` — roles yang dibutuhkan untuk admin events: `['admin_events', 'admin_deposit', 'admin_attendance', 'events', 'eventregistrations']`
