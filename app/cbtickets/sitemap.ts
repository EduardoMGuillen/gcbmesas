import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const CBTICKETS_BASE_URL = 'https://gcbtickets.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      publishOnCbtickets: true,
      date: { gte: now },
    },
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: { date: 'asc' },
  })

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
