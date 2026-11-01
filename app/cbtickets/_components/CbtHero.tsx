import Link from 'next/link'
import { CBT_EVENTS, cbtEventPath } from '@/lib/cbtickets-paths'
import { daysUntil, getTicketAvailability } from '@/lib/ticket-availability'
import { type CbtEvent, formatCbtDate, formatCbtPrice } from './CbtEventCard'
import { CBT_INSTAGRAM } from './contact'

const MOSAIC = ['/Eventos/2.png', '/Eventos/3.png', '/Eventos/4.png', '/Eventos/5.png']

function DaysLeft({ date }: { date: string }) {
  const n = daysUntil(date, new Date())
  const label = n === 0 ? '¡Es hoy!' : n === 1 ? 'Falta 1 día' : `Faltan ${n} días`
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#B08F42]/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#D9BE7A]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#B08F42]" aria-hidden />
      {label}
    </span>
  )
}

function HeroCopy({ withEvents }: { withEvents: boolean }) {
  return (
    <div>
      <p className="cbt-eyebrow">Ticketera en línea · Honduras</p>
      <h1 className="cbt-serif mt-4 text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
        Tus entradas en Honduras, <span className="italic text-[#B08F42]">en minutos</span>
      </h1>
      <p className="mt-5 max-w-md text-lg text-[#EDE6D6]/65">
        Compra en línea, recibe tu QR al instante y entra sin filas.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {withEvents ? (
          <Link href={CBT_EVENTS} className="cbt-btn-gold px-7 py-3">
            Ver eventos
          </Link>
        ) : (
          <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="cbt-btn-gold px-7 py-3">
            Seguir en Instagram
          </a>
        )}
        <a href="#organizadores" className="cbt-btn-ghost px-7 py-3">
          Vende con nosotros
        </a>
      </div>
    </div>
  )
}

export function CbtHero({ event }: { event: CbtEvent | null }) {
  if (!event) {
    return (
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 grid grid-cols-2 gap-1 opacity-40 sm:grid-cols-4" aria-hidden>
          {MOSAIC.map((src) => (
            <div key={src} className="bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0B] via-[#0B0B0B]/85 to-[#0B0B0B]/40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="max-w-2xl">
            <HeroCopy withEvents={false} />
            <p className="mt-10 text-sm text-[#EDE6D6]/55">
              <span className="text-[#D9BE7A]">Próximamente nuevos eventos.</span> Síguenos para enterarte primero.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const availability = getTicketAvailability(event)
  const date = formatCbtDate(event.date)
  const venueLine = [event.venueName, event.venueAddress].filter(Boolean).join(' · ')
  const cta =
    availability === 'soldout' ? (
      <span className="inline-flex rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white/50" aria-disabled>
        Agotado
      </span>
    ) : (
      <Link href={cbtEventPath(event.id)} className="cbt-btn-gold px-6 py-2.5 text-sm">
        {availability === 'free' ? 'Ver evento' : 'Comprar entrada'}
      </Link>
    )

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      {event.coverImage && (
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-2xl"
          style={{ backgroundImage: `url(${event.coverImage})` }}
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B]/60 to-[#0B0B0B]" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <HeroCopy withEvents />
        <article className="overflow-hidden rounded-2xl border border-[#B08F42]/35 bg-[#141210]/90 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <p className="cbt-eyebrow">Próximo evento</p>
            <DaysLeft date={event.date} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[0.75fr_1fr]">
            <div className="relative aspect-[16/11] bg-black sm:aspect-[4/5]">
              {event.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.coverImage} alt={event.name} className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/gcbtickets/icon.svg" alt="" className="m-auto h-full w-1/2 opacity-30" />
              )}
            </div>
            <div className="flex min-w-0 flex-col p-5">
              <p className="text-sm text-[#D9BE7A]">{date.long}</p>
              <h2 className="cbt-serif mt-1 text-2xl font-semibold leading-tight sm:text-3xl">{event.name}</h2>
              {venueLine && <p className="mt-2 text-sm text-[#EDE6D6]/60">{venueLine}</p>}
              <div className="mt-auto pt-5">
                <p className="text-xl font-semibold">{formatCbtPrice(event)}</p>
                {availability === 'last' && <p className="mt-1 text-xs font-semibold text-[#D9BE7A]">Últimas entradas</p>}
                <div className="mt-4">{cta}</div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
