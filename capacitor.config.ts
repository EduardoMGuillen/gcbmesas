import type { CapacitorConfig } from '@capacitor/cli'

// APK: el WebView carga esta URL (misma app que en el navegador). Las push del APK usan FCM nativo
// (Capacitor) y el servidor las envía con Firebase Admin igual que los tokens FCM de Chrome Android.
//
// Checklist push APK + web:
//   - Firebase Console: app Android con package com.casablanca.gcbmesas → google-services.json en android/app/
//   - Mismo proyecto: cuenta de servicio en el servidor (GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON)
//   - PWA Chrome Android: NEXT_PUBLIC_FIREBASE_* + VAPID (opcional en APK)
//   - Antes de compilar: export CAPACITOR_SERVER_URL=https://otro-dominio.com si cambias de host
//
// 1) CAPACITOR_SERVER_URL o default abajo = URL de producción HTTPS (sin barra final)
// 2) npm run cap:sync  →  npm run android
// 3) Android Studio: Build → Build APK(s)
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://www.lagrancasablanca.com'

const config: CapacitorConfig = {
  appId: 'com.casablanca.gcbmesas',
  appName: 'GCB Eventos',
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
