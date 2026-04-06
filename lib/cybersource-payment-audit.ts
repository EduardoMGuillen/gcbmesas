import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCyberSourceEnvLabel } from '@/lib/cybersource'

export type CyberSourcePaymentAuditOutcome =
  | 'SUCCESS'
  | 'MOCK'
  | 'REJECTED_AUTH'
  | 'REJECTED_CAPTURE'
  | 'REJECTED_NO_CAPTURE_ID'

function previewToken(value: string, head = 8, tail = 4): string {
  const v = String(value || '').trim()
  if (!v) return ''
  if (v.length <= head + tail + 1) return v
  return `${v.slice(0, head)}…${v.slice(-tail)}`
}

/** Resumen para revisión con banco/adquirente sin persistir CAVV/XID completos (solo longitud + vista truncada). */
export function summarizeThreeDsForAudit(auth: Record<string, string> | null | undefined) {
  if (!auth || typeof auth !== 'object') {
    return {
      used: false as const,
    }
  }
  const cavv = auth.cavv || ''
  const xid = auth.xid || ''
  return {
    used: true as const,
    eciRaw: auth.eciRaw ?? null,
    paresStatus: auth.paresStatus ?? null,
    xid: xid
      ? { length: xid.length, preview: previewToken(xid, 10, 6) }
      : null,
    cavv: cavv
      ? { length: cavv.length, preview: previewToken(cavv, 6, 4) }
      : null,
    ucafCollectionIndicator: auth.ucafCollectionIndicator ?? null,
    hasUcafAuthenticationData: Boolean(auth.ucafAuthenticationData),
    acsTransactionId: auth.acsTransactionId ?? null,
    threeDSServerTransactionId: auth.threeDSServerTransactionId ?? null,
    directoryServerTransactionId: auth.directoryServerTransactionId ?? null,
    fieldKeys: Object.keys(auth).sort(),
  }
}

export async function persistCyberSourcePaymentAudit(params: {
  outcome: CyberSourcePaymentAuditOutcome
  paymentReference: string
  eventId: string
  eventName?: string | null
  clientEmail?: string | null
  amount: string
  currency: string
  paymentMode: 'unified' | 'direct'
  mock: boolean
  commerceIndicatorFromClient?: string | null
  commerceIndicatorResolved: string
  paymentCardType?: string | null
  hadRawConsumerAuthFromClient: boolean
  normalizedConsumerAuth: Record<string, string> | null
  cybersourceDecision?: string | null
  cybersourceReasonCode?: string | null
  transactionId?: string | null
  captureId?: string | null
  captureStatus?: string | null
  extraNote?: string | null
}): Promise<void> {
  try {
    await prisma.log.create({
      data: {
        action: 'CYBERSOURCE_PAYMENT_AUDIT',
        details: {
          type: 'CYBERSOURCE_PAYMENT_AUDIT',
          outcome: params.outcome,
          at: new Date().toISOString(),
          cybersourceEnv: getCyberSourceEnvLabel(),
          paymentReference: params.paymentReference,
          eventId: params.eventId,
          eventName: params.eventName ?? null,
          clientEmail: params.clientEmail ?? null,
          amount: params.amount,
          currency: params.currency,
          paymentMode: params.paymentMode,
          mock: params.mock,
          commerceIndicatorFromClient: params.commerceIndicatorFromClient ?? null,
          commerceIndicatorResolved: params.commerceIndicatorResolved,
          paymentCardType: params.paymentCardType ?? null,
          hadRawConsumerAuthFromClient: params.hadRawConsumerAuthFromClient,
          threeDs: summarizeThreeDsForAudit(params.normalizedConsumerAuth),
          cybersource: {
            decision: params.cybersourceDecision ?? null,
            reasonCode: params.cybersourceReasonCode ?? null,
            transactionId: params.transactionId ?? null,
            captureId: params.captureId ?? null,
            captureStatus: params.captureStatus ?? null,
          },
          note: params.extraNote ?? null,
        },
      },
    })
    revalidatePath('/admin/logs')
  } catch (e) {
    console.error('[CyberSource] persistCyberSourcePaymentAudit failed (non-fatal):', e)
  }
}
