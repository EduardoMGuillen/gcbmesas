import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type PublicEventChannel = 'lcb' | 'cbtickets'

export { isPublicFreeCoverOnly, hasOnlineTicketSale } from '@/lib/public-event-pricing'

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
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      date: { gte: now },
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
  const entriesSoldSum = await getEventSoldEntriesCount(event.id)
  return { ...event, entriesSoldSum }
}
