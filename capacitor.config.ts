import type { CapacitorConfig } from '@capacitor/cli'

// APK: el app abre esta URL (tu web en producción). No cambia Next.js ni el servidor.
// Notificaciones en el APK (FCM):
//   - Firebase Console: crea proyecto, añade app Android (com.casablanca.gcbmesas), descarga google-services.json
//   - Copia google-services.json en android/app/ (reemplaza el ejemplo)
//   - En el servidor: GOOGLE_APPLICATION_CREDENTIALS=ruta/al-service-account.json
//     o FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' (JSON como string)
// 1) Sustituye la URL abajo por tu dominio
// 2) npm run cap:sync  →  npm run android  (abre Android Studio)
// 3) En Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://gcbmesas.vercel.app'

const config: CapacitorConfig = {
  appId: 'com.casablanca.gcbmesas',
  appName: 'GranCasaBlanca Mesas',
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
