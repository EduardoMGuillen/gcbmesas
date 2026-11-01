import { getPublicEvents } from '@/lib/public-events'
import { CbtEventCard, toCbtEvent } from '../_components/CbtEventCard'
import { CBT_INSTAGRAM } from '../_components/contact'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Eventos',
  alternates: { canonical: '/eventos' },
  openGraph: { url: '/eventos', title: 'Eventos | GCBTickets', images: ['/gcbtickets/logo.png'] },
  description: 'Todos los eventos con entradas a la venta en GCBTickets. Compra en línea y recibe tu QR al instante.',
}

export default async function CbTicketsEventosPage() {
  const events = (await getPublicEvents('cbtickets')).map(toCbtEvent)

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-10 sm:mb-12">
        <p className="cbt-eyebrow">Entradas en línea</p>
        <h1 className="cbt-serif mt-2 text-4xl font-semibold sm:text-5xl">Próximos eventos</h1>
        <p className="mt-3 max-w-xl text-[#EDE6D6]/60">Compra con tarjeta en minutos y recibe tu QR al instante.</p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141210] px-6 py-16 text-center">
          <h2 className="cbt-serif text-3xl font-semibold">Próximamente nuevos eventos</h2>
          <p className="mx-auto mt-3 max-w-md text-[#EDE6D6]/60">
            Síguenos en Instagram para enterarte primero cuando salgan a la venta.
          </p>
          <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="cbt-btn-ghost mt-6 px-6 py-2.5 text-sm">
            Seguir en Instagram
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <CbtEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  )
}
