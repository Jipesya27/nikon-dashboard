@AGENTS.md

# Nikon Dashboard — Project Memory

## Info Lingkungan
- **Windows path**: `C:\nikon-dashboard`
- **Domain production**: `https://altanikindo.com` (bukan lagi `nikonindonesia-altanikindo.vercel.app`)

## Budget Approval PDF (`app/dashboard/page.tsx`)
- Footer PDF: `https://altanikindo.com` (sudah diubah dari vercel.app)
- `renderItemsTable(label, rows, subtotalVal, isGrandTotal)` — saat `isGrandTotal=true`, kolom TOTAL menampilkan `grandTotal` (gabungan event+petty), bukan `subtotalVal`
- **Bug lama**: PETTY CASH dipanggil dengan `isGrandTotal=true` → tampil grandTotal (salah). Sudah diperbaiki ke `false` → tampil subtotalPettyCash (benar)
- EVENT COST: `isGrandTotal = pettyCashItems.length === 0` (benar — saat tidak ada petty cash, grandTotal = subtotalEventCost)

## Tech Stack & Deployment
- **Framework**: Next.js 16.2.6 App Router (Turbopack) · React 19 · Tailwind CSS v4 · TypeScript
- **Database**: Supabase (Postgres + Edge Functions)
- **WhatsApp**: WhatsApp Business API (Meta/Facebook Graph API)
- **File storage**: Google Drive via `/api/upload-google-drive`
- **Deploy frontend**: Vercel → branch **main** adalah production
- **Deploy edge functions**: GitHub Actions → `.github/workflows/deploy-supabase-functions.yml`
  - Butuh secrets: `SUPABASE_ACCESS_TOKEN` dan `SUPABASE_PROJECT_REF`
  - Bisa trigger manual dari GitHub Actions tab
  - Supabase CLI: `npx supabase functions deploy <nama> --project-ref <ref>`

## Warna Brand
- Nikon yellow: `#FFE500` (CSS var `--nikon-yellow`)

## Supabase Client Pattern
```ts
const supabase = createClient(
  typeof window !== 'undefined' ? (window.location.origin + '/api/admin/sb') : (process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
);
```
Admin pages proxy through `/api/admin/sb` — jangan hardcode URL Supabase langsung.

## File Penting
| File | Keterangan |
|---|---|
| `app/nikon/page.tsx` | Landing page publik + WebChatWidget (~line 834) |
| `app/dashboard/page.tsx` | Dashboard admin utama, sangat besar |
| `app/chatbot/page.tsx` | Halaman manajemen template chatbot |
| `app/admin/events/page.tsx` | Validasi pembayaran + daftar registrasi |
| `app/admin/events/attendance/page.tsx` | Absensi via QR code |
| `app/admin/events/deposit/page.tsx` | Kelola refund deposit |
| `supabase/functions/meta-bot/index.ts` | Logika bot WhatsApp (menu, CS, garansi, dll) |
| `supabase/functions/send-wa/index.ts` | Kirim pesan/media ke WhatsApp via Meta API |
| `app/components/ExpenseClaimTab.tsx` | Tab Klaim Biaya — form, modal upload bukti, export PDF |
| `app/components/ResiTab.tsx` | Tab Resi Pengiriman — import PDF JNE, list resi |
| `app/api/resi/parse-jne/route.ts` | Parser PDF "Laporan Penjualan Agen" JNE |
| `app/api/expense-claim/route.ts` | CRUD klaim biaya |
| `app/api/expense-claim/[id]/route.ts` | Update status / delete klaim |
| `app/api/auth/mobile-login/route.ts` | Login endpoint untuk Android app — return token di JSON body (bukan Set-Cookie) |

## Tabel Database Utama

### `events`
`id`, `event_title`, `event_date`, `event_time`, `event_price`, `event_image` (nullable), `event_partisipant_stock`, `event_description`, `event_payment_tipe`, `event_speaker`, `event_speaker_genre`, `bank_info`, `deposit_amount`, `proposal_event_id`, `event_location`, `wa_group_link`, `display_start_date` (DATE), `registration_open_date` (DATE), `registration_close_date` (DATE)

**CHECK constraints:**
- `event_payment_tipe`: `NULL | 'regular' | 'deposit' | 'gratis'`
- `event_status`: `NULL | 'In stock' | 'Out of stock' | 'close'`
- `event_image` sudah di-DROP NOT NULL — boleh NULL

