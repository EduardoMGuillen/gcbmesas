import { getPublicEventById } from '@/lib/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { EventPurchaseClient } from './EventPurchaseClient'

export const dynamic = 'force-dynamic'

export default async function EventoPage({
  params,
}: {
  params: { id: string }
}) {
  const event = await getPublicEventById(params.id)

  if (!event || !event.paypalPrice) {
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
    paypalPrice: Number(event.paypalPrice),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-300 via-dark-200 to-dark-300">
      {/* Header */}
      <header className="border-b border-dark-200/50 bg-dark-100/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/eventos" className="flex items-center gap-3">
            <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={40} height={40} className="h-10 w-auto object-contain" />
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Casa Blanca</h1>
              <p className="text-xs text-primary-400">Eventos</p>
            </div>
          </Link>
          <Link href="/eventos" className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Todos los eventos
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {eventHasPassed ? (
          <div className="text-center py-20">
            <svg className="w-20 h-20 mx-auto text-white/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white/40 mb-2">Este evento ya paso</h3>
            <p className="text-white/20 mb-6">La venta de entradas en linea ya no esta disponible.</p>
            <Link href="/eventos" className="text-primary-400 hover:text-primary-300 transition-colors text-sm font-medium">
              Ver otros eventos
            </Link>
          </div>
        ) : (
          <EventPurchaseClient event={eventData} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-200/50 py-6 mt-12">
        <p className="text-center text-xs text-dark-300/60">
          Casa Blanca &copy; {new Date().getFullYear()} &middot; Todos los derechos reservados
        </p>
      </footer>
    </div>
  )
}
