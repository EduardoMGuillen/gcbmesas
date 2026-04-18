import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { isEventWithinPublicSalesWindow } from '@/lib/public-events'

const CBTICKETS_BASE_URL = 'https://gcbtickets.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listingMinDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
  const candidates = await prisma.event.findMany({
    where: {
      isActive: true,
      publishOnCbtickets: true,
      date: { gte: listingMinDate },
    },
    select: {
      id: true,
      date: true,
      updatedAt: true,
    },
    orderBy: { date: 'asc' },
  })
  const events = candidates.filter((e) => isEventWithinPublicSalesWindow(e.date))

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${CBTICKETS_BASE_URL}/cbtickets`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  const eventUrls: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${CBTICKETS_BASE_URL}/cbtickets/${event.id}`,
    lastModified: event.updatedAt,
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  return [...staticUrls, ...eventUrls]
}
