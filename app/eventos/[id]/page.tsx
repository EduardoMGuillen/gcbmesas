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
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #050510 0%, #0a0a1a 40%, #0d0d20 100%)' }}>
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[2px] h-[2px] bg-white/20 rounded-full" style={{ top: '8%', left: '15%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/30 rounded-full" style={{ top: '12%', left: '45%' }} />
        <div className="absolute w-[2px] h-[2px] bg-white/15 rounded-full" style={{ top: '20%', left: '80%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/25 rounded-full" style={{ top: '35%', left: '25%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/20 rounded-full" style={{ top: '55%', left: '10%' }} />
        <div className="absolute w-[2px] h-[2px] bg-white/15 rounded-full" style={{ top: '65%', left: '90%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/25 rounded-full" style={{ top: '75%', left: '50%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/15 rounded-full" style={{ top: '28%', left: '52%' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/eventos" className="flex items-center gap-3 group">
            <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={36} height={36} className="h-9 w-auto object-contain" />
            <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">Eventos</span>
          </Link>
          <Link href="/eventos" className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Todos los eventos
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {eventHasPassed ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg className="w-10 h-10 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white/30 mb-2">Este evento ya paso</h3>
            <p className="text-white/15 mb-6 text-sm">La venta de entradas en linea ya no esta disponible.</p>
            <Link
              href="/eventos"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-full transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #a88a3d)', color: '#0a0a15' }}
            >
              Ver otros eventos
            </Link>
          </div>
        ) : (
          <EventPurchaseClient event={eventData} />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 mt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center gap-6 sm:gap-10 mb-4">
            <Image src="/LogoStudio54.png" alt="Studio 54" width={100} height={35} className="h-6 sm:h-8 w-auto object-contain opacity-40" />
            <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={50} height={50} className="h-8 sm:h-10 w-auto object-contain opacity-40" />
            <Image src="/LogoAstronomical.png" alt="Astronomical" width={100} height={35} className="h-6 sm:h-8 w-auto object-contain opacity-40" />
          </div>
          <p className="text-center text-xs text-white/20">
            &copy; {new Date().getFullYear()} Casa Blanca &middot; San Pedro Sula, Honduras
          </p>
        </div>
      </footer>
    </div>
  )
}
