import { getPublicEvents } from '@/lib/public-events'
import { CbtEventCard, toCbtEvent } from '../_components/CbtEventCard'
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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
      <h1 className="cbt-display text-5xl font-medium sm:text-6xl">Eventos en Honduras</h1>
      <p className="mt-4 max-w-xl text-lg text-cbt-ivory/65">Compra con tarjeta en minutos y recibe tu QR al instante.</p>

      {events.length === 0 ? (
        <div className="mt-14 grid items-center gap-14 rounded-[28px] border border-cbt-gold/20 bg-cbt-forest/50 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="cbt-display text-3xl font-medium sm:text-4xl">Los próximos eventos salen pronto a la venta</h2>
            <p className="mt-4 max-w-md text-cbt-ivory/65">
              Síguenos en Instagram para enterarte primero. Si organizas un evento, podemos venderlo aquí.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="cbt-btn-gold px-7 py-3 text-[15px]">
                Seguir en Instagram
              </a>
              <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="cbt-btn-line px-7 py-3 text-[15px]">
                {CBT_SELL_CTA}
              </a>
            </div>
          </div>
          <CbtTicket event={null} />
        </div>
      ) : (
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <CbtEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  )
}
