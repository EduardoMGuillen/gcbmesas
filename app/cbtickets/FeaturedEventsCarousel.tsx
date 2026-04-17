'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { isPublicFreeCoverOnly } from '@/lib/public-event-pricing'

type FeaturedEvent = {
  id: string
  name: string
  date: string
  coverImage: string | null
  coverPrice: number
  paypalPrice: number | null
  maxEntries: number | null
  entriesSoldSum: number
}

export function FeaturedEventsCarousel({ events }: { events: FeaturedEvent[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (events.length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % events.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [events.length])

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-white/70 px-4 py-8 text-center">
        <p className="text-sm text-stone-600">Pronto verás aquí los eventos activos para compra en línea.</p>
      </div>
    )
  }

  const event = events[index % events.length]
  const eventDate = new Date(event.date).toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const freeOnly = isPublicFreeCoverOnly(event.coverPrice, event.paypalPrice)
  const soldOut =
    !freeOnly &&
    event.maxEntries != null &&
    event.maxEntries >= 1 &&
    Number(event.entriesSoldSum ?? 0) >= event.maxEntries

  return (
    <div className="relative overflow-hidden h-[320px] sm:h-[360px] rounded-2xl border border-amber-200/70 bg-white/85">
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/15" />

      {event.coverImage ? (
        <img
          key={event.id}
          src={event.coverImage}
          alt={event.name}
          className="absolute inset-0 w-full h-full object-contain bg-black/70 p-2 sm:p-3"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-50">
          <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={96} height={96} className="w-20 h-20 object-contain opacity-45" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-transparent" />
      <div className="absolute top-3 left-3 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide bg-black/55 text-amber-200 border border-amber-200/35">
        {eventDate}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-semibold text-base line-clamp-2">{event.name}</p>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-amber-300">
            {freeOnly ? 'Cover gratis' : `L ${Number(event.paypalPrice).toFixed(2)}`}
          </span>
          <Link
            href={`/cbtickets/${event.id}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: soldOut ? 'rgba(225,29,72,0.18)' : 'linear-gradient(135deg, #d4af37, #b8942f)',
              color: soldOut ? '#fecdd3' : '#1a1510',
              pointerEvents: soldOut ? 'none' : 'auto',
            }}
          >
            {soldOut ? 'Sold Out' : 'Comprar'}
          </Link>
        </div>
      </div>
    </div>
  )
}

