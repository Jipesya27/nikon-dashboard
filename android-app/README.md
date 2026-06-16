# Nikon Dashboard Android App

React Native (Expo) app untuk karyawan Nikon.

## Fitur
- Login karyawan
- Pesan WhatsApp (lihat & balas)
- Validasi pembayaran event
- Scan QR absensi event

## Setup

1. Buat file `.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://your-domain.vercel.app
```

2. Install dependencies:
```bash
cd android-app
npm install
```

3. Jalankan:
```bash
npx expo start --android
```

## Build APK (EAS)
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## Struktur File
```
android-app/
├── app/
│   ├── _layout.tsx          # Root layout, cek session → redirect
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx        # Halaman login
│   └── (tabs)/
│       ├── _layout.tsx      # Tab navigator (4 tab)
│       ├── index.tsx        # Beranda + stats
│       ├── messages.tsx     # Daftar kontak WA
│       ├── thread.tsx       # Thread pesan (hidden tab)
│       ├── events.tsx       # Validasi pendaftaran event
│       └── attendance.tsx   # Scan QR absensi
├── constants/
│   └── config.ts            # API_BASE_URL, warna brand
├── lib/
│   ├── api.ts               # Axios instance + sbRead helper
│   ├── auth.ts              # login, logout, isLoggedIn
│   ├── storage.ts           # AsyncStorage session helper
│   └── types.ts             # TypeScript interfaces
├── assets/                  # Icon & splash (tambahkan manual)
├── app.json
├── eas.json
└── package.json
```

## Catatan Assets
Tambahkan file berikut ke folder `assets/` sebelum build:
- `icon.png` — 1024×1024 px, background kuning `#FFE500`
- `splash.png` — 1242×2436 px, background kuning `#FFE500`
- `adaptive-icon.png` — 1024×1024 px (foreground Android adaptive icon)

## Auth Flow
1. App start → cek AsyncStorage untuk session
2. Tidak ada session → redirect ke `/login`
3. Login POST ke `/api/auth/karyawan-login` → simpan cookie di AsyncStorage
4. Semua request berikutnya inject `Cookie` header dari storage
