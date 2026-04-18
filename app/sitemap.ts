import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { isEventWithinPublicSalesWindow } from '@/lib/public-events'

const MAIN_BASE_URL = 'https://lagrancasablanca.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listingMinDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
  const candidates = await prisma.event.findMany({
    where: {
      isActive: true,
      publishOnLcb: true,
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
      url: `${MAIN_BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${MAIN_BASE_URL}/eventos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  const eventUrls: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${MAIN_BASE_URL}/eventos/${event.id}`,
    lastModified: event.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [...staticUrls, ...eventUrls]
}
