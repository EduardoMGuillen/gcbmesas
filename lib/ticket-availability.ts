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

/**
 * Días calendario que faltan para el evento (0 si es hoy o ya pasó).
 * La fecha del evento se lee en UTC (se guarda como fecha a mediodía UTC); "hoy" se toma en hora de Honduras.
 */
export function daysUntil(eventDateIso: string, now: Date): number {
  const ev = new Date(eventDateIso)
  const eventDay = Date.UTC(ev.getUTCFullYear(), ev.getUTCMonth(), ev.getUTCDate())
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const today = Date.UTC(get('year'), get('month') - 1, get('day'))
  return Math.max(0, Math.round((eventDay - today) / 86_400_000))
}
