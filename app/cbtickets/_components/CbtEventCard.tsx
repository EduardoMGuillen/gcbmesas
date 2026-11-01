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
  const venueLine = [event.venueName, event.venueAddress].filter(Boolean).join(' · ')
  const soldOut = availability === 'soldout'

  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#141210]">
        {event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImage}
            alt={event.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${soldOut ? 'grayscale-[60%]' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gcbtickets/icon.svg" alt="" className="h-24 w-24 opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute left-4 top-4 rounded-lg border border-[#B08F42]/50 bg-black/70 px-3 py-2 text-center backdrop-blur">
          <p className="cbt-serif text-2xl font-semibold leading-none text-[#EDE6D6]">{date.day}</p>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-[#B08F42]">{date.month}</p>
        </div>
        {availability === 'last' && (
          <span className="absolute right-4 top-4 rounded-full bg-[#B08F42] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-black">
            Últimas entradas
          </span>
        )}
        {soldOut && (
          <span className="absolute right-4 top-4 rounded-full border border-white/30 bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
            Agotado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <h3 className="cbt-serif text-2xl font-semibold leading-tight text-[#EDE6D6]">{event.name}</h3>
        <p className="text-sm text-[#EDE6D6]/60">{date.long}</p>
        {venueLine && <p className="text-sm text-[#EDE6D6]/60">{venueLine}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-lg font-semibold text-[#EDE6D6]">{formatCbtPrice(event)}</span>
          <span className={soldOut ? 'text-sm font-semibold text-white/50' : 'cbt-btn-gold px-4 py-1.5 text-sm'}>
            {soldOut ? 'Agotado' : availability === 'free' ? 'Ver evento' : 'Comprar'}
          </span>
        </div>
      </div>
    </>
  )

  const cls =
    'group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141210] transition-all duration-300'

  if (soldOut) return <div className={`${cls} opacity-80`}>{body}</div>
  return (
    <Link href={cbtEventPath(event.id)} className={`${cls} hover:-translate-y-1 hover:border-[#B08F42]/60`}>
      {body}
    </Link>
  )
}
