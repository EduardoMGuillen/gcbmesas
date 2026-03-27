/**
 * Solo reembolsos / cancelación online. No tocar confirm-payment ni cybersource-sdk-direct (flujo de cobro con tarjeta).
 */
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
  attemptSuffix: string
}) {
  const base = `${params.paymentReference}-R-${params.entryId.slice(-8)}-${params.attemptSuffix}`
  const code = base.length > 50 ? base.slice(0, 50) : base
  return {
    clientReferenceInformation: {
      code,
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

function extractCaptureIdFromPaymentDetail(p: unknown): string | null {
  if (!p || typeof p !== 'object') return null
  const o = p as Record<string, unknown>
  const app = o.applicationInformation
  if (typeof o.id === 'string' && app && typeof app === 'object') {
    const t = String((app as Record<string, unknown>).applicationType || '').toUpperCase()
    if (t === 'CAPTURE' || t.includes('CAPTURE')) {
      return o.id.trim()
    }
  }
  const selfHref =
    typeof (o._links as { self?: { href?: string } } | undefined)?.self?.href === 'string'
      ? (o._links as { self: { href: string } }).self.href
      : typeof (o.links as { self?: { href?: string } } | undefined)?.self?.href === 'string'
        ? (o.links as { self: { href: string } }).self.href
        : undefined
  if (typeof selfHref === 'string') {
    const m = selfHref.match(/\/captures\/([^/?]+)/)
    if (m?.[1]) return m[1].trim()
  }
  return findCaptureIdInJson(p, 0)
}

function findCaptureIdInJson(obj: unknown, depth: number): string | null {
  if (depth > 22) return null
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

async function safeGetPayment(id: string): Promise<unknown | null> {
  const pid = id.trim()
  if (!pid) return null
  try {
    return await cyberSourceGet<unknown>(`/pts/v2/payments/${encodeURIComponent(pid)}`)
  } catch {
    return null
  }
}

async function safeGetTssTransaction(id: string): Promise<unknown | null> {
  const pid = id.trim()
  if (!pid) return null
  try {
    return await cyberSourceGet<unknown>(`/tss/v2/transactions/${encodeURIComponent(pid)}`)
  } catch {
    return null
  }
}

function uniqueStrings(ids: (string | undefined | null)[]): string[] {
  const out: string[] = []
  for (const x of ids) {
    const t = typeof x === 'string' ? x.trim() : ''
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

async function collectCaptureIdHints(paymentTx: string, captureId: string): Promise<string[]> {
  const hints: string[] = []
  const [dPay, dCap, tPay, tCap] = await Promise.all([
    paymentTx ? safeGetPayment(paymentTx) : Promise.resolve(null),
    captureId && captureId !== paymentTx ? safeGetPayment(captureId) : Promise.resolve(null),
    paymentTx ? safeGetTssTransaction(paymentTx) : Promise.resolve(null),
    captureId && captureId !== paymentTx ? safeGetTssTransaction(captureId) : Promise.resolve(null),
  ])
  for (const d of [dPay, dCap]) {
    if (!d) continue
    const c = extractCaptureIdFromPaymentDetail(d)
    if (c) hints.push(c)
    const j = findCaptureIdInJson(d, 0)
    if (j) hints.push(j)
  }
  for (const t of [tPay, tCap]) {
    if (!t) continue
    const j = findCaptureIdInJson(t, 0)
    if (j) hints.push(j)
  }
  return uniqueStrings(hints)
}

function pathCaptureRefund(captureId: string) {
  return `/pts/v2/captures/${encodeURIComponent(captureId.trim())}/refunds`
}

function pathPaymentRefund(paymentId: string) {
  return `/pts/v2/payments/${encodeURIComponent(paymentId.trim())}/refunds`
}

function isNotFound(e: unknown): boolean {
  return e instanceof CyberSourceApiError && e.status === 404
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Valor entre comillas para la query TSS (evita que `-` u otros caracteres rompan el filtro). */
function tssQueryValueForCode(ref: string): string {
  const t = ref.trim()
  if (!t) return '""'
  return `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function splitTransactionSummaries(data: unknown): unknown[] {
  const emb = (data as { _embedded?: { transactionSummaries?: unknown[] } })?._embedded
  const arr = emb?.transactionSummaries
  return Array.isArray(arr) ? arr : []
}

function extractIdsFromSummaries(summaries: unknown[]): string[] {
  const out: string[] = []
  for (const row of summaries) {
    if (!row || typeof row !== 'object') continue
    const id = typeof (row as { id?: unknown }).id === 'string' ? (row as { id: string }).id.trim() : ''
    if (id) out.push(id)
  }
  return out
}

/**
 * POST /tss/v2/searches; si hay searchId pero aún no hay resultados, hace poll con GET /tss/v2/searches/{searchId}.
 * Documentación: Transaction Search (query filters en clientReferenceInformation.code).
 */
async function runTssSearch(query: string): Promise<string[]> {
  const body = {
    save: false,
    timezone: 'UTC',
    offset: 0,
    limit: 50,
    sort: 'submitTimeUtc:desc',
    query,
  }
  try {
    let data = await cyberSourcePost<unknown>('/tss/v2/searches', body)
    let summaries = splitTransactionSummaries(data)
    const searchId =
      typeof (data as { searchId?: unknown })?.searchId === 'string'
        ? String((data as { searchId: string }).searchId).trim()
        : ''
    if (summaries.length === 0 && searchId) {
      for (let i = 0; i < 12; i++) {
        await sleepMs(400)
        data = await cyberSourceGet<unknown>(`/tss/v2/searches/${encodeURIComponent(searchId)}`)
        summaries = splitTransactionSummaries(data)
        if (summaries.length > 0) break
      }
    }
    return uniqueStrings(extractIdsFromSummaries(summaries))
  } catch {
    return []
  }
}

/**
 * Resuelve IDs de transacción conocidos por CyberSource a partir del paymentReference del log:
 * cobro principal, captura unified SDK (-CAP) y captura direct (-CAPTURE).
 */
async function searchTssTransactionIdsByPaymentReference(paymentReference: string): Promise<string[]> {
  const ref = paymentReference.trim()
  if (!ref) return []
  const qCap = `clientReferenceInformation.code:${tssQueryValueForCode(`${ref}-CAP`)}`
  const qCapture = `clientReferenceInformation.code:${tssQueryValueForCode(`${ref}-CAPTURE`)}`
  const qMain = `clientReferenceInformation.code:${tssQueryValueForCode(ref)}`
  const [capIds, captureIds, mainIds] = await Promise.all([
    runTssSearch(qCap),
    runTssSearch(qCapture),
    runTssSearch(qMain),
  ])
  return uniqueStrings([...capIds, ...captureIds, ...mainIds])
}

async function tryAllCaptureThenPayment(
  captureCandidates: string[],
  paymentCandidates: string[],
  makeBody: () => ReturnType<typeof buildRefundBody>
): Promise<RefundResp> {
  let lastErr: unknown = new Error('Reembolso no intentado')

  for (const cid of captureCandidates) {
    if (!cid) continue
    try {
      return await cyberSourcePost<RefundResp>(pathCaptureRefund(cid), makeBody())
    } catch (e) {
      lastErr = e
      if (!isNotFound(e)) throw e
    }
  }

  for (const pid of paymentCandidates) {
    if (!pid) continue
    try {
      return await cyberSourcePost<RefundResp>(pathPaymentRefund(pid), makeBody())
    } catch (e) {
      lastErr = e
      if (!isNotFound(e)) throw e
    }
  }

  throw lastErr
}

/**
 * 1) Un solo intento con captureId del log (rápido si es correcto).
 * 2) Si 404: búsqueda TSS por clientReference (ref, -CAP, -CAPTURE), GET /payments y TSS por id; reintenta captura y luego /payments/refunds.
 */
export async function refundCyberSourceCaptureForEntry(params: {
  captureId: string
  currency: string
  refundAmount: string
  paymentReference: string
  entryId: string
  paymentTransactionId?: string | null
}) {
  const captureId = params.captureId.trim()
  const paymentTx = params.paymentTransactionId?.trim() || ''

  let attempt = 0
  const makeBody = () =>
    buildRefundBody({
      paymentReference: params.paymentReference,
      entryId: params.entryId,
      refundAmount: params.refundAmount,
      currency: params.currency,
      attemptSuffix: `${++attempt}-${Date.now().toString(36)}`,
    })

  try {
    return await cyberSourcePost<RefundResp>(pathCaptureRefund(captureId), makeBody())
  } catch (firstErr) {
    if (!isNotFound(firstErr)) {
      throw firstErr
    }

    const [tssIds, hints] = await Promise.all([
      searchTssTransactionIdsByPaymentReference(params.paymentReference),
      collectCaptureIdHints(paymentTx, captureId),
    ])
    const captureCandidates = uniqueStrings([...tssIds, ...hints, captureId])
    const paymentCandidates = uniqueStrings([...tssIds, paymentTx, captureId])

    return tryAllCaptureThenPayment(captureCandidates, paymentCandidates, makeBody)
  }
}
