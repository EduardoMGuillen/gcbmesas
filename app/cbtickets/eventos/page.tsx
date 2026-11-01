import { getPublicEvents } from '@/lib/public-events'
import { toCbtEvent } from '../_components/CbtEventCard'
import { CbtEventRow } from '../_components/CbtEventRow'
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Eventos en Honduras</h1>
      <p className="mt-3 text-neutral-500 sm:text-lg">
        {events.length > 0
          ? `${events.length === 1 ? '1 evento' : `${events.length} eventos`} con entradas a la venta.`
          : 'Pronto publicaremos nuevos eventos.'}
      </p>

      {events.length === 0 ? (
        <div className="relative mt-10 overflow-hidden rounded-[28px] bg-black">
          <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-4" aria-hidden>
            {['/Eventos/3.png', '/Eventos/2.png', '/Eventos/4.png', '/Eventos/5.png'].map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="h-full w-full object-cover" />
            ))}
          </div>
          <div className="absolute inset-0 bg-black/45" aria-hidden />
          <div className="relative p-5 sm:p-10">
            <div className="gcb-glass-dark max-w-lg rounded-3xl p-6 text-white sm:p-8">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">No hay eventos a la venta en este momento</h2>
              <p className="mt-3 text-white/80">Síguenos en Instagram para enterarte primero cuando salgan.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="gcb-btn gcb-btn-gold px-6 py-3">
                  Seguir en Instagram
                </a>
                <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="gcb-btn bg-white/15 px-6 py-3 text-white ring-1 ring-white/30 hover:bg-white/25">
                  {CBT_SELL_CTA}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-5">
          {events.map((event) => (
            <CbtEventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  )
}
