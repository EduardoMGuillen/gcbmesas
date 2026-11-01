import { isPublicFreeCoverOnly } from '@/lib/public-event-pricing'

export type TicketAvailability = 'free' | 'available' | 'last' | 'soldout'

/** A partir de este porcentaje del cupo vendido se muestra "Últimas entradas". */
const LAST_TICKETS_RATIO = 0.85

export function getTicketAvailability(e: {
  coverPrice: number
  paypalPrice: number | string | null
  maxEntries: number | null
  entriesSoldSum: number
}): TicketAvailability {
  if (isPublicFreeCoverOnly(e.coverPrice, e.paypalPrice)) return 'free'
  if (e.maxEntries == null || e.maxEntries < 1) return 'available'
  const sold = Number(e.entriesSoldSum ?? 0)
  if (sold >= e.maxEntries) return 'soldout'
  if (sold >= e.maxEntries * LAST_TICKETS_RATIO) return 'last'
  return 'available'
}
