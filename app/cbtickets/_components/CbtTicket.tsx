import Link from 'next/link'
import { cbtEventPath } from '@/lib/cbtickets-paths'
import { daysUntil, getTicketAvailability } from '@/lib/ticket-availability'
import { type CbtEvent, formatCbtDate, formatCbtPrice } from './CbtEventCard'

/** QR decorativo y determinista (el QR real llega por correo). */
function PseudoQr({ seed, className }: { seed: string; className?: string }) {
  const N = 21
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
    for (const [ox, oy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
      if (inBox(ox, oy)) {
        const dx = x - ox, dy = y - oy
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0
      }
    }
    return -1
  }
  const cells: string[] = []
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const f = finder(x, y)
      if (f === 1 || (f === -1 && rand() > 0.52)) cells.push(`M${x} ${y}h1v1h-1z`)
    }
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} className={className} aria-hidden shapeRendering="crispEdges">
      <path d={cells.join('')} fill="currentColor" />
    </svg>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-cbt-ink/55">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-semibold leading-tight text-cbt-ink sm:text-sm">{value}</dd>
    </div>
  )
}

/** Boleto de la portada: el próximo evento, o "Tu próxima noche" si no hay eventos a la venta. */
export function CbtTicket({ event }: { event: CbtEvent | null }) {
  const date = event ? formatCbtDate(event.date) : null
  const n = event ? daysUntil(event.date, new Date()) : null
  const countdown = n === null ? 'Muy pronto' : n === 0 ? 'Es hoy' : n === 1 ? 'Falta 1 día' : `Faltan ${n} días`
  const availability = event ? getTicketAvailability(event) : null

  const ticket = (
    <div className="cbt-ticket cbt-paper relative flex overflow-hidden rounded-[22px] text-cbt-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,.8)] [--cut:72%]">
      <div className="relative flex w-[72%] flex-col p-5 sm:p-7">
        <div className="flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gcbtickets/logo-dark.png" alt="" className="h-6 w-auto sm:h-7" />
          <span className="hidden rounded-full border border-cbt-ink/20 px-2.5 py-0.5 text-[11px] font-semibold text-cbt-ink/70 sm:inline">
            Admisión general
          </span>
        </div>
        <p className="cbt-display mt-6 text-[1.9rem] font-semibold leading-[1.05] sm:text-[2.35rem]">
          {event ? event.name : 'Tu próxima noche'}
        </p>
        <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-dashed border-cbt-ink/25 pt-4">
          <Field label="Fecha" value={date ? `${date.day} ${date.month.toLowerCase()}` : 'Muy pronto'} />
          <Field label="Lugar" value={event?.venueName || 'Honduras'} />
          <Field label="Precio" value={event ? formatCbtPrice(event) : 'Pronto'} />
        </dl>
      </div>
      <div className="relative flex w-[28%] flex-col items-center justify-center gap-3 border-l-2 border-dashed border-cbt-ink/25 p-4">
        <PseudoQr seed={event?.id ?? 'gcbtickets'} className="w-full max-w-[96px] text-cbt-ink" />
        <p className="text-center text-xs font-semibold leading-tight text-cbt-ink/75">{countdown}</p>
      </div>
      <div
        className="cbt-foil cbt-sheen pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light"
        style={{ backgroundSize: '300% 100%' }}
        aria-hidden
      />
      <div className="cbt-foil absolute inset-x-0 top-0 h-1.5" aria-hidden />
    </div>
  )

  return (
    <div className="cbt-ticket-in relative mx-auto w-full max-w-[600px] -rotate-[4deg]">
      {event && availability !== 'soldout' ? (
        <Link href={cbtEventPath(event.id)} aria-label={`Comprar entrada para ${event.name}`} className="block transition-transform duration-300 hover:-translate-y-1">
          {ticket}
        </Link>
      ) : (
        ticket
      )}
    </div>
  )
}
