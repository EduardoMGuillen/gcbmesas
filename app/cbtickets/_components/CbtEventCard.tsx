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
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gcb-mist">
        {event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImage}
            alt={`Afiche de ${event.name}`}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gcbtickets/icon.svg" alt="" className="h-20 w-20 opacity-50" />
          </div>
        )}
        <div className="gcb-glass-dark absolute left-3 top-3 rounded-xl px-3 py-1.5 text-center text-white">
          <p className="text-lg font-bold leading-none">{date.day}</p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-wide">{date.month}</p>
        </div>
        {availability === 'last' && (
          <span className="gcb-glass absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold">Últimas entradas</span>
        )}
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Agotado</span>
        )}
      </div>
      <div className="px-1 pt-4">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug">{event.name}</h3>
        <p className="mt-1 truncate text-sm text-neutral-500">
          {date.long}
          {event.venueName ? `, ${event.venueName}` : ''}
        </p>
        <p className="mt-2 text-sm font-semibold">
          {soldOut ? (
            <span className="text-neutral-400">Agotado</span>
          ) : availability === 'free' ? (
            'Entrada libre'
          ) : (
            <>
              <span className="font-normal text-neutral-500">Desde </span>
              <span className="text-gcb-gold">{formatCbtPrice(event)}</span>
            </>
          )}
        </p>
      </div>
    </>
  )

  if (soldOut) return <div className="opacity-70">{body}</div>
  return (
    <Link href={cbtEventPath(event.id)} className="group block" aria-label={`${event.name}, ${date.long}`}>
      {body}
    </Link>
  )
}
