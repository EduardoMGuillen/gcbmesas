import webpush from 'web-push'
import admin from 'firebase-admin'
import { prisma } from './prisma'

function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey }
}

function isFirebaseConfigured(): boolean {
  return !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
}

let firebaseInitialized = false
function getFirebaseAdmin() {
  if (firebaseInitialized) return admin.app()
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (credPath) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
  } else if (credJson) {
    try {
      const cred = JSON.parse(credJson)
      admin.initializeApp({ credential: admin.credential.cert(cred) })
    } catch {
      return null
    }
  } else return null
  firebaseInitialized = true
  return admin.app()
}

export function isPushConfigured(): boolean {
  return !!getVapidKeys() || isFirebaseConfigured()
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })
  if (subscriptions.length === 0) return
  const vapidKeys = getVapidKeys()
  const webCount = subscriptions.filter((s) => !s.endpoint.startsWith('fcm:')).length
  if (webCount > 0 && !vapidKeys) {
    console.warn('[Push] Hay', webCount, 'suscripción(es) web (PC/iOS) pero no hay VAPID en el servidor. Añade VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Vercel.')
  }
  console.log('[Push] Enviando a usuario', userId, '|', subscriptions.length, 'suscripción(es) | título:', title)

  const toRemove: string[] = []

  for (const sub of subscriptions) {
    if (sub.endpoint.startsWith('fcm:')) {
      const token = sub.endpoint.slice(4)
      const app = getFirebaseAdmin()
      if (!app) {
        console.warn('[Push FCM] Firebase no inicializado, se omite suscripción')
        continue
      }
      try {
        await app.messaging().send({
          token,
          notification: { title, body },
          data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
          android: { priority: 'high' as const },
        })
        console.log('[Push FCM] Enviado OK')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (/invalid-registration-token|registration-token-not-registered|not-found/i.test(msg)) {
          toRemove.push(sub.id)
        } else {
          console.error('[Push FCM] Error:', msg)
        }
      }
      continue
    }

    const keys = vapidKeys ?? getVapidKeys()
    if (!keys || !sub.p256dh || !sub.auth) {
      if (!keys) console.warn('[Push Web] Omitida suscripción PC/web: faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY en el servidor.')
      continue
    }
    webpush.setVapidDetails(
      'mailto:support@lagrancasablanca.com',
      keys.publicKey,
      keys.privateKey
    )
    const payload = JSON.stringify({ title, body, ...data })
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 3600, contentEncoding: 'aes128gcm' as const }
      )
      console.log('[Push Web] Enviado OK', sub.endpoint.includes('fcm.googleapis.com') ? '(Chrome Android)' : '')
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: string }
      if (e?.statusCode === 410 || e?.statusCode === 404) toRemove.push(sub.id)
      else console.error('[Push Web] Error', e?.statusCode || '', sub.endpoint.slice(0, 60), e?.body || err)
    }
  }

  if (toRemove.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: toRemove } } })
  }
}

/** Notifica al usuario que abrió la mesa (mesero o admin). */
export async function sendPushToAccountOpener(
  openedByUserId: string | null,
  tableName: string,
  productName: string,
  quantity: number
) {
  if (!openedByUserId) return
  await sendPushToUser(
    openedByUserId,
    'Nuevo pedido en tu mesa',
    `${quantity}x ${productName} - Mesa ${tableName}`,
    { type: 'new_order', tableName, productName, quantity: String(quantity) }
  )
}

/** Notifica a todos los cajeros con push activo sobre un nuevo pedido. */
export async function sendPushToCajeros(
  tableName: string,
  productName: string,
  quantity: number,
  meseroName: string
) {
  const cajeroSubs = await prisma.pushSubscription.findMany({
    where: { user: { role: 'CAJERO' } },
    select: { userId: true },
  })
  // IDs únicos de cajeros con suscripción push
  const uniqueIds = Array.from(new Set(cajeroSubs.map((s) => s.userId)))
  if (uniqueIds.length === 0) return

  const title = 'Nuevo pedido pendiente'
  const body = `${quantity}x ${productName} - Mesa ${tableName} (${meseroName})`
  const data = { type: 'new_order_cajero', tableName, productName, quantity: String(quantity), meseroName }

  for (const userId of uniqueIds) {
    sendPushToUser(userId, title, body, data).catch((e) =>
      console.error('[Push Cajero] Error enviando a', userId, e)
    )
  }
}
