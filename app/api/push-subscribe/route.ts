import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPushConfigured } from '@/lib/push'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: 'Notificaciones push no configuradas' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { endpoint, keys, platform, token } = body

    // Android (FCM): platform === 'android' y token
    if (platform === 'android' && token) {
      const endpointFcm = `fcm:${token}`
      await prisma.pushSubscription.upsert({
        where: { endpoint: endpointFcm },
        create: {
          userId: session.user.id,
          endpoint: endpointFcm,
          platform: 'android',
          p256dh: null,
          auth: null,
        },
        update: {},
      })
      return NextResponse.json({ success: true })
    }

    // Web (VAPID): endpoint + keys
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Datos de suscripción inválidos' },
        { status: 400 }
      )
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: session.user.id,
        endpoint,
        platform: 'web',
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push-subscribe] Error:', error)
    return NextResponse.json(
      { error: 'Error al registrar suscripción' },
      { status: 500 }
    )
  }
}
