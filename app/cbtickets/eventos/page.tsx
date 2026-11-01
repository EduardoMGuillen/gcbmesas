import { getPublicEvents } from '@/lib/public-events'
import { pickFeaturedEvent } from '@/lib/featured-event'
import { toCbtEvent } from '../_components/CbtEventCard'
import { CbtEventRow } from '../_components/CbtEventRow'
import { CbtTicket } from '../_components/CbtTicket'
import { CBT_INSTAGRAM, CBT_ORGANIZERS_WHATSAPP, CBT_SELL_CTA } from '../_components/contact'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Eventos en Honduras: compra tus entradas en línea',
  description: 'Fiestas, conciertos y eventos en Honduras con entradas a la venta en GCBTickets. Paga con tarjeta y recibe tu QR al instante.',
  alternates: { canonical: '/eventos' },
  openGraph: { url: '/eventos', title: 'Eventos en Honduras | GCBTickets', images: ['/gcbtickets/logo.png'] },
}

export default async function CbTicketsEventosPage() {
  const events = (await getPublicEvents('cbtickets')).map(toCbtEvent)
  const featured = pickFeaturedEvent(events)

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(55% 80% at 80% 50%, rgba(200,162,87,.16), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:pt-20">
          <div>
            <h1 className="cbt-display text-5xl font-medium leading-[1.02] sm:text-6xl">Eventos en Honduras</h1>
            <p className="mt-5 max-w-md text-lg text-cbt-ivory/70">
              {events.length > 0
                ? `${events.length === 1 ? 'Hay 1 evento' : `Hay ${events.length} eventos`} con entradas a la venta. Paga con tarjeta y recibe tu QR al instante.`
                : 'Los próximos eventos salen pronto a la venta. Síguenos en Instagram para enterarte primero.'}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {events.length === 0 && (
                <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="cbt-btn-gold px-7 py-3 text-[15px]">
                  Seguir en Instagram
                </a>
              )}
              <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="cbt-btn-line px-7 py-3 text-[15px]">
                {CBT_SELL_CTA}
              </a>
            </div>
          </div>
          <div className="px-2 sm:px-6 lg:px-0">
            <CbtTicket event={featured} />
          </div>
        </div>
      </section>

      {events.length > 0 && (
        <section className="cbt-paper border-t border-cbt-gold/20" aria-labelledby="cartelera">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
            <h2 id="cartelera" className="cbt-display text-center text-4xl font-medium text-cbt-ink sm:text-5xl">
              Cartelera
            </h2>
            <div className="mt-12 flex flex-col gap-6">
              {events.map((event) => (
                <CbtEventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
