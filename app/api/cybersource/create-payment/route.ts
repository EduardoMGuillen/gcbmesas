import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { CyberSourceApiError, cyberSourcePost } from '@/lib/cybersource'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, numberOfEntries, clientNames, clientEmail, clientPhone } = body

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

    const cleanNames = clientNames
      .map((n: string) => String(n || '').trim())
      .filter((n: string) => n.length > 0)
    if (!cleanNames.length || cleanNames.length !== Number(numberOfEntries)) {
      return NextResponse.json({ error: 'Nombres de entradas incompletos' }, { status: 400 })
    }

    const total = (Number(event.paypalPrice) * Number(numberOfEntries)).toFixed(2)
    const paymentReference = `CS-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase()

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const cyberEnv = (process.env.CYBERSOURCE_ENV || 'test').toLowerCase()
    const currency = 'HNL'
    const isMockMode = process.env.CYBERSOURCE_MOCK === 'true'
    const paymentMode = (process.env.CYBERSOURCE_PAYMENT_MODE || 'unified').toLowerCase()

    // In mock mode we still persist the pending order so confirm-payment can complete the full flow.
    if (isMockMode) {
      await prisma.log.create({
        data: {
          action: 'EVENT_UPDATED',
          details: {
            type: 'CYBERSOURCE_PENDING',
            status: 'PENDING',
            paymentReference,
            eventId: event.id,
            eventName: event.name,
            numberOfEntries: Number(numberOfEntries),
            clientNames: cleanNames,
            clientEmail: String(clientEmail).trim(),
            clientPhone: clientPhone ? String(clientPhone).trim() : null,
            totalPrice: Number(total),
            currency,
            environment: 'mock',
            createdAt: new Date().toISOString(),
          },
        },
      })
      return NextResponse.json({
        mock: true,
        paymentReference,
      })
    }

    const required = [process.env.CYBERSOURCE_MERCHANT_ID, process.env.CYBERSOURCE_KEY_ID, process.env.CYBERSOURCE_SHARED_SECRET]
    if (required.some((v) => !v)) {
      return NextResponse.json(
        { error: 'CyberSource REST no está configurado. Faltan merchant_id, key_id o shared_secret.' },
        { status: 503 }
      )
    }

    await prisma.log.create({
      data: {
        action: 'EVENT_UPDATED',
        details: {
          type: 'CYBERSOURCE_PENDING',
          status: 'PENDING',
          paymentReference,
          eventId: event.id,
          eventName: event.name,
          numberOfEntries: Number(numberOfEntries),
          clientNames: cleanNames,
          clientEmail: String(clientEmail).trim(),
          clientPhone: clientPhone ? String(clientPhone).trim() : null,
          totalPrice: Number(total),
          currency,
          environment: cyberEnv,
          createdAt: new Date().toISOString(),
        },
      },
    })

    if (paymentMode === 'direct') {
      return NextResponse.json({
        paymentReference,
        directMode: true,
      })
    }

    const enable3DS = process.env.CYBERSOURCE_ENABLE_3DS !== 'false'
    const captureContextPayload: any = {
      targetOrigins: [appUrl],
      clientVersion: '0.31',
      allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
      allowedPaymentTypes: ['PANENTRY'],
      country: 'HN',
      locale: 'en_US',
      captureMandate: {
        billingType: 'FULL',
        requestEmail: true,
        requestPhone: true,
        showAcceptedNetworkIcons: true,
      },
      data: {
        clientReferenceInformation: { code: paymentReference },
        orderInformation: {
          amountDetails: {
            totalAmount: total,
            currency,
          },
        },
      },
    }
    if (enable3DS) {
      captureContextPayload.completeMandate = {
        type: 'CAPTURE',
        consumerAuthentication: true,
      }
    }

    const captureContext = await cyberSourcePost<any>('/up/v1/capture-contexts', captureContextPayload)

    const captureContextJwt =
      captureContext?.captureContext || captureContext?.token || (typeof captureContext === 'string' ? captureContext : null)
    if (!captureContextJwt) {
      return NextResponse.json({ error: 'CyberSource no devolvió capture context.' }, { status: 502 })
    }

    return NextResponse.json({
      paymentReference,
      directMode: false,
      captureContext: captureContextJwt,
      clientLibrary:
        captureContext?.clientLibrary ||
        (cyberEnv === 'live'
          ? 'https://api.cybersource.com/up/v1/assets/0.31.0/SecureAcceptance.js'
          : 'https://apitest.cybersource.com/up/v1/assets/0.31.0/SecureAcceptance.js'),
      clientLibraryIntegrity: captureContext?.clientLibraryIntegrity || null,
    })
  } catch (error: any) {
    if (error instanceof CyberSourceApiError) {
      console.error('[CyberSource] Create payment API error:', {
        endpoint: error.endpoint,
        status: error.status,
        requestId: error.requestId,
        responseBody: error.responseBody,
      })
      const reason =
        typeof error.responseBody === 'string'
          ? error.responseBody
          : error.responseBody?.errorInformation?.reason ||
            error.responseBody?.reason ||
            error.responseBody?.message ||
            error.message
      return NextResponse.json(
        {
          error: `CyberSource ${error.status}: ${reason}`,
          requestId: error.requestId,
          endpoint: error.endpoint,
        },
        { status: 502 }
      )
    }
    console.error('[CyberSource] Create payment error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
