import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendPushToUser, isPushConfigured } from '@/lib/push'

export async function POST() {
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

    await sendPushToUser(
      session.user.id,
      'Prueba - Casa Blanca',
      'Si ves esto, las notificaciones funcionan correctamente.',
      { type: 'test' }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push-test] Error:', error)
    return NextResponse.json(
      { error: 'Error al enviar notificación de prueba' },
      { status: 500 }
    )
  }
}
