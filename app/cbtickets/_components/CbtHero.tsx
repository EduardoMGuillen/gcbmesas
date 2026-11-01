import Link from 'next/link'
import { cbtEventPath } from '@/lib/cbtickets-paths'
import { daysUntil, getTicketAvailability } from '@/lib/ticket-availability'
import { type CbtEvent, formatCbtDate, formatCbtPrice } from './CbtEventCard'
import { CBT_INSTAGRAM, CBT_ORGANIZERS_WHATSAPP, CBT_SELL_CTA } from './contact'

const MOSAIC = ['/Eventos/3.png', '/Eventos/2.png', '/Eventos/4.png', '/Eventos/5.png']

function Countdown({ date }: { date: string }) {
  const n = daysUntil(date, new Date())
  return <>{n === 0 ? 'Es hoy' : n === 1 ? 'Mañana' : `En ${n} días`}</>
}

/** Franja principal: evento destacado con panel de vidrio sobre su propio afiche. */
export function CbtHero({ event }: { event: CbtEvent | null }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12">
      <div className="gcb-in max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Entradas para los mejores eventos de Honduras</h1>
        <p className="mt-3 text-base text-neutral-500 sm:text-lg">Compra en minutos con tu tarjeta y recibe tu QR al instante.</p>
      </div>

      <div className="relative mt-8 overflow-hidden rounded-[28px] bg-black sm:rounded-[36px]">
        {event?.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImage} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" aria-hidden />
        ) : (
          <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-4" aria-hidden>
            {MOSAIC.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="h-full w-full object-cover" />
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" aria-hidden />

        <div className="relative grid items-center gap-8 p-4 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:p-14">
          {event ? <FeaturedPanel event={event} /> : <EmptyPanel />}
          {event?.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImage}
              alt={`Afiche de ${event.name}`}
              className="hidden aspect-[4/5] w-[300px] rounded-3xl object-cover shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)] ring-1 ring-white/20 lg:block xl:w-[340px]"
            />
          )}
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        {[
          ['Pago seguro', 'Tarjetas Visa y Mastercard procesadas por BAC'],
          ['QR al instante', 'Tu entrada llega al correo apenas pagas'],
          ['Soporte por WhatsApp', 'Te ayudamos antes y durante el evento'],
        ].map(([t, d]) => (
          <li key={t} className="flex items-start gap-3 rounded-2xl bg-gcb-mist px-4 py-3.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gcb-gold" aria-hidden />
            <span>
              <span className="font-semibold">{t}.</span> <span className="text-neutral-500">{d}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FeaturedPanel({ event }: { event: CbtEvent }) {
  const a = getTicketAvailability(event)
  const date = formatCbtDate(event.date)
  return (
    <div className="gcb-glass-dark max-w-xl rounded-3xl p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-gcb-gold px-3 py-1 text-white">{event.isFeatured ? 'Destacado' : 'Próximo evento'}</span>
        <span className="rounded-full bg-white/15 px-3 py-1">
          <Countdown date={event.date} />
        </span>
      </div>
      <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{event.name}</h2>
      <p className="mt-3 text-white/80">
        {date.long}
        {event.venueName ? `, ${event.venueName}` : ''}
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-4">
        {a === 'soldout' ? (
          <span className="rounded-full bg-white/15 px-6 py-3 font-semibold text-white/70">Agotado</span>
        ) : (
          <Link href={cbtEventPath(event.id)} className="gcb-btn gcb-btn-gold px-7 py-3.5">
            {a === 'free' ? 'Ver evento' : 'Comprar entradas'}
          </Link>
        )}
        {a !== 'soldout' && <span className="text-lg font-semibold">{formatCbtPrice(event)}</span>}
        {a === 'last' && <span className="text-sm font-semibold text-gcb-gold-hi">Últimas entradas</span>}
      </div>
    </div>
  )
}

function EmptyPanel() {
  return (
    <div className="gcb-glass-dark max-w-xl rounded-3xl p-6 text-white sm:p-8">
      <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Nuevos eventos muy pronto</h2>
      <p className="mt-3 max-w-md text-white/80">Síguenos en Instagram para enterarte primero cuando salgan a la venta.</p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="gcb-btn gcb-btn-gold px-7 py-3.5">
          Seguir en Instagram
        </a>
        <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="gcb-btn bg-white/15 px-7 py-3.5 text-white ring-1 ring-white/30 hover:bg-white/25">
          {CBT_SELL_CTA}
        </a>
      </div>
    </div>
  )
}
