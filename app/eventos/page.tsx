import { getPublicEvents } from '@/lib/actions'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Eventos - Casa Blanca',
  description: 'Compra tus entradas para los mejores eventos en Casa Blanca, San Pedro Sula',
}

export default async function EventosPage() {
  const events = await getPublicEvents()

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #050510 0%, #0a0a1a 40%, #0d0d20 100%)' }}>
      {/* Stars background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[2px] h-[2px] bg-white/20 rounded-full" style={{ top: '8%', left: '15%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/30 rounded-full" style={{ top: '12%', left: '45%' }} />
        <div className="absolute w-[2px] h-[2px] bg-white/15 rounded-full" style={{ top: '20%', left: '80%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/25 rounded-full" style={{ top: '35%', left: '25%' }} />
        <div className="absolute w-[2px] h-[2px] bg-white/10 rounded-full" style={{ top: '45%', left: '65%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/20 rounded-full" style={{ top: '55%', left: '10%' }} />
        <div className="absolute w-[2px] h-[2px] bg-white/15 rounded-full" style={{ top: '65%', left: '90%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/25 rounded-full" style={{ top: '75%', left: '50%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/20 rounded-full" style={{ top: '85%', left: '30%' }} />
        <div className="absolute w-[2px] h-[2px] bg-white/10 rounded-full" style={{ top: '92%', left: '70%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/30 rounded-full" style={{ top: '18%', left: '60%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/15 rounded-full" style={{ top: '40%', left: '5%' }} />
        <div className="absolute w-[2px] h-[2px] bg-white/20 rounded-full" style={{ top: '50%', left: '35%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/25 rounded-full" style={{ top: '70%', left: '75%' }} />
        <div className="absolute w-[1px] h-[1px] bg-white/15 rounded-full" style={{ top: '28%', left: '52%' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a
            href="https://www.lagrancasablanca.com"
            className="text-xs sm:text-sm font-medium text-white/60 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Inicio
          </a>
          <span className="text-xs sm:text-sm font-medium text-white">Eventos</span>
        </div>
      </nav>

      {/* Hero Section with Logos */}
      <header className="relative z-10 pt-8 sm:pt-12 pb-6 sm:pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Top logos: Astronomical + Studio 54 */}
          <div className="flex items-center justify-center gap-6 sm:gap-12 mb-6 sm:mb-8">
            <Image
              src="/LogoAstronomical.png"
              alt="Astronomical"
              width={220}
              height={70}
              className="h-10 sm:h-14 lg:h-16 w-auto object-contain"
            />
            <Image
              src="/LogoStudio54.png"
              alt="Studio 54"
              width={220}
              height={70}
              className="h-10 sm:h-14 lg:h-16 w-auto object-contain"
            />
          </div>

          {/* Center: Casa Blanca logo */}
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <Image
              src="/LogoCasaBlanca.png"
              alt="Casa Blanca"
              width={160}
              height={160}
              className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 object-contain"
            />
          </div>

          {/* Tagline */}
          <p className="text-center text-white/50 text-sm sm:text-base mb-2">
            La mejor experiencia nocturna de San Pedro Sula
          </p>
        </div>
      </header>

      {/* Events Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        {/* Section title */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 tracking-wide uppercase">
            Proximos Eventos
          </h2>
          <div className="w-20 h-0.5 mx-auto mb-3" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />
          <p className="text-white/40 text-sm sm:text-base">
            Compra tus entradas en linea y recibe tu QR al instante
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-white/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white/30 mb-2">No hay eventos disponibles</h3>
            <p className="text-white/15 text-sm">Vuelve pronto para ver los proximos eventos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {events.map((event) => {
              const eventDate = new Date(event.date)
              const dayNum = eventDate.toLocaleDateString('es-HN', { day: 'numeric', timeZone: 'UTC' })
              const monthStr = eventDate.toLocaleDateString('es-HN', { month: 'short', timeZone: 'UTC' }).toUpperCase()
              const weekday = eventDate.toLocaleDateString('es-HN', { weekday: 'long', timeZone: 'UTC' })
              const fullDate = eventDate.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
              const priceLps = Number(event.coverPrice)

              return (
                <Link
                  key={event.id}
                  href={`/eventos/${event.id}`}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/10"
                  style={{ background: 'linear-gradient(180deg, #111122 0%, #0a0a18 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {/* Image */}
                  <div className="aspect-[4/5] relative overflow-hidden">
                    {event.coverImage ? (
                      <img
                        src={event.coverImage}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a30 0%, #0d0d1a 100%)' }}>
                        <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={80} height={80} className="w-20 h-20 object-contain opacity-20" />
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Date badge */}
                    <div className="absolute top-4 left-4 text-center rounded-xl px-3 py-2" style={{ background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(201,168,76,0.3)' }}>
                      <p className="text-lg font-bold text-white leading-none">{dayNum}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#c9a84c' }}>{monthStr}</p>
                    </div>

                    {/* Bottom info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-amber-200 transition-colors">
                        {event.name}
                      </h3>
                      {event.description && (
                        <p className="text-white/50 text-sm line-clamp-2 mb-3">{event.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-xs capitalize">{fullDate}</span>
                        <span className="font-bold text-lg" style={{ color: '#c9a84c' }}>L {priceLps.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-white/50 text-xs capitalize">{weekday} - 9:00 PM</span>
                    <span className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all group-hover:scale-105" style={{ background: 'linear-gradient(135deg, #c9a84c, #a88a3d)', color: '#0a0a15' }}>
                      Comprar Entrada
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* WhatsApp CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-white/30 text-sm mb-4">Reservaciones y consultas</p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://wa.me/50494373757"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C3e)', boxShadow: '0 4px 15px rgba(37,211,102,0.2)' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
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
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://www.facebook.com/casablancasps"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-full text-white transition-all hover:scale-110"
              style={{ background: '#1877F2' }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>
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
            &copy; {new Date().getFullYear()} Casa Blanca &middot; San Pedro Sula, Honduras &middot; Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  )
}
