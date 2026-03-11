import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, numberOfEntries, clientNames, clientEmail } = body

    if (!eventId || !numberOfEntries || numberOfEntries < 1 || !Array.isArray(clientNames) || !clientEmail) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, isActive: true },
      select: { id: true, name: true, paypalPrice: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }
    if (!event.paypalPrice) {
      return NextResponse.json({ error: 'Este evento no acepta pagos en línea' }, { status: 400 })
    }

    // Temporary mock mode so online flow can be tested before credentials arrive.
    if (process.env.CYBERSOURCE_MOCK === 'true') {
      return NextResponse.json({
        mock: true,
        paymentReference: `mock_${crypto.randomUUID()}`,
      })
    }

    const required = [
      process.env.CYBERSOURCE_MERCHANT_ID,
      process.env.CYBERSOURCE_ACCESS_KEY,
      process.env.CYBERSOURCE_PROFILE_ID,
    ]
    if (required.some((v) => !v)) {
      return NextResponse.json(
        { error: 'CyberSource no está configurado todavía. Intenta nuevamente cuando estén cargadas las credenciales.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Integración de checkout CyberSource pendiente de firma y endpoint final.' },
      { status: 501 }
    )
  } catch (error: any) {
    console.error('[CyberSource] Create payment error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
