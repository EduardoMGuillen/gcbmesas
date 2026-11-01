import Link from 'next/link'
import { cbtEventPath } from '@/lib/cbtickets-paths'
import { getTicketAvailability } from '@/lib/ticket-availability'
import { type CbtEvent, formatCbtPrice } from './CbtEventCard'

function dateParts(iso: string) {
  const d = new Date(iso)
  const o = { timeZone: 'UTC' } as const
  return {
    day: d.toLocaleDateString('es-HN', { ...o, day: 'numeric' }),
    month: d.toLocaleDateString('es-HN', { ...o, month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('es-HN', { ...o, weekday: 'long' }),
  }
}

/** Fila de cartelera: talón con la fecha, datos del evento y afiche con borde de boleto perforado. */
export function CbtEventRow({ event }: { event: CbtEvent }) {
  const a = getTicketAvailability(event)
  const soldOut = a === 'soldout'
  const d = dateParts(event.date)
  const href = cbtEventPath(event.id)

  return (
    <article className="group grid gap-0 overflow-hidden rounded-[22px] bg-cbt-ivory text-cbt-ink shadow-[0_20px_50px_-30px_rgba(16,36,29,.6)] ring-1 ring-cbt-ink/10 md:h-[230px] md:grid-cols-[120px_1fr_300px]">
      {/* Afiche (arriba en móvil, derecha en escritorio) */}
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="cbt-ticket-h relative order-first block aspect-[16/10] overflow-hidden border-cbt-ink/25 bg-cbt-forest [--cut:50%] md:order-last md:aspect-auto md:h-full md:border-l-2 md:border-dashed"
      >
        {event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImage}
            alt=""
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${soldOut ? 'grayscale' : ''}`}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/gcbtickets/icon.svg" alt="" className="m-auto h-full w-1/3 opacity-40" />
        )}
      </Link>

      {/* Talón de fecha */}
      <div className="hidden flex-col items-center justify-center border-r border-cbt-ink/10 bg-cbt-night py-6 text-cbt-ivory md:flex">
        <span className="text-xs capitalize text-cbt-ivory/60">{d.month}</span>
        <span className="cbt-display text-5xl font-semibold leading-none">{d.day}</span>
        <span className="mt-1 text-xs capitalize text-cbt-gold-hi">{d.weekday}</span>
      </div>

      {/* Datos */}
      <div className="flex flex-col justify-center p-6 sm:p-7">
        <p className="text-sm font-semibold text-cbt-gold-lo">
          <span className="capitalize md:hidden">{`${d.weekday} ${d.day} ${d.month}`}</span>
          <span className="md:hidden">{event.venueName ? ', ' : ''}</span>
          {event.venueName}
        </p>
        <h2 className="cbt-display mt-1 text-2xl font-semibold leading-tight sm:text-3xl">
          <Link href={href} className="hover:underline hover:decoration-cbt-gold hover:underline-offset-4">
            {event.name}
          </Link>
        </h2>
        {event.venueAddress && <p className="mt-1 text-sm text-cbt-ink/60">{event.venueAddress}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          {soldOut ? (
            <span className="rounded-full bg-cbt-ink/10 px-5 py-2 text-sm font-semibold text-cbt-ink/55">Agotado</span>
          ) : (
            <Link href={href} className="cbt-btn-ink px-6 py-2.5 text-sm">
              {a === 'free' ? 'Ver evento' : 'Comprar entrada'}
            </Link>
          )}
          <span className="text-base font-semibold">{formatCbtPrice(event)}</span>
          {a === 'last' && <span className="rounded-full bg-cbt-gold/20 px-3 py-1 text-xs font-semibold text-cbt-gold-lo">Últimas entradas</span>}
        </div>
      </div>
    </article>
  )
}
