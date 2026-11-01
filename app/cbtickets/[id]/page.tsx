import { CBT_EVENTS } from '@/lib/cbtickets-paths'
import { buildCbtEventMetadata } from '@/lib/cbtickets-metadata'
import { eventJsonLd } from '@/lib/cbtickets-seo'
import { daysUntil } from '@/lib/ticket-availability'
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

  const days = daysUntil(new Date(event.date).toISOString(), now)
  const chips = [
    eventDateLabel.charAt(0).toUpperCase() + eventDateLabel.slice(1),
    venueLine,
    eventHasPassed ? '' : days === 0 ? 'Es hoy' : days === 1 ? 'Mañana' : `Faltan ${days} días`,
  ].filter(Boolean)

  return (
    <div className="relative flex-1">
      {event.coverImage && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.coverImage} alt="" className="h-full w-full scale-110 object-cover opacity-35 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/70 to-white" />
        </div>
      )}
    <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mb-5">
        <Link
          href={CBT_EVENTS}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-black"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Todos los eventos
        </Link>
      </div>
      <ul className="mb-8 flex flex-wrap justify-center gap-2" aria-label="Datos del evento">
        {chips.map((c) => (
          <li key={c} className="gcb-glass rounded-full px-4 py-1.5 text-sm font-medium text-neutral-800">
            {c}
          </li>
        ))}
      </ul>
      {eventHasPassed ? (
        <div className="rounded-[28px] bg-gcb-mist px-4 py-16 text-center">
          <h3 className="mb-2 text-2xl font-extrabold tracking-tight">Este evento ya pasó</h3>
          <p className="mb-6 text-sm text-neutral-500">La venta de entradas en línea ya no está disponible.</p>
          <Link href={CBT_EVENTS} className="gcb-btn gcb-btn-gold px-6 py-2.5 text-sm">
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
    </div>
  )
}
