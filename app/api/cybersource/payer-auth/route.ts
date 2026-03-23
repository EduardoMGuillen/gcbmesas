import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CyberSourceApiError } from '@/lib/cybersource'
import {
  cyberSourcePayerAuthSetupViaSdk,
  cyberSourcePayerAuthEnrollViaSdk,
} from '@/lib/cybersource-sdk-direct'

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function normalizeConsumerAuthenticationInformation(raw: any) {
  if (!raw || typeof raw !== 'object') return null
  const normalized = {
    authenticationTransactionId: raw.authenticationTransactionId ? String(raw.authenticationTransactionId) : undefined,
    cavv: raw.cavv ? String(raw.cavv) : undefined,
    xid: raw.xid ? String(raw.xid) : undefined,
    eci: raw.eci ? String(raw.eci) : undefined,
    acsTransactionId: raw.acsTransactionId ? String(raw.acsTransactionId) : undefined,
    threeDSServerTransactionId: raw.threeDSServerTransactionId ? String(raw.threeDSServerTransactionId) : undefined,
    directoryServerTransactionId: raw.directoryServerTransactionId ? String(raw.directoryServerTransactionId) : undefined,
  }
  const hasAny = Object.values(normalized).some((v) => Boolean(v))
  return hasAny ? normalized : null
}

function commerceIndicatorForBrand(cardType: string): string {
  const t = String(cardType || '').toLowerCase()
  if (t === '001' || t.includes('visa')) return 'vbv'
  if (t === '002' || t.includes('mastercard') || t.includes('master')) return 'spa'
  if (t === '003' || t.includes('amex') || t.includes('american')) return 'aesk'
  return 'aesk'
}

function looksLikeChallengeRequired(rawAuthResponse: any) {
  const status = String(rawAuthResponse?.status || '').toUpperCase()
  const paStatus = String(rawAuthResponse?.consumerAuthenticationInformation?.paresStatus || '').toUpperCase()
  const stepUpUrl = rawAuthResponse?.consumerAuthenticationInformation?.stepUpUrl
  return status.includes('CHALLENGE') || paStatus === 'C' || Boolean(stepUpUrl)
}