**Jadwal tampil & pendaftaran (3 kolom terpisah):**
- `display_start_date`: kartu event mulai tampil di halaman publik (sebelum ini → event tersembunyi sama sekali)
- `registration_open_date`: form pendaftaran aktif; kartu tetap tampil tapi tombol Daftar diganti "Segera Hadir" + tanggal buka
- `registration_close_date`: pendaftaran ditutup (event masuk pastEvents)
- API `GET /api/events/register` mengembalikan flag `banner_hidden` dan `registration_not_open`
- Frontend (`app/nikon/page.tsx`, `app/events/register/page.tsx`) handle state "Segera" saat `registration_not_open=true`

### `event_registrations`
`id`, `created_at`, `nama_lengkap`, `nomor_wa`, `email`, `kabupaten_kotamadya`, `tipe_kamera`, `event_name`, `event_id`, `bukti_transfer_url`, `status_pendaftaran` (`menunggu_validasi`|`terdaftar`|`ditolak`), `payment_type` (`regular`|`deposit`), `ticket_url`, `rejection_reason`, `is_attended`, `attended_at`, `attended_by`, `nama_bank`, `no_rekening`, `nama_pemilik_rekening`, `status_pengembalian_deposit` (`requested`|`Processed`), `bukti_pengembalian_deposit`, `refund_requested_at`

### `riwayat_pesan`
Log semua pesan WhatsApp (IN/OUT): `nomor_wa`, `isi_pesan`, `arah_pesan`, `url_media`, `bicara_dengan_cs`, `jenis_pesan`

### `chatbot_responses`
Pesan bot yang bisa dikustomisasi via dashboard (key/message). `getMsg(key, fallback)` baca DB dulu; **fallback hanya aktif jika key belum ada di DB**. Perubahan teks bot di kode tidak otomatis override DB.

### `konsumen`
Data & status langkah konsumen (`status_langkah`)

### `pengaturan_bot`
Pengaturan bot lain (URL file promo, dealer, dll)

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

## Notifikasi Reset Password Karyawan
- **TIDAK menggunakan Meta WA template** — Meta konsisten menolak template UTILITY yang mengandung pola username+password dengan alasan INCORRECT_CATEGORY (diarahkan ke AUTHENTICATION)
- Alur saat ini: setelah admin reset password (via modal atau quick-reset di list), muncul **modal copy-paste** di frontend
- Modal menampilkan pesan WA terformat dalam textarea + tombol "Salin Pesan" (berubah hijau "Tersalin!" 3 detik setelah diklik)
- Admin salin pesan lalu kirim ke karyawan via WA pribadi
- State di `dashboard/page.tsx`: `waPasswordMsg: {nama, username, password} | null`, `waPasswordMsgCopied: boolean`
- Handler: `handleResetPwAdmin` (modal form) dan `handleQuickResetPassword` (tombol cepat di list) — keduanya set `waPasswordMsg` setelah berhasil
- `handleQuickResetPassword` tidak lagi mewajibkan karyawan punya `nomor_wa`
- API route `app/api/admin/karyawan/password/route.ts` hanya hash & simpan password — tidak ada WA send

## Access Control
`RoleGate` di `app/components/RoleGate.tsx` — roles yang dibutuhkan untuk admin events: `['admin_events', 'admin_deposit', 'admin_attendance', 'events', 'eventregistrations']`

## Bot WhatsApp (meta-bot)
- Menu utama: 1–10, diakses dengan ketik angka
- Opsi 9 = Hubungi CS: cek `isOperatingHours()`, set `bicara_dengan_cs=true` jika aktif
- Jam operasional CS: **Senin–Jumat 10.00–16.00 WIB, Sabtu 10.00–12.00 WIB**
- Pesan CS_OFFLINE & CS_WAITING keduanya selalu append "Hari libur nasional dan tanggal merah LIBUR" secara paksa di kode (karena DB bisa stale)

## Tab Pesan Dashboard
- State utama: `selectedWa` (null = tampil daftar kontak, string = buka thread)
- Layout mobile: sidebar hidden saat `selectedWa` set; tombol back floating `fixed top-20 left-3 z-[200] md:hidden`
- Tema chat: background `#ffffff`, bubble OUT `#dcf8c6` (WA green), bubble IN `white + border`
- Kirim file: upload ke Google Drive → simpan `url_media` di DB → kirim via `send-wa` dengan `{ mediaUrl, mediaType }`
- `send-wa` edge function support: `text`, `template`, `image`, `video`, `document`

## Catatan Deploy Edge Functions
- Perubahan kode edge function **harus di-deploy** agar aktif di production
- Tanpa deploy, perubahan fallback di `getMsg()` tidak efek karena DB menyimpan nilai lama

