import type { Log } from '@prisma/client'
import { prisma } from './prisma'
import { cyberSourcePost, CyberSourceApiError } from './cybersource'

/** Ventas recientes online; evita $queryRaw (diferencias json/jsonb / drivers). */
const ONLINE_SALE_LOG_SCAN = 800

/** Reparte el total en centavos para que la suma de líneas coincida con totalPrice. */
export function perEntryRefundAmount(totalPrice: number, index: number, totalEntries: number): string {
  const totalCents = Math.round(Number(totalPrice) * 100)
  if (totalEntries <= 0 || totalCents < 0) return '0.00'
  const baseCents = Math.floor(totalCents / totalEntries)
  const remainder = totalCents - baseCents * totalEntries
  const cents = baseCents + (index < remainder ? 1 : 0)
  return (cents / 100).toFixed(2)
}

export async function findOnlineSaleLogForEntry(entryId: string): Promise<Log | null> {
  const candidates = await prisma.log.findMany({
    where: {
      action: 'ENTRY_SOLD',
      details: {
        path: ['source'],
        equals: 'online_cybersource',
      },
    },
    orderBy: { createdAt: 'desc' },
    take: ONLINE_SALE_LOG_SCAN,
  })
  for (const log of candidates) {
    const d = log.details as Record<string, unknown> | null
    const ids = d?.entryIds
    if (Array.isArray(ids) && ids.includes(entryId)) return log
  }
  return null
}

/**
 * Reembolso según la API de CyberSource:
 * - Captura separada: POST /pts/v2/captures/{id}/refunds
 * - Cobro en una sola llamada /payments (auth+capture juntos): POST /pts/v2/payments/{id}/refunds
 * Si el id guardado era el de pago y se llama a /captures, responde 404; se reintenta con /payments.
 */
export async function refundCyberSourceCaptureForEntry(params: {
  captureId: string
  currency: string
  refundAmount: string
  paymentReference: string
  entryId: string
  /** ID del pago original (cybersourceTransactionId); necesario como fallback si el cobro no usó captura aparte. */
  paymentTransactionId?: string | null
}) {
  const body = {
    clientReferenceInformation: {
      code: `${params.paymentReference}-REFUND-${params.entryId.slice(-8)}`,
    },
    orderInformation: {
      amountDetails: {
        totalAmount: params.refundAmount,
        currency: params.currency,
        taxAmount: '0.00',
      },
    },
  }

  type RefundResp = { id?: string; status?: string }

  try {
    return await cyberSourcePost<RefundResp>(
      `/pts/v2/captures/${encodeURIComponent(params.captureId.trim())}/refunds`,
      body
    )
  } catch (firstErr) {
    if (!(firstErr instanceof CyberSourceApiError) || firstErr.status !== 404) {
      throw firstErr
    }

    const paymentIds = [params.paymentTransactionId?.trim(), params.captureId.trim()].filter(
      (x): x is string => Boolean(x)
    )
    const uniquePaymentIds = Array.from(new Set(paymentIds))

    let lastErr: unknown = firstErr
    for (const paymentId of uniquePaymentIds) {
      try {
        return await cyberSourcePost<RefundResp>(
          `/pts/v2/payments/${encodeURIComponent(paymentId)}/refunds`,
          body
        )
      } catch (err) {
        lastErr = err
        if (!(err instanceof CyberSourceApiError) || err.status !== 404) {
          throw err
        }
      }
    }
    throw lastErr
  }
}
