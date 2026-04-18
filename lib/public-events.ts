import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type PublicEventChannel = 'lcb' | 'cbtickets'

export { isPublicFreeCoverOnly, hasOnlineTicketSale } from '@/lib/public-event-pricing'

/** Zona del local (venta en línea hasta las 02:00 del día siguiente al del evento). */
const VENUE_TIMEZONE = 'America/Tegucigalpa'
const PUBLIC_SALES_END_HOUR = 2

/**
 * Fin de venta pública: 02:00 (Honduras) del día calendario siguiente al `date` del evento en esa misma zona.
 * America/Tegucigalpa es UTC−6 sin DST; evita que a ~18:00–19:00 HN desaparezcan eventos “de hoy”
 * cuando el servidor usa medianoche UTC.
 */
export function isEventWithinPublicSalesWindow(eventDate: Date, now: Date = new Date()): boolean {
  const { y, m, d } = getVenueCalendarYMD(eventDate, VENUE_TIMEZONE)
  const { y: y2, m: m2, d: d2 } = addOneUtcCalendarDay(y, m, d)
  const salesEndUtc = hondurasWallClockToUtc(y2, m2, d2, PUBLIC_SALES_END_HOUR, 0)
  return now.getTime() < salesEndUtc.getTime()
}

function getVenueCalendarYMD(iso: Date, timeZone: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(iso)
  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)
  return { y, m, d }
}

function addOneUtcCalendarDay(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/** Medianoche local HN → instante UTC (UTC−6 fijo). */
function hondurasWallClockToUtc(y: number, m: number, d: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(y, m - 1, d, hour + 6, minute, 0, 0))
}

/** Límite inferior en BD: no cargar eventos muy viejos; el filtro fino es isEventWithinPublicSalesWindow. */
const LISTING_DB_LOOKBACK_MS = 45 * 24 * 60 * 60 * 1000

async function getEventSoldEntriesCount(eventId: string): Promise<number> {
  const agg = await prisma.entry.aggregate({
    where: { eventId, status: { not: 'CANCELLED' } },
    _sum: { numberOfEntries: true },
  })
  return Number(agg._sum.numberOfEntries ?? 0)
}

function channelWhere(channel: PublicEventChannel) {
  if (channel === 'lcb') return { publishOnLcb: true }
  return { publishOnCbtickets: true }
}

export async function getPublicEvents(channel: PublicEventChannel = 'lcb') {
  const listingMinDate = new Date(Date.now() - LISTING_DB_LOOKBACK_MS)
  const eventsRaw = await prisma.event.findMany({
    where: {
      isActive: true,
      date: { gte: listingMinDate },
      ...channelWhere(channel),
      OR: [
        { paypalPrice: { gt: 0 } },
        {
          AND: [
            { coverPrice: { equals: new Prisma.Decimal(0) } },
            { OR: [{ paypalPrice: null }, { paypalPrice: { equals: new Prisma.Decimal(0) } }] },
          ],
        },
      ],
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      name: true,
      date: true,
      description: true,
      coverImage: true,
      coverPrice: true,
      paypalPrice: true,
      maxEntries: true,
      venueName: true,
      venueAddress: true,
    },
  })

  const now = new Date()
  const events = eventsRaw.filter((e) => isEventWithinPublicSalesWindow(e.date, now))

  const eventIds = events.map((e) => e.id)
  if (!eventIds.length) return events.map((e) => ({ ...e, entriesSoldSum: 0 }))

  const soldByEvent = await prisma.entry.groupBy({
    by: ['eventId'],
    where: {
      eventId: { in: eventIds },
      status: { not: 'CANCELLED' },
    },
    _sum: { numberOfEntries: true },
  })

  const soldMap = new Map<string, number>()
  for (const row of soldByEvent) {
    soldMap.set(row.eventId, Number(row._sum.numberOfEntries ?? 0))
  }

  return events.map((e) => ({
    ...e,
    entriesSoldSum: soldMap.get(e.id) ?? 0,
  }))
}

export async function getPublicEventById(id: string, opts?: { channel?: PublicEventChannel }) {
  const channel: PublicEventChannel = opts?.channel ?? 'lcb'
  const event = await prisma.event.findFirst({
    where: {
      id,
      isActive: true,
      ...channelWhere(channel),
    },
    select: {
      id: true,
      name: true,
      date: true,
      description: true,
      coverImage: true,
      coverPrice: true,
      paypalPrice: true,
      maxEntries: true,
      venueName: true,
      venueAddress: true,
    },
  })
  if (!event) return null
  if (!isEventWithinPublicSalesWindow(event.date)) return null
  const entriesSoldSum = await getEventSoldEntriesCount(event.id)
  return { ...event, entriesSoldSum }
}
