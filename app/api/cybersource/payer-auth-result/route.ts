import { NextRequest, NextResponse } from 'next/server'
import { CyberSourceApiError, pickNumericEciFromConsumerAuth } from '@/lib/cybersource'
import { cyberSourcePayerAuthValidateViaSdk } from '@/lib/cybersource-sdk-direct'
import { formatPurchaseErrorForUser } from '@/lib/purchase-user-friendly-error'
import { scheduleOnlinePaymentRejectionLog } from '@/lib/online-payment-rejection'

function logPayerAuthResultReject(
  httpStatus: number,
  rawMessage: string,
  ctx: { eventId?: string | null; paymentReference?: string | null; clientEmail?: string | null } = {}
) {
  const friendly = formatPurchaseErrorForUser(rawMessage)
  scheduleOnlinePaymentRejectionLog({
    source: 'payer-auth-result',
    httpStatus,
    rawMessage,
    friendlyMessage: friendly,
    eventId: ctx.eventId ?? undefined,
    paymentReference: ctx.paymentReference ?? undefined,
    clientEmail: ctx.clientEmail ?? undefined,
  })
  return friendly
}

function commerceIndicatorForBrand(cardType: string): string {
  const t = String(cardType || '').toLowerCase()
  if (t === '001' || t.includes('visa')) return 'vbv'
  if (t === '002' || t.includes('mastercard') || t.includes('master')) return 'spa'
  if (t === '003' || t.includes('amex') || t.includes('american')) return 'aesk'
  return 'aesk'
}

function normalizeConsumerAuthenticationInformation(raw: any) {
  if (!raw || typeof raw !== 'object') return null
  const cryptogram = raw.cavv || raw.authenticationValue || raw.ucafAuthenticationData
  const normalized = {
    authenticationTransactionId: raw.authenticationTransactionId ? String(raw.authenticationTransactionId) : undefined,
    cavv: cryptogram ? String(cryptogram) : undefined,
    xid: raw.xid ? String(raw.xid) : undefined,
    eci: pickNumericEciFromConsumerAuth(raw),
    ucafCollectionIndicator: raw.ucafCollectionIndicator ? String(raw.ucafCollectionIndicator) : undefined,
    ucafAuthenticationData: (raw.ucafAuthenticationData || raw.authenticationValue || raw.cavv)
      ? String(raw.ucafAuthenticationData || raw.authenticationValue || raw.cavv)
      : undefined,
    acsTransactionId: raw.acsTransactionId ? String(raw.acsTransactionId) : undefined,
    threeDSServerTransactionId: raw.threeDSServerTransactionId ? String(raw.threeDSServerTransactionId) : undefined,
    directoryServerTransactionId: raw.directoryServerTransactionId
      ? String(raw.directoryServerTransactionId)
      : undefined,
  }
  const hasAny = Object.values(normalized).some((v) => Boolean(v))
  return hasAny ? normalized : null
}

/**
 * Retrieve the final 3DS authentication result after a cardholder has completed
 * an ACS challenge.  Called by the frontend immediately after it receives the
 * CYBS_3DS_COMPLETE postMessage from the step-up iframe.
 *
 * POST body: { authenticationTransactionId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authenticationTransactionId, paymentCardType } = body

    if (!authenticationTransactionId) {
      const friendly = logPayerAuthResultReject(400, 'authenticationTransactionId requerido.')
      return NextResponse.json({ error: friendly }, { status: 400 })
    }

    const result = await cyberSourcePayerAuthValidateViaSdk({
      authenticationTransactionId: String(authenticationTransactionId),
    })

    const normalized = normalizeConsumerAuthenticationInformation(result?.consumerAuthenticationInformation)

    if (!normalized) {
      console.warn('[CyberSource] payer-auth-result: no CAVV/ECI in authentication-results response', {
        authenticationTransactionId,
        status: result?.status,
        rawConsumerAuth: result?.consumerAuthenticationInformation,
      })
      const rawFail = 'El resultado del challenge 3DS no contiene datos CAVV/ECI válidos.'
      logPayerAuthResultReject(200, rawFail)
      return NextResponse.json({
        status: 'failed',
        consumerAuthenticationInformation: null,
        reason: 'El resultado del challenge 3DS no contiene datos CAVV/ECI válidos.',
      })
    }

    return NextResponse.json({
      status: 'authenticated',
      commerceIndicator: commerceIndicatorForBrand(paymentCardType || ''),
      consumerAuthenticationInformation: normalized,
      paymentCardType: paymentCardType || null,
    })
  } catch (error: any) {
    if (error instanceof CyberSourceApiError) {
      console.error('[CyberSource] payer-auth-result API error:', {
        endpoint: error.endpoint,
        status: error.status,
        requestId: error.requestId,
        responseBody: error.responseBody,
      })
      const rawCs = `CyberSource ${error.status}: ${error.message}`
      const friendly = logPayerAuthResultReject(502, rawCs)
      return NextResponse.json(
        {
          error: friendly,
          requestId: error.requestId,
        },
        { status: 502 }
      )
    }
    console.error('[CyberSource] payer-auth-result unexpected error:', error)
    const friendly = logPayerAuthResultReject(500, error?.message || 'Error interno')
    return NextResponse.json({ error: friendly }, { status: 500 })
  }
}
