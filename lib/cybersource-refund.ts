import type { Log } from '@prisma/client'
import { prisma } from './prisma'
import { cyberSourcePost, cyberSourceGet, CyberSourceApiError } from './cybersource'

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

function buildRefundBody(params: {
  paymentReference: string
  entryId: string
  refundAmount: string
  currency: string
}) {
  return {
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
}

type RefundResp = { id?: string; status?: string }

/** Busca un id de captura en la respuesta GET /pts/v2/payments/{id} (HAL, enlaces, etc.). */
function extractCaptureIdFromPaymentDetail(p: unknown): string | null {
  if (!p || typeof p !== 'object') return null
  const o = p as Record<string, unknown>
  if (typeof o.id === 'string' && typeof o.applicationInformation === 'object' && o.applicationInformation) {
    const app = o.applicationInformation as Record<string, unknown>
    if (String(app.applicationType || '').toUpperCase() === 'CAPTURE') {
      return o.id.trim()
    }
  }
  const selfHref =
    (o._links as Record<string, unknown> | undefined)?.self &&
    typeof (o._links as { self?: { href?: string } }).self?.href === 'string'
      ? (o._links as { self: { href: string } }).self.href
      : undefined
  if (typeof selfHref === 'string') {
    const m = selfHref.match(/\/captures\/([^/?]+)/)
    if (m?.[1]) return m[1].trim()
  }
  return findCaptureIdInJson(p, 0)
}

function findCaptureIdInJson(obj: unknown, depth: number): string | null {
  if (depth > 18) return null
  if (typeof obj === 'string') {
    const m = obj.match(/\/pts\/v2\/captures\/([^/?\s]+)/)
    return m?.[1]?.trim() ?? null
  }
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const r = findCaptureIdInJson(x, depth + 1)
      if (r) return r
    }
  }
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj)) {
      const r = findCaptureIdInJson(v, depth + 1)
      if (r) return r
    }
  }
  return null
}

async function tryResolveCaptureIdFromPayment(paymentId: string): Promise<string | null> {
  const pid = paymentId.trim()
  if (!pid) return null
  try {
    const detail = await cyberSourceGet<unknown>(`/pts/v2/payments/${encodeURIComponent(pid)}`)
    return extractCaptureIdFromPaymentDetail(detail)
  } catch {
    return null
  }
}

function pathCaptureRefund(captureId: string) {
  return `/pts/v2/captures/${encodeURIComponent(captureId.trim())}/refunds`
}

function pathPaymentRefund(paymentId: string) {
  return `/pts/v2/payments/${encodeURIComponent(paymentId.trim())}/refunds`
}

/**
 * Reembolso CyberSource:
 * - Captura separada: POST /pts/v2/captures/{captureId}/refunds
 * - Cobro en una sola llamada /payments (auth+capture juntos): POST /pts/v2/payments/{paymentId}/refunds
 * Si el log guardó mal el id, con 404 se hace GET /pts/v2/payments/{id} para resolver el id de captura y se reintenta.
 */
export async function refundCyberSourceCaptureForEntry(params: {
  captureId: string
  currency: string
  refundAmount: string
  paymentReference: string
  entryId: string
  paymentTransactionId?: string | null
}) {
  const body = buildRefundBody({
    paymentReference: params.paymentReference,
    entryId: params.entryId,
    refundAmount: params.refundAmount,
    currency: params.currency,
  })

  const captureId = params.captureId.trim()
  const paymentTx = params.paymentTransactionId?.trim() || ''

  const tryCapture = async (id: string) =>
    cyberSourcePost<RefundResp>(pathCaptureRefund(id), body)

  const tryPayment = async (id: string) =>
    cyberSourcePost<RefundResp>(pathPaymentRefund(id), body)

  const tryPaymentIdsUnique = new Set<string>()
  if (paymentTx) tryPaymentIdsUnique.add(paymentTx)
  if (captureId) tryPaymentIdsUnique.add(captureId)
  const uniquePaymentIds = Array.from(tryPaymentIdsUnique)

  try {
    return await tryCapture(captureId)
  } catch (firstErr) {
    if (!(firstErr instanceof CyberSourceApiError) || firstErr.status !== 404) {
      throw firstErr
    }

    if (paymentTx) {
      const resolved = await tryResolveCaptureIdFromPayment(paymentTx)
      if (resolved && resolved !== captureId) {
        try {
          return await tryCapture(resolved)
        } catch (e2) {
          if (!(e2 instanceof CyberSourceApiError) || e2.status !== 404) {
            throw e2
          }
        }
      }
    }

    const resolvedFromCapture = captureId ? await tryResolveCaptureIdFromPayment(captureId) : null
    if (resolvedFromCapture && resolvedFromCapture !== captureId) {
      try {
        return await tryCapture(resolvedFromCapture)
      } catch (e3) {
        if (!(e3 instanceof CyberSourceApiError) || e3.status !== 404) {
          throw e3
        }
      }
    }

    let lastErr: unknown = firstErr
    for (const paymentId of uniquePaymentIds) {
      try {
        return await tryPayment(paymentId)
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
