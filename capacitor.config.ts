import type { CapacitorConfig } from '@capacitor/cli'

// APK: el app abre esta URL (tu web en producción). No cambia Next.js ni el servidor.
// 1) Sustituye la URL abajo por tu dominio (ej. https://gcbmesas.vercel.app)
// 2) npm run cap:sync  →  npm run android  (abre Android Studio)
// 3) En Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://tu-dominio.vercel.app'

const config: CapacitorConfig = {
  appId: 'com.casablanca.gcbmesas',
  appName: 'Casa Blanca',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
}

export default config
