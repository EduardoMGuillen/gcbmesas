import { getPublicEventById } from '@/lib/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { EventPurchaseClient } from './EventPurchaseClient'
import { PublicSiteVantaBackground } from '@/components/PublicSiteVantaBackground'

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
    onlinePrice: Number(event.paypalPrice),
    maxEntries: event.maxEntries,
    entriesSoldSum: event.entriesSoldSum,
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Exo+2:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <PublicSiteVantaBackground>
        <div className="flex flex-col flex-1 min-h-screen font-[family-name:var(--font-exo)]" style={{ fontFamily: "'Exo 2', sans-serif" }}>
          <nav
            className="border-b border-white/10 backdrop-blur-md shrink-0"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              background: 'rgba(10,0,21,0.72)',
            }}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-4 sm:gap-6">
                <Link
                  href="/"
                  className="text-xs sm:text-sm font-medium text-white/55 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Inicio
                </Link>
                <Link href="/eventos" className="flex items-center gap-2 group">
                  <Image
                    src="/LogoCasaBlanca.png"
                    alt="Casa Blanca"
                    width={36}
                    height={36}
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Eventos</span>
                </Link>
              </div>
              <Link
                href="/eventos"
                className="text-xs sm:text-sm text-white/45 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Todos los eventos
              </Link>
            </div>
          </nav>

          <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
            {eventHasPassed ? (
              <div className="text-center py-20">
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{ border: '1px solid rgba(0,255,255,0.25)' }}
                >
                  <svg className="w-10 h-10 text-cyan-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white/40 mb-2">Este evento ya pasó</h3>
                <p className="text-white/25 mb-6 text-sm">La venta de entradas en línea ya no está disponible.</p>
                <Link
                  href="/eventos"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(45deg, #00ffff, #a855f7)',
                    color: '#0a0a15',
                    boxShadow: '0 4px 20px rgba(0,255,255,0.2)',
                  }}
                >
                  Ver otros eventos
                </Link>
              </div>
            ) : (
              <EventPurchaseClient event={eventData} />
            )}
          </main>

          <footer className="py-8 mt-auto border-t border-white/10 shrink-0" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-6 sm:gap-10 mb-3 flex-wrap">
                <Image src="/LogoAstronomical.png" alt="Astronomical" width={90} height={30} className="h-6 sm:h-7 w-auto object-contain opacity-35" />
                <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={40} height={40} className="h-8 w-auto object-contain opacity-35" />
                <Image src="/LogoStudio54.png" alt="Studio 54" width={90} height={30} className="h-6 sm:h-7 w-auto object-contain opacity-35" />
              </div>
              <p className="text-xs text-white/25">
                &copy; {new Date().getFullYear()} Casa Blanca &middot; San Pedro Sula, Honduras
              </p>
              <p className="text-xs text-white/25">
                Powered by{' '}
                <a
                  href="https://www.nexusglobalsuministros.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400/60 hover:text-cyan-300 underline underline-offset-2"
                >
                  Nexus Global
                </a>
              </p>
            </div>
          </footer>
        </div>
      </PublicSiteVantaBackground>
    </>
  )
}
