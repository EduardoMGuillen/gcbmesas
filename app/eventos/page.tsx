import { getPublicEvents } from '@/lib/actions'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Eventos - Casa Blanca',
  description: 'Compra tus entradas para los mejores eventos en Casa Blanca',
}

export default async function EventosPage() {
  const events = await getPublicEvents()

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
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
            Proximos Eventos
          </h2>
          <p className="text-dark-300 text-base sm:text-lg max-w-2xl mx-auto">
            Compra tus entradas en linea y recibe tu QR al instante.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-20 h-20 mx-auto text-white/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-white/40 mb-2">No hay eventos disponibles</h3>
            <p className="text-white/20">Vuelve pronto para ver los proximos eventos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const eventDate = new Date(event.date)
              const dateStr = eventDate.toLocaleDateString('es-HN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              })
              const price = Number(event.paypalPrice)

              return (
                <Link
                  key={event.id}
                  href={`/eventos/${event.id}`}
                  className="group bg-dark-100 border border-dark-200 rounded-2xl overflow-hidden hover:border-primary-500/50 transition-all hover:shadow-xl hover:shadow-primary-600/10 hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="aspect-[16/10] bg-dark-50 relative overflow-hidden">
                    {event.coverImage ? (
                      <img
                        src={event.coverImage}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-600/20 to-dark-50">
                        <svg className="w-16 h-16 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                      </div>
                    )}
                    {/* Date badge */}
                    <div className="absolute top-3 left-3 bg-dark-100/90 backdrop-blur-sm border border-dark-200 rounded-lg px-3 py-1.5">
                      <p className="text-xs font-bold text-primary-400 uppercase">{dateStr}</p>
                    </div>
                    {/* Price badge */}
                    <div className="absolute top-3 right-3 bg-primary-600/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <p className="text-sm font-bold text-white">${price.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary-400 transition-colors">
                      {event.name}
                    </h3>
                    {event.description && (
                      <p className="text-sm text-dark-300 line-clamp-2 mb-3">{event.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-300">
                        {eventDate.toLocaleDateString('es-HN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </span>
                      <span className="text-xs font-medium text-primary-400 bg-primary-600/10 px-2.5 py-1 rounded-full">
                        Comprar
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
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