## Auth
- `verifyAdminSession(cookieStore)` — terima objek cookie getter `{ get: (name) => {value} | undefined }`, bukan string session mentah. Kembalikan `boolean`.
- Contoh benar: `const cookieStore = await cookies(); return verifyAdminSession(cookieStore);`
- `RoleGate` di `app/components/RoleGate.tsx` — roles admin events: `['admin_events', 'admin_deposit', 'admin_attendance', 'events', 'eventregistrations']`
- Rate limiting login: tabel `login_attempts` di DB. Fail-safe — jika tabel belum ada, login tetap jalan (try-catch di route)
- **Mobile login** (`/api/auth/mobile-login`): token dikembalikan di JSON body (`tokens.adminSession`, `tokens.karyawanIdentity`, `tokens.maxAge`) bukan Set-Cookie, agar bisa disimpan di Android SharedPreferences

## Android App (`android-app/`)
- Direktori Expo/React Native untuk aplikasi Android
- **Dikecualikan dari kompilasi Next.js** — sudah masuk `"exclude"` di `tsconfig.json` dan `android-app/node_modules` di `.gitignore`
- Build via EAS (Expo Application Services): GitHub Actions `.github/workflows/build-android.yml` di branch `android-app` atau feature branch
- Workflow trigger: push ke branch yang mengandung perubahan di `android-app/**`
- **Jangan tambahkan** `android-app/` ke `tsconfig.json` include — akan menyebabkan error `expo-router` tidak ditemukan saat Next.js build

## Image Proxy (Google Drive)
- URL Google Drive tidak bisa langsung di-render browser (CORS)
- Proxy via `/api/events/image?id=<drive-file-id>` atau `/api/drive-file?id=<id>`
- Helper `driveImgSrc(url)` di `app/nikon/page.tsx` mengekstrak ID dan mengubah ke proxy URL

## Timezone
- Semua format tanggal/waktu wajib `timeZone: 'Asia/Jakarta'` di opsi Intl
- **Hanya berlaku untuk Date** — `toLocaleDateString`, `toLocaleString`, `toLocaleTimeString` pada `new Date(...)`
- **JANGAN tambahkan** `timeZone` ke `.toLocaleString('id-ID')` pada **angka/number** — `NumberFormatOptions` tidak mengenal `timeZone` dan menyebabkan TypeScript build error di Vercel

## Tab Klaim Biaya (`app/components/ExpenseClaimTab.tsx`)
- Modal "Buat Klaim Baru": From/To/Tanggal + tabel baris pengeluaran + catatan
- Field tanggal: `DatePickerInput` wrapper — tampilan DD MMM YYYY (en-GB), klik memanggil `showPicker()` via ref
- Kolom **Bukti** di tiap baris → klik 📎 membuka **sub-modal upload** (z-60, di atas modal utama)
- Sub-modal: frame gambar besar (aspect 4:3) + field Tanggal/Keterangan/Nominal + tombol Simpan
  - Zoom: scroll/wheel (1×–5×), pinch mobile, drag saat zoom>1, double-click reset
  - Klik frame saat zoom=1 → ganti foto; badge `120% ✕` muncul saat zoomed → klik reset
  - Upload ke Google Drive via `/api/upload-google-drive`; blob URL di-revoke saat modal tutup
- Export PDF — modal tab "📐 Layout A4":
  - `ImgLayout` type: `{ x, y, w, h, page, rotation }` (posisi dalam PDF points, rotation: 0|90|180|270)
  - `autoLayout()`: auto-susun gambar dalam grid flow per halaman
  - Canvas **flat multi-page**: semua halaman A4 di-stack vertikal dalam satu div, gambar bisa di-drag melewati batas halaman (multi-monitor style)
  - Drag gambar: pointer capture on element; `onLayoutPointerMove` hitung `totalTop` dari semua halaman → derive `page` + `y` otomatis
  - Rotate button **↻** (top-right): putar 90° CW, swap w/h saat melintasi 0↔90 atau 180↔270
  - Page nav **◄ Hal.N ►** (bottom bar): pindah halaman via tombol
  - Resize handle: pojok kanan bawah (biru), drag = resize proporsional
  - Constants: `PDF_W=595.28`, `PDF_H=841.89`, `CANVAS_W=420`, `CANVAS_SC=420/595.28`, `CANVAS_H≈594`, `PAGE_GAP_PX=24`
  - PDF generation: `degrees()` dari pdf-lib, anchor-point dihitung per-rotasi agar gambar berputar di tengah bounding box
