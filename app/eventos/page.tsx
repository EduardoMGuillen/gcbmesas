import { getPublicEvents } from '@/lib/public-events'
import Link from 'next/link'
import Image from 'next/image'
import { PublicSiteVantaBackground } from '@/components/PublicSiteVantaBackground'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Eventos - Casa Blanca',
  description: 'Compra tus entradas para los mejores eventos en Casa Blanca, San Pedro Sula',
}

export default async function EventosPage() {
  const events = await getPublicEvents()

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
              <span className="text-xs sm:text-sm font-medium tracking-widest uppercase text-white/50">Eventos</span>
            </div>
          </nav>

          <header className="pt-8 sm:pt-12 pb-6 sm:pb-10 hero-anim">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-center gap-8 sm:gap-14 lg:gap-20">
                <Image
                  src="/LogoAstronomical.png"
                  alt="Astronomical"
                  width={220}
                  height={70}
                  className="h-10 sm:h-14 lg:h-16 w-auto object-contain opacity-95"
                />
                <Image
                  src="/LogoCasaBlanca.png"
                  alt="Casa Blanca"
                  width={120}
                  height={120}
                  className="w-auto object-contain opacity-95"
                  style={{ height: 'clamp(52px, 6vw, 80px)' }}
                />
                <Image
                  src="/LogoStudio54.png"
                  alt="Studio 54"
                  width={220}
                  height={70}
                  className="h-10 sm:h-14 lg:h-16 w-auto object-contain opacity-95"
                />
              </div>
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

                  return (
                    <Link
                      key={event.id}
                      href={`/eventos/${event.id}`}
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
                            <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={80} height={80} className="w-20 h-20 object-contain opacity-20" />
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
                            <p className="text-white/45 text-sm line-clamp-2 mb-3">{event.description}</p>
                          )}
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

            <div className="mt-14 sm:mt-20 text-center" style={{ animation: 'fadeInUp 0.6s ease 0.4s both' }}>
              <p className="text-white/30 text-xs mb-5 tracking-wide uppercase">Reservaciones y consultas</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a
                  href="https://wa.me/50494373757"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C3e)', boxShadow: '0 4px 15px rgba(37,211,102,0.2)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                  </svg>
                  9437-3757
                </a>
                <a
                  href="https://www.instagram.com/casablancasps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full text-white transition-all hover:scale-110"
                  style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/casablancasps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full text-white transition-all hover:scale-110"
                  style={{ background: '#1877F2' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              </div>
            </div>
          </main>

          <footer className="py-8 mt-auto border-t border-white/10 shrink-0" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-8 sm:gap-12 mb-3 flex-wrap">
                <Image src="/LogoAstronomical.png" alt="Astronomical" width={100} height={35} className="h-5 sm:h-7 w-auto object-contain opacity-35" />
                <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={40} height={40} className="h-7 sm:h-9 w-auto object-contain opacity-35" />
                <Image src="/LogoStudio54.png" alt="Studio 54" width={100} height={35} className="h-5 sm:h-7 w-auto object-contain opacity-35" />
              </div>
              <p className="text-xs text-white/25">
                &copy; {new Date().getFullYear()} Casa Blanca &middot; San Pedro Sula, Honduras &middot; Todos los derechos reservados
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
