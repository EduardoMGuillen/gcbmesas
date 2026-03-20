import { NextRequest, NextResponse } from 'next/server'
import { CyberSourceApiError } from '@/lib/cybersource'
import { cyberSourcePayerAuthValidateViaSdk } from '@/lib/cybersource-sdk-direct'

function normalizeConsumerAuthenticationInformation(raw: any) {
  if (!raw || typeof raw !== 'object') return null
  const normalized = {
    authenticationTransactionId: raw.authenticationTransactionId ? String(raw.authenticationTransactionId) : undefined,
    cavv: raw.cavv ? String(raw.cavv) : undefined,
    xid: raw.xid ? String(raw.xid) : undefined,
    eci: raw.eci ? String(raw.eci) : undefined,
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
    const { authenticationTransactionId } = body

    if (!authenticationTransactionId) {
      return NextResponse.json({ error: 'authenticationTransactionId requerido.' }, { status: 400 })
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
      return NextResponse.json({
        status: 'failed',
        consumerAuthenticationInformation: null,
        reason: 'El resultado del challenge 3DS no contiene datos CAVV/ECI válidos.',
      })
    }

    return NextResponse.json({
      status: 'authenticated',
      commerceIndicator: 'aesk',
      consumerAuthenticationInformation: normalized,
    })
  } catch (error: any) {
    if (error instanceof CyberSourceApiError) {
      console.error('[CyberSource] payer-auth-result API error:', {
        endpoint: error.endpoint,
        status: error.status,
        requestId: error.requestId,
        responseBody: error.responseBody,
      })
      return NextResponse.json(
        { error: `CyberSource ${error.status}: ${error.message}`, requestId: error.requestId },
        { status: 502 }
      )
    }
    console.error('[CyberSource] payer-auth-result unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
