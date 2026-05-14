import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { CyberSourceApiError, cyberSourcePost } from '@/lib/cybersource'
import { assertEventEntryCapacity } from '@/lib/actions'
import { formatPurchaseErrorForUser } from '@/lib/purchase-user-friendly-error'
import { scheduleOnlinePaymentRejectionLog } from '@/lib/online-payment-rejection'

function logCreateReject(
  status: number,
  rawMessage: string,
  ctx: { eventId?: string | null; paymentReference?: string | null; clientEmail?: string | null }
) {
  const friendly = formatPurchaseErrorForUser(rawMessage)
  scheduleOnlinePaymentRejectionLog({
    source: 'create-payment',
    httpStatus: status,
    rawMessage,
    friendlyMessage: friendly,
    eventId: ctx.eventId ?? undefined,
    paymentReference: ctx.paymentReference ?? undefined,
    clientEmail: ctx.clientEmail ?? undefined,
  })
  return friendly
}

function parseJwtPayload(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4)
    const json = Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let stash: { eventId?: string; paymentReference?: string; clientEmail?: string } = {}
  try {
    const body = await req.json()
    const { eventId, numberOfEntries, clientNames, clientEmail, clientPhone } = body

    if (!eventId || !numberOfEntries || numberOfEntries < 1 || !Array.isArray(clientNames) || !clientEmail) {
      const friendly = logCreateReject(400, 'Datos incompletos', {
        eventId,
        paymentReference: null,
        clientEmail,
      })
      return NextResponse.json({ error: friendly }, { status: 400 })
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, isActive: true },
      select: { id: true, name: true, paypalPrice: true, maxEntries: true },
    })

    if (!event) {
      const friendly = logCreateReject(404, 'Evento no encontrado', {
        eventId,
        paymentReference: null,
        clientEmail,
      })
      return NextResponse.json({ error: friendly }, { status: 404 })
    }

    stash.eventId = event.id
    stash.clientEmail = String(clientEmail).trim()

    if (!event.paypalPrice) {
      const friendly = logCreateReject(400, 'Este evento no acepta pagos en línea', {
        eventId: event.id,
        paymentReference: null,
        clientEmail,
      })
      return NextResponse.json({ error: friendly }, { status: 400 })
    }

    try {
      await assertEventEntryCapacity(event, Number(numberOfEntries))
    } catch (capErr: any) {
      const rawCap = capErr?.message || 'Sin cupo para este evento.'
      const friendly = logCreateReject(409, rawCap, {
        eventId: event.id,
        paymentReference: null,
        clientEmail,
      })
      return NextResponse.json({ error: friendly }, { status: 409 })
    }

    const cleanNames = clientNames
      .map((n: string) => String(n || '').trim())
      .filter((n: string) => n.length > 0)
    if (!cleanNames.length || cleanNames.length !== Number(numberOfEntries)) {
      const friendly = logCreateReject(400, 'Nombres de entradas incompletos', {
        eventId: event.id,
        paymentReference: null,
        clientEmail,
      })
      return NextResponse.json({ error: friendly }, { status: 400 })
    }

    const total = (Number(event.paypalPrice) * Number(numberOfEntries)).toFixed(2)
    const paymentReference = `CS-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase()
    stash.paymentReference = paymentReference

    // Use the browser's actual origin (from the Origin request header) as the primary
    // targetOrigin so it always matches window.location.origin exactly.
    // Fall back to the configured app URL (trailing slash stripped) when the header is absent.
    const requestOrigin = (req.headers.get('origin') || '').replace(/\/$/, '')
    const configuredUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    const appUrl = requestOrigin || configuredUrl || req.nextUrl.origin.replace(/\/$/, '')
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
      const friendly = logCreateReject(
        503,
        'CyberSource REST no está configurado. Faltan merchant_id, key_id o shared_secret.',
        { eventId: event.id, paymentReference, clientEmail }
      )
      return NextResponse.json({ error: friendly }, { status: 503 })
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

    // Build a de-duped list of allowed origins for the Microform capture context.
    // Must contain every origin where the Microform will be embedded.
    const targetOrigins = Array.from(new Set([appUrl, configuredUrl].filter(Boolean)))

    // Keep this payload minimal — exactly what the guide uses.
    // allowedPaymentTypes is a Unified Checkout field, not Microform; it restricts networks.
    // orderInformation in the capture context can also limit which card types CyberSource embeds.
    const captureContextPayload: any = {
      targetOrigins,
      clientVersion: 'v2',
      allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    }

    // Same minimal payload used as fallback (no change needed)
    const minimalCaptureContextPayload: any = {
      targetOrigins,
      clientVersion: 'v2',
      allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
    }

    let captureContext: any
    try {
      captureContext = await cyberSourcePost<any>('/microform/v2/sessions', captureContextPayload)
    } catch (error: any) {
      if (error instanceof CyberSourceApiError && error.status === 400) {
        console.warn('[CyberSource] microform session enriched payload rejected, retrying minimal payload.', {
          requestId: error.requestId,
          responseBody: error.responseBody,
        })
        captureContext = await cyberSourcePost<any>('/microform/v2/sessions', minimalCaptureContextPayload)
      } else {
        throw error
      }
    }

    const captureContextJwt =
      captureContext?.captureContext || captureContext?.token || (typeof captureContext === 'string' ? captureContext : null)
    if (!captureContextJwt) {
      const friendly = logCreateReject(502, 'CyberSource no devolvió capture context.', {
        eventId: event.id,
        paymentReference,
        clientEmail,
      })
      return NextResponse.json({ error: friendly }, { status: 502 })
    }

    const payload = parseJwtPayload(String(captureContextJwt))
    const ctxData = payload?.ctx?.[0]?.data || {}

    // Diagnostic: log which card networks CyberSource actually embedded in the JWT
    console.log('[CyberSource] Capture context card networks:', ctxData.allowedCardNetworks ?? payload?.flx?.data?.allowedCardNetworks ?? 'not found in JWT')

    return NextResponse.json({
      paymentReference,
      directMode: false,
      captureContext: captureContextJwt,
      clientLibrary:
        ctxData.clientLibrary ||
        captureContext?.clientLibrary ||
        (cyberEnv === 'live'
          ? 'https://flex.cybersource.com/microform/bundle/v2/flex-microform.min.js'
          : 'https://testflex.cybersource.com/microform/bundle/v2/flex-microform.min.js'),
      clientLibraryIntegrity: ctxData.clientLibraryIntegrity || captureContext?.clientLibraryIntegrity || null,
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
      const rawCs = `CyberSource ${error.status}: ${reason}`
      const friendly = logCreateReject(502, rawCs, {
        eventId: stash.eventId,
        paymentReference: stash.paymentReference,
        clientEmail: stash.clientEmail,
      })
      return NextResponse.json(
        {
          error: friendly,
          requestId: error.requestId,
          endpoint: error.endpoint,
        },
        { status: 502 }
      )
    }
    console.error('[CyberSource] Create payment error:', error)
    const friendly = logCreateReject(500, error?.message || 'Error interno', {
      eventId: stash.eventId,
      paymentReference: stash.paymentReference,
      clientEmail: stash.clientEmail,
    })
    return NextResponse.json({ error: friendly }, { status: 500 })
  }
}
