import { getPublicEvents } from '@/lib/public-events'
import { pickFeaturedEvent } from '@/lib/featured-event'
import {
  LcbEventCard,
  LcbFooter,
  LcbHead,
  LcbHeader,
  LcbNoEvents,
  WA_RESERVA_MESA,
  WhatsAppIcon,
} from '../_components/lcb/LcbShared'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Eventos en San Pedro Sula | La Gran Casa Blanca',
  description:
    'Próximos eventos en Astronomical, Studio 54 y Casa Blanca Beer Garden, San Pedro Sula. Compra tus entradas en línea y reserva tu mesa.',
  alternates: { canonical: '/eventos' },
}

export default async function EventosPage() {
  const raw = await getPublicEvents('lcb')
  const events = raw.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    coverImage: e.coverImage,
    coverPrice: Number(e.coverPrice),
    paypalPrice: e.paypalPrice != null ? e.paypalPrice.toString() : null,
    maxEntries: e.maxEntries,
    entriesSoldSum: e.entriesSoldSum,
    isFeatured: e.isFeatured,
  }))
  const featured = pickFeaturedEvent(events)
  const buyHref = featured ? `/eventos/${featured.id}` : '/eventos'

  return (
    <>
      <LcbHead />
      <div className="lcb min-h-screen overflow-x-hidden antialiased">
        <LcbHeader buyHref={buyHref} onHome={false} />

        <section className="relative overflow-hidden">
          <div className="lcb-strip absolute inset-0 grid grid-cols-2 gap-1.5 md:grid-cols-4" aria-hidden>
            {['/Eventos/3.png', '/Eventos/2.png', '/Eventos/5.png', '/Eventos/4.png'].map((src, i) => (
              <div key={src} className={`overflow-hidden ${i > 1 ? 'hidden md:block' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#140F2E] via-[#140F2E]/80 to-[#140F2E]/40" aria-hidden />
          <div
            className="absolute inset-0 mix-blend-color opacity-40"
            style={{ background: 'linear-gradient(110deg, #1FB5A8 0%, transparent 40%, #E2457B 75%, #E8C531 100%)' }}
            aria-hidden
          />
          <div className="lcb-rise relative mx-auto max-w-7xl px-4 pb-16 pt-36 sm:px-8 sm:pb-20 sm:pt-44">
            <h1 className="lcb-display text-[3.6rem] uppercase sm:text-[6rem] lg:text-[7.5rem]">Próximos eventos</h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              {events.length > 0
                ? 'Compra tu entrada en línea y llega directo a la fiesta. Recibes tu QR al instante en tu correo.'
                : 'Abrimos jueves, viernes y sábado desde las 10 PM. Los line-ups se anuncian primero en Instagram.'}
            </p>
          </div>
        </section>

        <section className="px-4 pb-24 pt-4 sm:px-8" aria-label="Lista de eventos">
          <div className="mx-auto max-w-7xl">
            {events.length === 0 ? (
              <LcbNoEvents onDark />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((e) => (
                  <LcbEventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#E8C531] px-4 py-16 text-[#140F2E] sm:px-8" aria-labelledby="reserva-titulo">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8">
            <div>
              <h2 id="reserva-titulo" className="lcb-display text-5xl uppercase sm:text-7xl">
                ¿Vienes en grupo?
              </h2>
              <p className="mt-3 max-w-lg text-lg font-medium text-[#140F2E]/80">Reserva tu mesa por WhatsApp y te la tenemos lista.</p>
            </div>
            <a href={WA_RESERVA_MESA} target="_blank" rel="noopener noreferrer" className="lcb-btn lcb-btn-night px-9 py-5 text-lg">
              <WhatsAppIcon size={22} /> Reservar mesa
            </a>
          </div>
        </section>

        <LcbFooter />
      </div>
    </>
  )
}
