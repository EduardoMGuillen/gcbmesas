import { CBT_EVENTS } from '@/lib/cbtickets-paths'
import { buildCbtEventMetadata } from '@/lib/cbtickets-metadata'
import { eventJsonLd } from '@/lib/cbtickets-seo'
import { toCbtEvent } from '../_components/CbtEventCard'
import { getPublicEventById, hasOnlineTicketSale, isPublicFreeCoverOnly } from '@/lib/public-events'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EventPurchaseClient } from '@/app/eventos/[id]/EventPurchaseClient'
import { FreeCoverEventView } from '@/app/eventos/_components/FreeCoverEventView'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const event = await getPublicEventById(params.id, { channel: 'cbtickets' })
  if (!event) {
    return {
      title: 'Evento',
      description: 'Entradas en línea para eventos en Honduras.',
    }
  }

  const eventDate = new Date(event.date).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return buildCbtEventMetadata({ id: event.id, name: event.name, dateLabel: eventDate, coverImage: event.coverImage })
}

export default async function CbTicketsEventoPage({
  params,
}: {
  params: { id: string }
}) {
  const event = await getPublicEventById(params.id, { channel: 'cbtickets' })

  if (!event) {
    notFound()
  }

  const freeOnly = isPublicFreeCoverOnly(event.coverPrice, event.paypalPrice)
  const hasSale = hasOnlineTicketSale(event.paypalPrice)
  if (!freeOnly && !hasSale) {
    notFound()
  }

  const eventDate = new Date(event.date)
  const now = new Date()
  const oneDayAfterEvent = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)
  const eventHasPassed = now > oneDayAfterEvent

  const eventData = {
    id: event.id,
    name: event.name,
    date: String(event.date),
    description: event.description,
    coverImage: event.coverImage,
    coverPrice: Number(event.coverPrice),
    onlinePrice: Number(event.paypalPrice ?? 0),
    maxEntries: event.maxEntries,
    entriesSoldSum: event.entriesSoldSum,
  }

  const venueLine = [event.venueName, event.venueAddress].filter(Boolean).join(' · ')
  const eventDateLabel = eventDate.toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const jsonLd = eventJsonLd({ ...toCbtEvent(event), description: event.description })

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mb-5">
        <Link
          href={CBT_EVENTS}
          className="inline-flex items-center gap-2 text-sm font-medium text-cbt-ivory/60 transition-colors hover:text-cbt-gold-hi"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Todos los eventos
        </Link>
      </div>
      {venueLine ? <p className="mb-6 text-center text-sm text-cbt-ivory/60">{venueLine}</p> : null}
      {eventHasPassed ? (
        <div className="rounded-[28px] border border-cbt-gold/20 bg-cbt-forest/50 px-4 py-16 text-center">
          <h3 className="cbt-display mb-2 text-3xl font-medium">Este evento ya pasó</h3>
          <p className="mb-6 text-sm text-cbt-ivory/60">La venta de entradas en línea ya no está disponible.</p>
          <Link href={CBT_EVENTS} className="cbt-btn-gold px-6 py-2.5 text-sm">
            Ver otros eventos
          </Link>
        </div>
      ) : freeOnly ? (
        <FreeCoverEventView
          name={event.name}
          eventDateLabel={eventDateLabel}
          description={event.description}
          coverImage={event.coverImage}
          listHref={CBT_EVENTS}
          theme="cbtickets"
        />
      ) : (
        <EventPurchaseClient event={eventData} eventsListPath={CBT_EVENTS} variant="cbtickets" />
      )}
    </main>
  )
}
