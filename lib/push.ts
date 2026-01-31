import webpush from 'web-push'
import { prisma } from './prisma'

function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return null
  }
  return { publicKey, privateKey }
}

export function isPushConfigured(): boolean {
  return !!getVapidKeys()
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const keys = getVapidKeys()
  if (!keys) return

  webpush.setVapidDetails(
    'mailto:support@lagrancasablanca.com',
    keys.publicKey,
    keys.privateKey
  )

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  const payload = JSON.stringify({
    title,
    body,
    ...data,
  })

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
        { TTL: 60 }
      )
    )
  )

  // Remove invalid/expired subscriptions (410 Gone, 404 Not Found)
  const toRemove: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        toRemove.push(subscriptions[i].id)
      } else {
        console.error('[Push] Error sending to', subscriptions[i].endpoint.slice(0, 50), err?.message)
      }
    }
  })

  if (toRemove.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: toRemove } } })
  }
}

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
