import type { Metadata } from 'next'
import { cbtEventPath } from '@/lib/cbtickets-paths'

/** Metadata propia de cada evento: sin esto heredaría canonical/og del home y Google lo fusionaría con `/`. */
export function buildCbtEventMetadata(event: {
  id: string
  name: string
  dateLabel: string
  coverImage: string | null
}): Metadata {
  const url = cbtEventPath(event.id)
  const description = `${event.name} - ${event.dateLabel}. Compra tus entradas en línea en GCBTickets.`
  const images = [event.coverImage || '/gcbtickets/logo.png']
  return {
    title: event.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'es_HN', siteName: 'GCBTickets', url, title: event.name, description, images },
    twitter: { card: 'summary_large_image', title: event.name, description, images },
  }
}
