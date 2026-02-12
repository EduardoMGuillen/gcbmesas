import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'

async function getPayPalAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured')
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal auth failed: ${error}`)
  }

  const data = await res.json()
  return data.access_token as string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, numberOfEntries } = body

    if (!eventId || !numberOfEntries || numberOfEntries < 1) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Get event
    const event = await prisma.event.findFirst({
      where: { id: eventId, isActive: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    if (!event.paypalPrice) {
      return NextResponse.json({ error: 'Este evento no acepta pagos en línea' }, { status: 400 })
    }

    const totalAmount = (Number(event.paypalPrice) * numberOfEntries).toFixed(2)

    // Create PayPal order
    const accessToken = await getPayPalAccessToken()
    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          description: `${numberOfEntries}x Entrada - ${event.name}`,
          amount: {
            currency_code: 'USD',
            value: totalAmount,
          },
        }],
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('[PayPal] Create order error:', error)
      return NextResponse.json({ error: 'Error al crear orden de PayPal' }, { status: 500 })
    }

    const order = await res.json()
    return NextResponse.json({ orderId: order.id })
  } catch (error: any) {
    console.error('[PayPal] Create order error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
