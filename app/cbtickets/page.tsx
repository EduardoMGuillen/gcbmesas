import { getPublicEvents } from '@/lib/public-events'
import { isPublicFreeCoverOnly } from '@/lib/public-event-pricing'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Entradas La Gran Casa Blanca Tickets | GCBTickets',
  description:
    'Compra entradas en linea en Honduras con GCBTickets, la ticketera oficial de La Gran Casa Blanca para eventos y fiestas.',
}

export default async function CbTicketsEventosPage() {
  const events = await getPublicEvents('cbtickets')

  return (
    <>
      <style>{`
        .cb-page { font-family: 'Exo 2', sans-serif; }
        @keyframes cbFadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cbFadeInDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cbShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .cb-card:hover {
          border-color: rgba(180, 140, 70, 0.55) !important;
          box-shadow: 0 22px 48px rgba(120, 83, 30, 0.12), 0 4px 16px rgba(0,0,0,0.06) !important;
        }
        .cb-hero { animation: cbFadeInDown 0.55s ease both; }
        .cb-shimmer-bar {
          background: linear-gradient(90deg, transparent 0%, #c9a84c 35%, #e8d5a8 50%, #c9a84c 65%, transparent 100%);
          background-size: 200% auto;
          animation: cbShimmer 4s linear infinite;
        }
        .cb-card:hover .cb-card-shine { opacity: 1; }
        .cb-card-shine {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 55%);
          opacity: 0; transition: opacity 0.35s;
          pointer-events: none;
        }
        .cb-section-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 700;
          color: #3d3428;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="cb-page flex flex-col flex-1">
        <div className="pt-8 sm:pt-10 pb-6 sm:pb-8 cb-hero text-center px-4">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-amber-700/90 mb-2">Entradas en línea</p>
          <h1 className="cb-section-title mb-2">Próximos eventos</h1>
          <div className="cb-shimmer-bar w-32 h-0.5 mx-auto mb-4 rounded-full" />
          <p className="text-stone-600 text-sm sm:text-base max-w-lg mx-auto">
            Compra con confianza · Recibe tu QR al instante
          </p>
        </div>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 flex-1 w-full">
          {events.length === 0 ? (
            <div className="text-center py-20" style={{ animation: 'cbFadeInUp 0.5s ease both' }}>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-amber-200/80 bg-white/60 flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-300/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-700 mb-2">No hay eventos disponibles</h3>
              <p className="text-stone-500 text-sm">Vuelve pronto para ver los próximos eventos.</p>
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
                const freeOnly = isPublicFreeCoverOnly(event.coverPrice, event.paypalPrice)
                const venueLine = [event.venueName, event.venueAddress].filter(Boolean).join(' · ')
                const soldOut =
                  !freeOnly &&
                  event.maxEntries != null &&
                  event.maxEntries >= 1 &&
                  Number(event.entriesSoldSum ?? 0) >= event.maxEntries

                return (
                  <Link
                    key={event.id}
                    href={`/cbtickets/${event.id}`}
                    className="cb-card group relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(252,248,242,0.99) 100%)',
                      border: '1px solid rgba(200, 175, 130, 0.35)',
                      boxShadow: '0 6px 28px rgba(80, 60, 30, 0.08)',
                      animation: `cbFadeInUp 0.5s ease ${idx * 0.06}s both`,
                    }}
                  >
                    <div className="cb-card-shine" />

                    <div className="aspect-[4/5] relative overflow-hidden">
                      {event.coverImage ? (
                        <img
                          src={event.coverImage}
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center gap-3"
                          style={{ background: 'linear-gradient(160deg, #faf6ef 0%, #ebe4d8 100%)' }}
                        >
                          <Image src="/LogoCasaBlanca.png" alt="" width={72} height={72} className="w-16 h-16 object-contain opacity-40" />
                          <span className="text-amber-800/50 text-xs font-semibold tracking-widest uppercase">CBTickets</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/15 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 h-[58%] bg-gradient-to-t from-black/95 via-black/72 to-transparent pointer-events-none" />

                      <div
                        className="absolute top-4 left-4 text-center rounded-xl px-3 py-2"
                        style={{
                          background: 'rgba(255,252,248,0.94)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(201,168,76,0.45)',
                        }}
                      >
                        <p className="text-lg font-bold text-stone-800 leading-none">{dayNum}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">{monthStr}</p>
                      </div>
                      {soldOut ? (
                        <div
                          className="absolute top-4 right-4 text-center rounded-xl px-3 py-2"
                          style={{
                            background: 'rgba(255,248,244,0.95)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(225,29,72,0.45)',
                          }}
                        >
                          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Sold Out</p>
                        </div>
                      ) : null}

                      <div className="absolute bottom-0 left-0 right-0 p-5 [&_p]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] [&_span]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                        <h3 className="text-xl font-bold text-white mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                          {event.name}
                        </h3>
                        {event.description && (
                          <p className="text-white text-sm line-clamp-2 mb-2">{event.description}</p>
                        )}
                        {venueLine ? <p className="text-white text-xs line-clamp-2 mb-2">{venueLine}</p> : null}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white text-xs capitalize">{fullDate}</span>
                          <span className="font-bold text-lg text-white shrink-0">
                            {freeOnly ? 'Cover gratuito' : `L ${onlinePrice.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="p-4 flex items-center justify-between border-t"
                      style={{ borderColor: 'rgba(201, 168, 76, 0.22)', background: 'rgba(255,252,248,0.75)' }}
                    >
                      <span className="text-stone-600 text-xs capitalize">{weekday} · 9:00 PM</span>
                      <span
                        className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all duration-300 group-hover:scale-[1.02]"
                        style={{
                          background: soldOut ? 'rgba(225,29,72,0.15)' : 'linear-gradient(135deg, #d4af37, #b8942f)',
                          color: soldOut ? '#9f1239' : '#1a1510',
                          boxShadow: soldOut ? 'none' : '0 2px 14px rgba(180, 140, 60, 0.35)',
                        }}
                      >
                        {freeOnly ? 'Ver evento' : soldOut ? 'Sold Out' : 'Comprar entrada'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
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
      </div>
    </>
  )
}
