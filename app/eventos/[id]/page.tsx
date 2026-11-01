import { getPublicEventById, hasOnlineTicketSale, isPublicFreeCoverOnly } from '@/lib/public-events'
import { FreeCoverEventView } from '../_components/FreeCoverEventView'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { EventPurchaseClient } from './EventPurchaseClient'
import { LcbFooter, LcbHead, LcbHeader } from '@/app/_components/lcb/LcbShared'
import { daysUntil } from '@/lib/ticket-availability'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const event = await getPublicEventById(params.id, { channel: 'lcb' })
  if (!event) {
    return {
      title: 'Evento | La Gran Casa Blanca',
      description: 'Eventos y entradas en linea de La Gran Casa Blanca.',
    }
  }

  const eventDate = new Date(event.date).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return {
    title: `${event.name} | Astronomical · Studio 54 · La Gran Casa Blanca`,
    description: `${event.name} - ${eventDate}. Compra entradas en linea para Astronomical, Studio 54 y eventos de La Gran Casa Blanca.`,
  }
}

export default async function EventoPage({
  params,
}: {
  params: { id: string }
}) {
  const event = await getPublicEventById(params.id, { channel: 'lcb' })

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

  const days = daysUntil(new Date(event.date).toISOString(), now)
  const chips = [
    eventDateLabel.charAt(0).toUpperCase() + eventDateLabel.slice(1),
    venueLine,
    eventHasPassed ? '' : days === 0 ? 'Es hoy' : days === 1 ? 'Mañana' : `Faltan ${days} días`,
  ].filter(Boolean)

  return (
    <>
      <LcbHead />
      <div className="lcb flex min-h-screen flex-col overflow-x-hidden antialiased">
        <LcbHeader buyHref={`/eventos/${event.id}`} onHome={false} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden" aria-hidden>
          {event.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverImage} alt="" className="h-full w-full scale-110 object-cover opacity-45 blur-3xl" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(60% 80% at 50% 0%, rgba(226,69,123,.22), transparent 70%), linear-gradient(180deg, rgba(20,15,46,.35), #140F2E 92%)' }}
          />
        </div>
        <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
          <Link href="/eventos" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Todos los eventos
          </Link>
          <ul className="mb-8 flex flex-wrap justify-center gap-2" aria-label="Datos del evento">
            {chips.map((c) => (
              <li key={c} className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md">
                {c}
              </li>
            ))}
          </ul>
          {eventHasPassed ? (
            <div className="rounded-[28px] bg-[#1C1640] px-6 py-16 text-center ring-1 ring-white/15">
              <h3 className="lcb-display text-5xl uppercase">Este evento ya pasó</h3>
              <p className="mb-8 mt-3 text-white/65">La venta de entradas en línea ya no está disponible.</p>
              <Link href="/eventos" className="lcb-btn lcb-btn-yellow px-7 py-3.5">
                Ver otros eventos
              </Link>
            </div>
          ) : freeOnly ? (
            <FreeCoverEventView
              name={event.name}
              eventDateLabel={eventDateLabel}
              description={event.description}
              coverImage={event.coverImage}
              listHref="/eventos"
            />
          ) : (
            <EventPurchaseClient event={eventData} />
          )}
        </main>
        <LcbFooter />
      </div>
    </>
  )
}
