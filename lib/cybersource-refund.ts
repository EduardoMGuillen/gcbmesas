import type { Log } from '@prisma/client'
import { prisma } from './prisma'
import { cyberSourcePost } from './cybersource'

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
  const rows = await prisma.$queryRaw<Log[]>`
    SELECT * FROM "logs"
    WHERE "action" = 'ENTRY_SOLD'::"LogAction"
    AND details->>'source' = 'online_cybersource'
    AND details->'entryIds' @> ${JSON.stringify([entryId])}::jsonb
    ORDER BY "createdAt" DESC
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function refundCyberSourceCaptureForEntry(params: {
  captureId: string
  currency: string
  refundAmount: string
  paymentReference: string
  entryId: string
}) {
  return cyberSourcePost<{
    id?: string
    status?: string
  }>(`/pts/v2/captures/${encodeURIComponent(params.captureId)}/refunds`, {
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
  })
}
