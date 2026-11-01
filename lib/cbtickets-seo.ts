import { cbtEventPath } from '@/lib/cbtickets-paths'
import { getTicketAvailability } from '@/lib/ticket-availability'

export const CBT_BASE_URL = 'https://gcbtickets.com'

type SeoEvent = {
  id: string
  name: string
  date: string
  coverImage: string | null
  coverPrice: number
  paypalPrice: number | null
  maxEntries: number | null
  entriesSoldSum: number
  venueName: string | null
  venueAddress: string | null
  description?: string | null
}

const abs = (path: string) => (path.startsWith('http') ? path : `${CBT_BASE_URL}${path}`)

/** schema.org/Event para resultados enriquecidos de Google. Las fechas se guardan como día (UTC). */
export function eventJsonLd(e: SeoEvent) {
  const availability = getTicketAvailability(e)
  const url = abs(cbtEventPath(e.id))
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.name,
    url,
    startDate: e.date.slice(0, 10),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: [abs(e.coverImage || '/gcbtickets/logo.png')],
    description: e.description || `${e.name}. Compra tus entradas en línea en GCBTickets.`,
    location: {
      '@type': 'Place',
      name: e.venueName || 'Honduras',
      address: {
        '@type': 'PostalAddress',
        streetAddress: e.venueAddress || undefined,
        addressCountry: 'HN',
      },
    },
    organizer: { '@type': 'Organization', name: e.venueName || 'GCBTickets', url: CBT_BASE_URL },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'HNL',
      price: availability === 'free' ? '0' : Number(e.paypalPrice ?? 0).toFixed(2),
      availability: availability === 'soldout' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
  }
}

export function homeJsonLd(events: SeoEvent[], faq: { q: string; a: string }[]) {
  const graph: Array<{ '@type': string; [k: string]: any }> = [
    {
      '@type': 'Organization',
      '@id': `${CBT_BASE_URL}/#org`,
      name: 'GCBTickets',
      url: CBT_BASE_URL,
      logo: abs('/gcbtickets/logo.png'),
      description: 'Ticketera en línea de Honduras: venta de entradas y boletos para eventos, fiestas y conciertos.',
      areaServed: { '@type': 'Country', name: 'Honduras' },
      sameAs: ['https://www.instagram.com/casablanca_sps/'],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+504-9882-3627',
        contactType: 'customer support',
        areaServed: 'HN',
        availableLanguage: 'es',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${CBT_BASE_URL}/#website`,
      name: 'GCBTickets',
      url: CBT_BASE_URL,
      inLanguage: 'es-HN',
      publisher: { '@id': `${CBT_BASE_URL}/#org` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ]
  if (events.length > 0) {
    graph.push({
      '@type': 'ItemList',
      name: 'Próximos eventos en GCBTickets',
      itemListElement: events.map((e, i) => {
        const { '@context': _ctx, ...item } = eventJsonLd(e)
        return { '@type': 'ListItem', position: i + 1, item }
      }),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}
