import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CyberSourceApiError, pickNumericEciFromConsumerAuth } from '@/lib/cybersource'
import {
  cyberSourcePayerAuthSetupViaSdk,
  cyberSourcePayerAuthEnrollViaSdk,
  cyberSourcePayerAuthValidateViaSdk,
} from '@/lib/cybersource-sdk-direct'
import { formatPurchaseErrorForUser } from '@/lib/purchase-user-friendly-error'
import { scheduleOnlinePaymentRejectionLog } from '@/lib/online-payment-rejection'

function logPayerAuthReject(
  httpStatus: number,
  rawMessage: string,
  ctx: { eventId?: string | null; paymentReference?: string | null; clientEmail?: string | null }
) {
  const friendly = formatPurchaseErrorForUser(rawMessage)
  scheduleOnlinePaymentRejectionLog({
    source: 'payer-auth',
    httpStatus,
    rawMessage,
    friendlyMessage: friendly,
    eventId: ctx.eventId ?? undefined,
    paymentReference: ctx.paymentReference ?? undefined,
    clientEmail: ctx.clientEmail ?? undefined,
  })
  return friendly
}

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
  const cryptogram = raw.cavv || raw.authenticationValue || raw.ucafAuthenticationData
  const normalized = {
    authenticationTransactionId: raw.authenticationTransactionId ? String(raw.authenticationTransactionId) : undefined,
    // Mastercard and some 3DS2 responses use authenticationValue/UCAF instead of cavv.
    cavv: cryptogram ? String(cryptogram) : undefined,
    xid: raw.xid ? String(raw.xid) : undefined,
    // Never map ecommerceIndicator (vbv/spa/aesk) into eci — Amex/Visa need numeric ECI (e.g. 05) for the acquirer.
    eci: pickNumericEciFromConsumerAuth(raw),
    // Mastercard requires this field in authorization when available.
    ucafCollectionIndicator: raw.ucafCollectionIndicator ? String(raw.ucafCollectionIndicator) : undefined,
    // Mastercard can require UCAF auth data explicitly in payment auth payload.
    ucafAuthenticationData: (raw.ucafAuthenticationData || raw.authenticationValue || raw.cavv)
      ? String(raw.ucafAuthenticationData || raw.authenticationValue || raw.cavv)
      : undefined,
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
  let stash: { eventId?: string; paymentReference?: string; clientEmail?: string } = {}
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
      browserInfo,
    } = body

    stash.eventId = eventId ? String(eventId) : undefined
    stash.paymentReference = paymentReference ? String(paymentReference) : undefined
    stash.clientEmail = clientEmail ? String(clientEmail).trim() : undefined

    if (!paymentReference || !eventId || !numberOfEntries || !transientToken) {
      const friendly = logPayerAuthReject(400, 'Datos incompletos para validación 3DS.', {
        eventId,
        paymentReference,
        clientEmail,
      })
      return NextResponse.json({ error: friendly }, { status: 400 })
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
      const friendly = logPayerAuthReject(404, 'No se encontró la orden pendiente para Payer Auth.', {
        eventId,
        paymentReference,
        clientEmail,
      })
      return NextResponse.json({ error: friendly }, { status: 404 })
    }

    const pendingDetails = pendingLog.details as any
    const event = await prisma.event.findFirst({
      where: { id: pendingDetails?.eventId || eventId, isActive: true },
    })
    if (!event || !event.paypalPrice) {
      const friendly = logPayerAuthReject(404, 'Evento no encontrado o sin precio online.', {
        eventId,
        paymentReference,
        clientEmail: String(clientEmail || pendingDetails?.clientEmail || ''),
      })
      return NextResponse.json({ error: friendly }, { status: 404 })
    }

    stash.eventId = event.id

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

    stash.clientEmail = resolvedBillTo.email

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
      const rawRef = 'No se recibió referenceId de Payer Auth setup.'
      logPayerAuthReject(200, rawRef, {
        eventId: event.id,
        paymentReference,
        clientEmail: resolvedBillTo.email,
      })
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
      browserInfo: browserInfo || undefined,
    })

    const caiRaw = authenticationResponse?.consumerAuthenticationInformation || {}
    console.log('[CyberSource] payer-auth enrollment response:', {
      topLevelKeys: Object.keys(authenticationResponse || {}),
      status: authenticationResponse?.status,
      errorInfo: authenticationResponse?.errorInformation,
      cai: {
        keys: Object.keys(caiRaw),
        veresEnrolled: caiRaw.veresEnrolled,
        paresStatus: caiRaw.paresStatus,
        ecommerceIndicator: caiRaw.ecommerceIndicator,
        specificationVersion: caiRaw.specificationVersion,
        directoryServerErrorCode: caiRaw.directoryServerErrorCode,
        directoryServerErrorDescription: caiRaw.directoryServerErrorDescription,
        hasCavv: Boolean(caiRaw.cavv),
        hasEci: Boolean(caiRaw.eci),
        hasAuthTxnId: Boolean(caiRaw.authenticationTransactionId),
      },
    })

    let normalizedConsumerAuth = normalizeConsumerAuthenticationInformation(
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

    // For frictionless 3DS2, CAVV comes from enrollment. Only call validate for challenge flows.
    // If directoryServerErrorCode is present, the 3DS2 directory server rejected the auth —
    // this is a merchant configuration issue (merchant not registered for 3DS2 with card network).
    const enrollmentCai = authenticationResponse?.consumerAuthenticationInformation || {}
    const enrollmentCavv = enrollmentCai.cavv
    const enrollmentDsError = enrollmentCai.directoryServerErrorCode
    const enrollmentAuthTxnId = enrollmentCai.authenticationTransactionId

    if (enrollmentDsError) {
      console.warn('[CyberSource] payer-auth: directory server error in enrollment', {
        directoryServerErrorCode: enrollmentDsError,
        directoryServerErrorDescription: enrollmentCai.directoryServerErrorDescription,
        veresEnrolled: enrollmentCai.veresEnrolled,
      })
    }

    const brand = String(resolvedCardType || '').toLowerCase()
    const isAmex =
      brand === '003' || brand.includes('amex') || brand.includes('american') || brand.includes('ax')

    // Para VISA/MC seguimos exigiendo CAVV; para AMEX aceptamos respuesta 3DS siempre
    // que al menos traiga ECI/XID, porque algunos emisores no devuelven cavv estándar.
    const hasCavv = Boolean(normalizedConsumerAuth?.cavv)
    const hasEciOrXid = Boolean(
      (normalizedConsumerAuth as any)?.eci || (normalizedConsumerAuth as any)?.xid
    )

    if (!hasCavv && !(isAmex && hasEciOrXid)) {
      const raw3ds = enrollmentDsError
        ? `Error en servidor de directorio 3DS (${enrollmentDsError}): ${
            enrollmentCai.directoryServerErrorDescription ||
            'El merchant puede no estar registrado para 3DS2 en el ambiente de prueba.'
          }`
        : 'Payer Authentication no devolvió datos 3DS suficientes (CAVV/ECI/XID). La tarjeta puede no soportar 3DS en este ambiente.'
      logPayerAuthReject(200, raw3ds, {
        eventId: event.id,
        paymentReference,
        clientEmail: resolvedBillTo.email,
      })
      return NextResponse.json({
        enabled: true,
        status: 'failed',
        commerceIndicator: 'internet',
        consumerAuthenticationInformation: null,
        paymentCardType: resolvedCardType || null,
        reason: enrollmentDsError
          ? `Error en servidor de directorio 3DS (${enrollmentDsError}): ${
              enrollmentCai.directoryServerErrorDescription ||
              'El merchant puede no estar registrado para 3DS2 en el ambiente de prueba.'
            }`
          : 'Payer Authentication no devolvió datos 3DS suficientes (CAVV/ECI/XID). La tarjeta puede no soportar 3DS en este ambiente.',
        directoryServerErrorCode: enrollmentDsError || null,
        veresEnrolled: enrollmentCai.veresEnrolled || null,
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
      const rawCs = `CyberSource ${error.status}: ${reason}`
      const friendly = logPayerAuthReject(502, rawCs, stash)
      return NextResponse.json(
        {
          error: friendly,
          requestId: error.requestId,
          endpoint: error.endpoint,
        },
        { status: 502 }
      )
    }
    console.error('[CyberSource] Payer auth error:', error)
    const friendly = logPayerAuthReject(500, error?.message || 'Error interno', stash)
    return NextResponse.json({ error: friendly }, { status: 500 })
  }
}
