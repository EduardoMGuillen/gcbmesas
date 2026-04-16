import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const MAIN_BASE_URL = 'https://lagrancasablanca.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      publishOnLcb: true,
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
