import { prisma } from '@/lib/prisma'

export type PublicEventChannel = 'lcb' | 'cbtickets'

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
  return prisma.event.findMany({
    where: {
      isActive: true,
      paypalPrice: { not: null },
      date: { gte: now },
      ...channelWhere(channel),
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
      venueName: true,
      venueAddress: true,
      _count: { select: { entries: true } },
    },
  })
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
