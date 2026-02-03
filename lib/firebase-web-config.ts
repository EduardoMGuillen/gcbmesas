/**
 * Config de Firebase Web (PWA Android con FCM).
 * Añade a .env (o .env.local) con los valores de Firebase Console > Tu proyecto > Configuración > Tus apps > Web:
 *
 *   NEXT_PUBLIC_FIREBASE_API_KEY=...
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=gcbmesas-vercel-app
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gcbmesas-vercel-app.firebaseapp.com
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gcbmesas-vercel-app.firebasestorage.app
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=892705622211
 *   NEXT_PUBLIC_FIREBASE_APP_ID=1:892705622211:web:...
 */
export function getFirebaseWebConfig(): {
  apiKey: string
  projectId: string
  messagingSenderId: string
  appId: string
  authDomain?: string
  storageBucket?: string
} | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  if (!apiKey || !projectId || !messagingSenderId || !appId) return null
  return {
    apiKey,
    projectId,
    messagingSenderId,
    appId,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || undefined,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  }
}