- Status klaim: `draft → submitted → approved/rejected`
- `driveProxyUrl(url)` helper: ekstrak Drive ID → `/api/drive-file?id=<id>`

## Tab Resi / Parser JNE (`app/api/resi/parse-jne/route.ts`)
Parser PDF "Laporan Penjualan Agen" JNE menggunakan `pdf-parse`.

### Struktur block tiap baris di pdf-parse output
```
bl[0]  no+cnote menyatu         "1016060014634426"
bl[1]  tanggal part 1           "09-06-"   (ends with '-')
bl[2]  tanggal part 2           "26"  ATAU  "26 19:43"  (tahun+jam menyatu!)
bl[3]  waktu (jika bl[2]="26")  "19:43"
bl[N]  service+weight+qty+dest  "REG2311SUKAWATI,GIANYAR+628111877781"  (with phone)
                                 "REG2311JAMBANGAN,SURABAYA"             (no phone, dest menyatu)
bl[+]  shipper: "11 PT ALTA" lalu "NIKINDO"  ATAU  "11 PT ALTANIKINDO" (1 kata)
bl[+]  receiver name
bl[+]  goods
bl[+]  "0.00"  (asuransi — HARUS difilter dari middleLines)
bl[+]  "Cash10,000.000.00SYAEDIN"  (payment+amount+evoucher+userid menyatu)
```

### Aturan parsing kritis
- **Tanggal**: `bl[2]` bisa `"YY HH:MM"` → extract tahun & jam via regex, jangan asumsi `timeIdx=3`
- **Service+Dest**: regex full `/^(.+?)(\d)(\d)([A-Z].+)\+\d+$/` (with phone) **atau** noPhone `/^(.+?)(\d)(\d)([A-Z].+)$/`
- **Shipper skip**: `bl[i].includes('NIKINDO')` — handle `"NIKINDO"`, `"ALTANIKINDO"`, `"NIKINDO (NIKON)"`
- **Non-NIKINDO shipper**: fallback skip baris yang diawali `^11\b` (kode agen)
- **middleLines**: filter `"0.00"` (asuransi) sebelum parsing receiver/barang
- **cashPrefix**: jika `=== 'Cash'` → anggap kosong (label metode bayar, bukan barang)
- **Case A** (cashPrefix kosong): item terakhir middleLines = barang, sisanya = penerima
- **Case B** (middleLines kosong): cashPrefix dipisah keyword barang di akhir string
- **Case C** (cashPrefix ada, middleLines ada): cashPrefix = barang, middleLines = penerima

### Tabel `resi_pengiriman`
Kolom: `id`, `created_at`, `created_by`, `nama_pembuat`, `tanggal_kirim`, `nama_expedisi`, `file_url`, `file_name`, `catatan`, `cnote_no`, `service`, `tujuan`, `penerima`, `barang`, `ongkir`, `jam_kirim`

## Tabel `expense_claim`
`id`, `created_at`, `created_by`, `nama_pembuat`, `from_person`, `to_person`, `claim_date`, `status` (`draft|submitted|approved|rejected`), `catatan`, `items` (JSONB array: `{tanggal, description, nominal, receipt_url?}`), `receipt_urls` (TEXT[]), `total_nominal`

## Icon SVG di Dashboard
- **Jangan pakai emoji sebagai ikon visual** di area konten utama — gunakan inline SVG
- Sidebar navbar boleh pakai emoji (sudah konsisten, jangan diubah)
- Pola icon box: `<div className="w-9 h-9 rounded-lg bg-{color}-100 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-{color}-600" ...></div>`
- Contoh warna per konteks: indigo=upload, slate=infrastruktur, yellow=password/key, green=WhatsApp, abu=empty state
- WaTemplatesTab header: WhatsApp SVG hijau `#25D366` dalam box `w-10 h-10 rounded-xl`
- File yang sudah pakai SVG: `app/components/WaTemplatesTab.tsx`, `app/dashboard/page.tsx`

## Animasi (`app/globals.css`)
Utility classes tersedia tanpa npm tambahan:
- `.n-float` · `.n-glow` · `.n-bounce-arrow` · `.n-shimmer-btn` (dengan `::after` shimmer) · `.n-dot-bg` · `.n-gradient-bg` · `.n-text-gradient`
- Keyframes: `bounce-in`, `spin-in`, `float-y`, `shimmer`, `glow-pulse`, `dot-drift`, `gradient-x`, `slide-left`, `slide-right`, `sticker-pop`, `bounce-down`, `badge-ping`, `word-pop`
