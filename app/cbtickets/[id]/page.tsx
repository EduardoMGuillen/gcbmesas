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
      title: 'Evento | GCBTickets',
      description: 'Entradas en linea para eventos de La Gran Casa Blanca.',
    }
  }

  const eventDate = new Date(event.date).toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return {
    title: `${event.name} | GCBTickets`,
    description: `${event.name} - ${eventDate}. Compra entradas en linea en GCBTickets, la ticketera oficial de La Gran Casa Blanca.`,
  }
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

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 w-full">
        {venueLine ? (
          <p className="text-center text-stone-600 text-sm mb-6">{venueLine}</p>
        ) : null}
        {eventHasPassed ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-amber-200/50 bg-white/70 shadow-sm">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-amber-50"
              style={{ border: '1px solid rgba(201,168,76,0.35)' }}
            >
              <svg className="w-10 h-10 text-amber-600/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-stone-700 mb-2">Este evento ya pasó</h3>
            <p className="text-stone-500 mb-6 text-sm">La venta de entradas en línea ya no está disponible.</p>
            <Link
              href="/cbtickets"
              className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #9a7328)',
                color: '#1a1510',
                boxShadow: '0 4px 18px rgba(180, 140, 60, 0.3)',
              }}
            >
              Ver otros eventos
            </Link>
          </div>
        ) : freeOnly ? (
          <FreeCoverEventView
            name={event.name}
            eventDateLabel={eventDateLabel}
            description={event.description}
            coverImage={event.coverImage}
            listHref="/cbtickets"
            theme="cbtickets"
          />
        ) : (
          <EventPurchaseClient event={eventData} eventsListPath="/cbtickets" variant="cbtickets" />
        )}
      </main>

      <footer className="py-8 mt-auto border-t border-amber-200/40 shrink-0 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <p className="text-xs text-stone-500">&copy; {new Date().getFullYear()} CBTickets · La Gran Casa Blanca</p>
          <p className="text-xs text-stone-400">
            Powered by{' '}
            <a
              href="https://www.nexusglobalsuministros.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-800/80 hover:text-amber-950 underline underline-offset-2"
            >
              Nexus Global
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
