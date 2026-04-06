import { prisma } from '@/lib/prisma'

async function getEventSoldEntriesCount(eventId: string): Promise<number> {
  const agg = await prisma.entry.aggregate({
    where: { eventId, status: { not: 'CANCELLED' } },
    _sum: { numberOfEntries: true },
  })
  return Number(agg._sum.numberOfEntries ?? 0)
}

export async function getPublicEvents() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return prisma.event.findMany({
    where: {
      isActive: true,
      paypalPrice: { not: null },
      date: { gte: now },
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
      _count: { select: { entries: true } },
    },
  })
}

export async function getPublicEventById(id: string) {
  const event = await prisma.event.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      date: true,
      description: true,
      coverImage: true,
      coverPrice: true,
      paypalPrice: true,
      maxEntries: true,
    },
  })
  if (!event) return null
  const entriesSoldSum = await getEventSoldEntriesCount(event.id)
  return { ...event, entriesSoldSum }
}