export async function POST(req: NextRequest) {
  const currency = 'HNL'
  try {
    const body = await req.json()
    const {
      paymentReference,
      eventId,
      numberOfEntries,
      transientToken,
      cardHolderName,
      billToAddress1,
      billToLocality,
      billToAdministrativeArea,
      billToPostalCode,
      billToCountry,
      paymentCardType,
      clientEmail,
    } = body

    if (!paymentReference || !eventId || !numberOfEntries || !transientToken) {
      return NextResponse.json({ error: 'Datos incompletos para validación 3DS.' }, { status: 400 })
    }

    const is3dsEnabled = (process.env.CYBERSOURCE_ENABLE_3DS || 'true').toLowerCase() === 'true'
    if (!is3dsEnabled) {
      return NextResponse.json({
        enabled: false,
        status: 'skipped',
        commerceIndicator: 'internet',
        consumerAuthenticationInformation: null,
      })
    }

    const pendingLog = await prisma.log.findFirst({
      where: {
        action: 'EVENT_UPDATED',
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 48) },
        AND: [
          { details: { path: ['type'], equals: 'CYBERSOURCE_PENDING' } },
          { details: { path: ['paymentReference'], equals: paymentReference } },
          { details: { path: ['eventId'], equals: eventId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!pendingLog) {
      return NextResponse.json({ error: 'No se encontró la orden pendiente para Payer Auth.' }, { status: 404 })
    }

    const pendingDetails = pendingLog.details as any
    const event = await prisma.event.findFirst({
      where: { id: pendingDetails?.eventId || eventId, isActive: true },
    })
    if (!event || !event.paypalPrice) {
      return NextResponse.json({ error: 'Evento no encontrado o sin precio online.' }, { status: 404 })
    }

    const amount = (Number(event.paypalPrice) * Number(pendingDetails?.numberOfEntries || numberOfEntries)).toFixed(2)
    const fallbackName = String(cardHolderName || pendingDetails?.clientNames?.[0] || 'Cliente General').trim()
    const firstName = fallbackName.split(' ')[0] || 'Cliente'
    const lastName = fallbackName.split(' ').slice(1).join(' ') || 'General'
    const resolvedBillTo = {
      firstName: String(firstName).trim() || 'Cliente',
      lastName: String(lastName).trim() || 'General',
      email: String(clientEmail || pendingDetails?.clientEmail || 'cliente@example.com').trim(),
      country: String(billToCountry || 'HN').trim().toUpperCase() || 'HN',
      locality: String(billToLocality || 'Tegucigalpa').trim() || 'Tegucigalpa',
      address1: String(billToAddress1 || 'N/A').trim() || 'N/A',
      administrativeArea: String(billToAdministrativeArea || 'FM').trim() || 'FM',
      postalCode: String(billToPostalCode || '11101').trim() || '11101',
      phoneNumber: String(pendingDetails?.clientPhone || '00000000').trim() || '00000000',
    }

    const tokenPayload = parseJwtPayload(String(transientToken))
    const tokenDetectedType = tokenPayload?.content?.paymentInformation?.card?.number?.detectedCardTypes?.[0]
    const resolvedCardType = String(paymentCardType || tokenDetectedType || '').trim()

    // Step 1: Setup device fingerprint / enrollment reference
    const setupResponse = await cyberSourcePayerAuthSetupViaSdk({
      paymentReference,
      transientToken: String(transientToken),
      amount,
      currency,
      billTo: resolvedBillTo,
      cardType: resolvedCardType || undefined,
    })

    const referenceId = String(setupResponse?.consumerAuthenticationInformation?.referenceId || '').trim()
    if (!referenceId) {
      return NextResponse.json({
        enabled: true,
        status: 'failed',
        commerceIndicator: 'internet',
        consumerAuthenticationInformation: null,
        reason: 'No se recibió referenceId de Payer Auth setup.',
      })
    }

    const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')

    // Step 2: Check enrollment / initiate authentication
    const authenticationResponse = await cyberSourcePayerAuthEnrollViaSdk({
      paymentReference,
      transientToken: String(transientToken),
      referenceId,
      returnUrl: `${appUrl}/api/cybersource/3ds-callback`,
      amount,
      currency,
      billTo: resolvedBillTo,
      cardType: resolvedCardType || undefined,
    })

    const normalizedConsumerAuth = normalizeConsumerAuthenticationInformation(
      authenticationResponse?.consumerAuthenticationInformation
    )

    if (looksLikeChallengeRequired(authenticationResponse)) {
      const cai = authenticationResponse?.consumerAuthenticationInformation || {}
      return NextResponse.json({
        enabled: true,
        status: 'challenge_required',
        commerceIndicator: 'internet',
        consumerAuthenticationInformation: normalizedConsumerAuth,
        paymentCardType: resolvedCardType || null,
        stepUpUrl: cai.stepUpUrl || null,
        accessToken: cai.accessToken || null,
        authenticationTransactionId: cai.authenticationTransactionId || null,
      })
    }

    if (!normalizedConsumerAuth) {
      return NextResponse.json({
        enabled: true,
        status: 'failed',
        commerceIndicator: 'internet',
        consumerAuthenticationInformation: null,
        paymentCardType: resolvedCardType || null,
        reason: 'Payer Authentication no devolvió datos CAVV/ECI/XID válidos.',
      })
    }

    return NextResponse.json({
      enabled: true,
      status: 'authenticated',
      commerceIndicator: commerceIndicatorForBrand(resolvedCardType),
      consumerAuthenticationInformation: normalizedConsumerAuth,
      paymentCardType: resolvedCardType || null,
    })
  } catch (error: any) {
    if (error instanceof CyberSourceApiError) {
      const isRiskEndpoint = String(error.endpoint || '').startsWith('/risk/v1/')
      const isUnavailable404 = isRiskEndpoint && error.status === 404
      if (isUnavailable404) {
        console.warn('[CyberSource] Payer auth endpoint unavailable for this merchant, continuing without 3DS.', {
          endpoint: error.endpoint,
          status: error.status,
          requestId: error.requestId,
          responseBody: error.responseBody,
        })
        return NextResponse.json({
          enabled: false,
          status: 'unavailable',
          commerceIndicator: 'internet',
          consumerAuthenticationInformation: null,
          requestId: error.requestId,
          endpoint: error.endpoint,
          reason: 'Payer Authentication no está habilitado para este merchant en este ambiente.',
        })
      }

      console.error('[CyberSource] Payer auth API error:', {
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
        { error: `CyberSource ${error.status}: ${reason}`, requestId: error.requestId, endpoint: error.endpoint },
        { status: 502 }
      )
    }
    console.error('[CyberSource] Payer auth error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
