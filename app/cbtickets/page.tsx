import { getPublicEvents } from '@/lib/public-events'
import Link from 'next/link'
import { PublicSiteVantaBackground } from '@/components/PublicSiteVantaBackground'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Eventos - CBTickets',
  description: 'Compra entradas en línea para eventos en CBTickets.',
}

export default async function CbTicketsEventosPage() {
  const events = await getPublicEvents('cbtickets')

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .eventos-page { font-family: 'Exo 2', sans-serif; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .event-card:hover {
          border-color: rgba(0,255,255,0.35) !important;
          box-shadow: 0 20px 50px rgba(0,255,255,0.12), 0 4px 24px rgba(0,0,0,0.5) !important;
        }
        .hero-anim { animation: fadeInDown 0.6s ease both; }
        .shimmer-bar {
          background: linear-gradient(90deg, transparent 0%, #00ffff 35%, #ff00ff 50%, #00ffff 65%, transparent 100%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .event-card:hover .card-shine { opacity: 1; }
        .card-shine {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
          opacity: 0; transition: opacity 0.4s;
          pointer-events: none;
        }
        .section-title-eventos {
          font-family: 'Orbitron', monospace;
          font-size: clamp(1.5rem, 4vw, 2.25rem);
          font-weight: 700;
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <PublicSiteVantaBackground>
        <div className="eventos-page flex flex-col flex-1">
          <nav
            className="border-b border-white/10 backdrop-blur-md shrink-0"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              background: 'rgba(10,0,21,0.72)',
            }}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <Link
                href="/"
                className="text-xs sm:text-sm font-medium text-white/60 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Inicio
              </Link>
              <span className="text-xs sm:text-sm font-medium tracking-widest uppercase text-white/50">CBTickets</span>
            </div>
          </nav>

          <header className="pt-8 sm:pt-12 pb-6 sm:pb-10 hero-anim">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <p className="orbitron text-2xl sm:text-3xl font-bold tracking-widest uppercase text-white/90 mb-2">CBTickets</p>
              <p className="text-white/40 text-sm">Entradas en línea</p>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
            <div className="text-center mb-10 sm:mb-14" style={{ animation: 'fadeInDown 0.7s ease 0.15s both' }}>
              <h2 className="section-title-eventos mb-3 tracking-widest uppercase">Próximos Eventos</h2>
              <div className="shimmer-bar w-28 h-0.5 mx-auto mb-4 rounded-full" />
              <p className="text-white/40 text-sm sm:text-base">
                Compra tus entradas en línea · Recibe tu QR al instante
              </p>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-24" style={{ animation: 'fadeInUp 0.6s ease both' }}>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-cyan-500/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white/35 mb-2">No hay eventos disponibles</h3>
                <p className="text-white/20 text-sm">Vuelve pronto para ver los próximos eventos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {events.map((event, idx) => {
                  const eventDate = new Date(event.date)
                  const dayNum = eventDate.toLocaleDateString('es-HN', { day: 'numeric', timeZone: 'UTC' })
                  const monthStr = eventDate.toLocaleDateString('es-HN', { month: 'short', timeZone: 'UTC' }).toUpperCase()
                  const weekday = eventDate.toLocaleDateString('es-HN', { weekday: 'long', timeZone: 'UTC' })
                  const fullDate = eventDate.toLocaleDateString('es-HN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })
                  const onlinePrice = Number(event.paypalPrice)
                  const venueLine = [event.venueName, event.venueAddress].filter(Boolean).join(' · ')

                  return (
                    <Link
                      key={event.id}
                      href={`/cbtickets/${event.id}`}
                      className="event-card group relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2"
                      style={{
                        background: 'linear-gradient(180deg, rgba(18,18,42,0.92) 0%, rgba(10,10,28,0.95) 100%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
                        animation: `fadeInUp 0.55s ease ${idx * 0.08}s both`,
                      }}
                    >
                      <div className="card-shine" />

                      <div className="aspect-[4/5] relative overflow-hidden">
                        {event.coverImage ? (
                          <img
                            src={event.coverImage}
                            alt={event.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #1a1a30 0%, #0d0d1a 100%)' }}
                          >
                            <span className="text-white/25 text-sm font-semibold tracking-widest">CBTickets</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />

                        <div
                          className="absolute top-4 left-4 text-center rounded-xl px-3 py-2"
                          style={{
                            background: 'rgba(8,8,18,0.88)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(0,255,255,0.35)',
                          }}
                        >
                          <p className="text-lg font-bold text-white leading-none">{dayNum}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">{monthStr}</p>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-200 transition-colors duration-300">
                            {event.name}
                          </h3>
                          {event.description && (
                            <p className="text-white/45 text-sm line-clamp-2 mb-2">{event.description}</p>
                          )}
                          {venueLine ? (
                            <p className="text-white/35 text-xs line-clamp-2 mb-2">{venueLine}</p>
                          ) : null}
                          <div className="flex items-center justify-between">
                            <span className="text-white/35 text-xs capitalize">{fullDate}</span>
                            <span className="font-bold text-lg bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
                              L {onlinePrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 flex items-center justify-between border-t border-white/5">
                        <span className="text-white/40 text-xs capitalize">{weekday} · 9:00 PM</span>
                        <span
                          className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all duration-300 group-hover:scale-105"
                          style={{
                            background: 'linear-gradient(45deg, #00ffff, #a855f7)',
                            color: '#0a0a15',
                            boxShadow: '0 2px 16px rgba(0,255,255,0.25)',
                          }}
                        >
                          Comprar Entrada
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </main>

          <footer className="py-8 mt-auto border-t border-white/10 shrink-0" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-3">
              <p className="text-xs text-white/25">
                &copy; {new Date().getFullYear()} CBTickets
              </p>
              <p className="text-xs text-white/25">
                Powered by{' '}
                <a
                  href="https://www.nexusglobalsuministros.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400/60 hover:text-cyan-300 transition-colors underline underline-offset-2"
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
