# Cara Build APK Android

## Prasyarat

Install semua tools berikut sebelum mulai:

1. **Node.js** 18+ dan npm
2. **Java JDK 17** — download dari https://adoptium.net/
3. **Android Studio** — download dari https://developer.android.com/studio
   - Buka Android Studio → More Actions → SDK Manager
   - Install **Android SDK Platform 34** (API 34)
   - Install **Android SDK Build-Tools 34.0.0**
   - Catat path SDK (contoh: `C:\Users\Anda\AppData\Local\Android\Sdk`)
4. **Expo CLI** — install global: `npm install -g expo-cli`

---

## Langkah Build

### 1. Set variabel lingkungan (sekali saja)

**Windows (PowerShell):**
```powershell
$env:ANDROID_HOME = "C:\Users\YourName\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\tools;$env:ANDROID_HOME\platform-tools"
```

**macOS/Linux (~/.bashrc atau ~/.zshrc):**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### 2. Set URL backend

Buka file `src/api/client.ts` dan ganti:
```ts
export const API_BASE_URL = 'https://YOUR_VERCEL_DOMAIN.vercel.app';
```
dengan URL Vercel production Anda, contoh:
```ts
export const API_BASE_URL = 'https://nikon-dashboard.vercel.app';
```

### 3. Install dependencies

```bash
cd android-app
npm install
```

### 4. Prebuild (generate native Android project)

```bash
npx expo prebuild --platform android --clean
```

> Ini akan membuat folder `android/` berisi project Android native.

### 5. Build APK Debug (untuk testing)

```bash
cd android
./gradlew assembleDebug
```

APK tersimpan di: `android/app/build/outputs/apk/debug/app-debug.apk`

### 6. Build APK Release (untuk distribusi)

Buat keystore dulu (hanya sekali):
```bash
keytool -genkey -v -keystore nikon-release.keystore -alias nikon -keyalg RSA -keysize 2048 -validity 10000
```

Masukkan password saat diminta. Simpan file `nikon-release.keystore` di tempat aman.

Edit `android/gradle.properties`, tambahkan:
```properties
MYAPP_RELEASE_STORE_FILE=nikon-release.keystore
MYAPP_RELEASE_KEY_ALIAS=nikon
MYAPP_RELEASE_STORE_PASSWORD=password_keystore_anda
MYAPP_RELEASE_KEY_PASSWORD=password_key_anda
```

Edit `android/app/build.gradle` di bagian `signingConfigs`:
```gradle
signingConfigs {
    release {
        storeFile file(MYAPP_RELEASE_STORE_FILE)
        storePassword MYAPP_RELEASE_STORE_PASSWORD
        keyAlias MYAPP_RELEASE_KEY_ALIAS
        keyPassword MYAPP_RELEASE_KEY_PASSWORD
    }
}
```

Lalu build release:
```bash
cd android
./gradlew assembleRelease
```

APK tersimpan di: `android/app/build/outputs/apk/release/app-release.apk`

---

## Menjalankan di Emulator / Device (tanpa build APK)

```bash
# Di root android-app/
npx expo start --android
```

Atau jalankan langsung di device yang terhubung USB:
```bash
npx expo run:android
```

---

## Troubleshooting

### `ANDROID_HOME not set`
Set variabel lingkungan sesuai langkah 1.

### `SDK location not found`
Buka Android Studio → SDK Manager, catat path SDK, buat file:
`android/local.properties` dengan isi:
```
sdk.dir=/path/ke/Android/Sdk
```

### Error Gradle wrapper
```bash
cd android
chmod +x gradlew
```

### `Could not resolve expo-*`
Jalankan ulang: `npm install` di folder `android-app/`
