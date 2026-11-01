import Link from 'next/link'
import { cbtEventPath } from '@/lib/cbtickets-paths'
import { getTicketAvailability } from '@/lib/ticket-availability'

export type CbtEvent = {
  id: string
  name: string
  date: string
  coverImage: string | null
  coverPrice: number
  paypalPrice: number | null
  maxEntries: number | null
  entriesSoldSum: number
  venueName: string | null
  venueAddress: string | null
  isFeatured?: boolean
}

/** Convierte una fila de getPublicEvents (Decimal/Date) al formato serializable de las tarjetas. */
export function toCbtEvent(e: {
  id: string
  name: string
  date: Date | string
  coverImage: string | null
  coverPrice: unknown
  paypalPrice: unknown
  maxEntries: number | null
  entriesSoldSum?: number | null
  venueName?: string | null
  venueAddress?: string | null
  isFeatured?: boolean | null
}): CbtEvent {
  return {
    id: e.id,
    name: e.name,
    date: new Date(e.date).toISOString(),
    coverImage: e.coverImage,
    coverPrice: Number(e.coverPrice),
    paypalPrice: e.paypalPrice != null ? Number(e.paypalPrice) : null,
    maxEntries: e.maxEntries,
    entriesSoldSum: Number(e.entriesSoldSum ?? 0),
    venueName: e.venueName ?? null,
    venueAddress: e.venueAddress ?? null,
    isFeatured: e.isFeatured === true,
  }
}

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatCbtDate(iso: string) {
  const d = new Date(iso)
  const opts = { timeZone: 'UTC' } as const
  return {
    day: d.toLocaleDateString('es-HN', { ...opts, day: 'numeric' }),
    month: d.toLocaleDateString('es-HN', { ...opts, month: 'short' }).replace('.', '').toUpperCase(),
    long: capitalizeFirst(d.toLocaleDateString('es-HN', { ...opts, weekday: 'long', day: 'numeric', month: 'long' })),
  }
}

export function formatCbtPrice(event: CbtEvent) {
  return getTicketAvailability(event) === 'free' ? 'Entrada libre' : `L ${Number(event.paypalPrice ?? 0).toFixed(2)}`
}

export function CbtEventCard({ event }: { event: CbtEvent }) {
  const availability = getTicketAvailability(event)
  const date = formatCbtDate(event.date)
  const soldOut = availability === 'soldout'

  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-cbt-forest">
        {event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImage}
            alt={`Afiche de ${event.name}`}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] ${soldOut ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-cbt-moss to-cbt-forest">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gcbtickets/icon.svg" alt="" className="h-24 w-24 opacity-40" />
          </div>
        )}
        {availability === 'last' && (
          <span className="absolute right-3 top-3 rounded-full bg-cbt-ivory px-3 py-1 text-xs font-semibold text-cbt-ink shadow">
            Últimas entradas
          </span>
        )}
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-cbt-ink/85 px-3 py-1 text-xs font-semibold text-cbt-ivory">
            Agotado
          </span>
        )}
      </div>
      <div className="cbt-ticket-h cbt-paper relative grid grid-cols-[auto_1fr] gap-x-4 border-t-2 border-dashed border-cbt-ink/25 px-5 pb-5 pt-4 text-cbt-ink [--cut:0%]">
        <div className="row-span-2 flex flex-col items-center justify-center border-r border-cbt-ink/15 pr-4 text-center">
          <span className="cbt-display text-4xl font-semibold leading-none">{date.day}</span>
          <span className="mt-1 text-xs font-semibold text-cbt-gold-lo">{date.month.toLowerCase()}</span>
        </div>
        <div className="min-w-0">
          <h3 className="cbt-display truncate text-xl font-semibold leading-tight">{event.name}</h3>
          <p className="mt-0.5 truncate text-sm text-cbt-ink/60">{event.venueName || date.long}</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-base font-semibold">{formatCbtPrice(event)}</span>
          <span className={soldOut ? 'text-sm font-semibold text-cbt-ink/45' : 'cbt-btn-ink px-4 py-1.5 text-sm'}>
            {soldOut ? 'Agotado' : availability === 'free' ? 'Ver evento' : 'Comprar'}
          </span>
        </div>
      </div>
    </>
  )

  const cls = 'group flex flex-col overflow-hidden rounded-[20px] shadow-[0_24px_50px_-28px_rgba(0,0,0,.9)] transition-transform duration-300'

  if (soldOut) return <div className={`${cls} opacity-75`}>{body}</div>
  return (
    <Link href={cbtEventPath(event.id)} className={`${cls} hover:-translate-y-1.5`} aria-label={`${event.name}, ${date.long}`}>
      {body}
    </Link>
  )
}
