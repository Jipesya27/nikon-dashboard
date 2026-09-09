# Security Audit — Nikon Dashboard (altanikindo.com)

**Tanggal:** 2026-09-09
**Scope:** 13 area yang diminta — akses user, rate limiting, hashing password, kunci API,
autentikasi, sanitasi form, XSS, env vars, file ter-ekspos, proteksi rute admin, keamanan
API, security headers, akses DB.

Semua temuan CRITICAL/HIGH sudah **diperbaiki & di-deploy** dalam sesi ini (kecuali yang
ditandai "PERLU AKSI ADMIN" — butuh env var baru).

---

## Ringkasan

| # | Area | Status sebelum | Aksi |
|---|------|----------------|------|
| 13 | **Akses DB (RLS)** | 🔴 `data_log` bisa **dibaca/ditulis/dihapus** siapa saja pakai anon key; `system_error_log`, `chat_read_status`, `resi_pengiriman`, `promo_datacolor_orders`, `altasolution_*` bisa dibaca publik | ✅ RLS di-ENABLE di **semua** tabel; policy `USING(true)` yang bocor di-drop; hanya `events` + `promosi` yang tetap read-publik (disengaja) |
| 10/11 | **Rute admin / API** | 🔴 `/api/admin/claims`, `/api/admin/garansi` (+ `[id]`) tidak verifikasi sesi — cukup punya cookie asal 20+ char; `/api/events/validate-payment`, `/deposit-refund`, `/attendance`, `/generate-ticket`, `/event-reports`, `/nikon-config` (POST), `/autocomplete` (tulis), `/transaksi-dealer`, `/infrastruktur/stb`, `/bot-health` **tanpa auth sama sekali** | ✅ `verifyAdminSession` / `requireAdmin()` ditambahkan ke semua |
| 5 | **Autentikasi** | 🟠 `sessionKey()` fallback ke string konstan publik kalau env kosong; identity cookie audit tidak diverifikasi (nama pelaku bisa dipalsukan) | ✅ fallback → throw di production; `getAuditUserVerified()` verifikasi HMAC identity token untuk semua tulisan ke `data_log` |
| 11 | **Proxy Supabase** | 🟠 `/api/admin/sb/[...path]` tidak batasi path → admin bisa panggil `/auth/v1/admin/*` (kelola user auth) via service_role | ✅ dibatasi ke `rest/v1/` + `storage/v1/` saja |
| 2 | **Rate limiting** | 🟠 hanya di rute login | ✅ ditambah ke `/api/claim`, `/garansi`, `/events/register`, `/promo/order`, `/upload-lomba`, `/chat-web`, `/ocr-nota`, `/penerima/submit`, `/penerima/verify` (per-IP, 15 menit) |
| 7 | **XSS** | 🟠 `/promo` render `deskripsi` promo via `dangerouslySetInnerHTML` tanpa sanitasi; email approval/reject event meng-inject nama/alasan mentah ke HTML | ✅ `DOMPurify.sanitize()` di `/promo`; `esc()` HTML-escape di builder email |
| 12 | **Security headers** | 🟢 CSP/HSTS/XFO/nosniff sudah ada (HSTS dari Vercel) | ✅ tambah HSTS eksplisit `includeSubDomains`, `Cross-Origin-Opener-Policy`, `X-Permitted-Cross-Domain-Policies` |
| — | **Webhook** | 🟠 `/api/webhook/whatsapp` & `/api/webhooks/vercel` tidak verifikasi signature → bisa di-spoof | ⚠️ verifikasi ditambahkan, **aktif hanya kalau env secret di-set** (lihat "Perlu Aksi Admin") |
| 3 | **Hash password** | 🟢 bcrypt cost 12, auto-migrasi plaintext lama saat login | tidak ada perubahan diperlukan |
| 4/8 | **Kunci API / env** | 🟢 hanya 3 var `NEXT_PUBLIC_` (URL + anon key Supabase + site URL — semua memang publik); semua secret server-only; `.env*` gitignored | tidak ada perubahan diperlukan |
| 9 | **File ter-ekspos** | 🟢 `.git`, `.env*`, config, source-map → 404 di produksi | tidak ada perubahan diperlukan |
| 1/6 | **Akses user / sanitasi form** | 🟢 semua query pakai parameter (bukan SQL string); filter `.or()` sudah di-sanitasi | perkuat: lihat "Sisa pekerjaan" |

---

## Perlu Aksi Admin (env var baru di Vercel)

1. **`META_APP_SECRET`** — App Secret dari Meta App (Settings → Basic). Setelah di-set,
   webhook WhatsApp menolak request tanpa signature valid (`X-Hub-Signature-256`).
   Tanpa ini: verifikasi di-skip (log warning), sama seperti perilaku lama.
2. **`VERCEL_WEBHOOK_SECRET`** — secret webhook Vercel (Account Settings → Webhooks).
   Setelah di-set, `/api/webhooks/vercel` menolak payload tanpa `x-vercel-signature` valid.
3. **Pastikan `SESSION_SECRET` dan `ADMIN_PASSWORD` selalu ter-set di production** —
   sekarang kalau keduanya kosong, auth di-matikan (fail closed) bukan pakai kunci fallback.

---

## Sisa pekerjaan (rekomendasi, belum dikerjakan)

| Prioritas | Item |
|-----------|------|
| Sedang | **RBAC per-rute.** Sekarang *semua* karyawan yang login bisa memanggil *semua* API admin (mis. user "kurir" bisa `sb-write` ke tabel apa pun). `RoleGate` hanya proteksi UI. Perlu `requireRole()` server-side berbasis `akses_halaman` di rute sensitif. |
| Sedang | **`events` masih anon-readable** termasuk kolom `bank_info`, `deposit_amount`, `proposal_event_id`. Buat VIEW publik berisi kolom aman saja, atau layani hanya via `/api/events/register`. |
| Rendah | `sb-read` membolehkan admin baca tabel apa pun (termasuk `karyawan.password` hash, `password_reset_tokens`). Pertimbangkan allowlist tabel. |
| Rendah | `supabase/functions/diag-pesan` mem-log 20 char service-role key. Hapus baris itu + pastikan fungsi diag tidak ter-deploy publik. |
| Rendah | Login: normalisasi timing (user tidak ketemu = balas cepat, ketemu = lambat karena bcrypt) → oracle enumerasi username. Tambah `bcrypt.compare` dummy. |
| Rendah | `admin/auth` POST pakai rate-limiter in-memory (reset tiap cold start). Pindah ke `checkRateLimit` berbasis DB. |
| Rendah | CSP masih `'unsafe-inline'` + `'unsafe-eval'` di `script-src`. Butuh nonce-based CSP (perubahan besar di Next). |

---

## Cara verifikasi ulang (anon key TIDAK bisa baca tabel sensitif)

```bash
URL=$NEXT_PUBLIC_SUPABASE_URL ; ANON=$NEXT_PUBLIC_SUPABASE_ANON_KEY
curl -s "$URL/rest/v1/data_log?limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# Harus: []   (bukan data)
```
