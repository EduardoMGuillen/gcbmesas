import Link from 'next/link'
import { CBT_EVENTS, cbtEventPath } from '@/lib/cbtickets-paths'
import { getTicketAvailability } from '@/lib/ticket-availability'
import type { CbtEvent } from './CbtEventCard'
import { CbtTicket } from './CbtTicket'
import { CBT_ORGANIZERS_WHATSAPP, CBT_SELL_CTA } from './contact'

const TRUST = [
  { title: 'Pago seguro', text: 'Tarjeta procesada por BAC' },
  { title: 'QR al instante', text: 'Llega a tu correo al pagar' },
  { title: 'Soporte real', text: 'Te atendemos por WhatsApp' },
]

export function CbtHero({ event }: { event: CbtEvent | null }) {
  const availability = event ? getTicketAvailability(event) : null
  const primary =
    event && availability !== 'soldout'
      ? { href: cbtEventPath(event.id), label: availability === 'free' ? 'Ver evento' : 'Comprar entrada' }
      : { href: CBT_EVENTS, label: 'Ver eventos' }

  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 70% at 78% 40%, rgba(200,162,87,.18), transparent 70%), radial-gradient(50% 60% at 10% 100%, rgba(34,70,58,.9), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <div>
          <h1 className="cbt-display text-[2.6rem] font-medium leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
            La ticketera de Honduras para tus mejores noches
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-cbt-ivory/70">
            Compra entradas para fiestas, conciertos y eventos en minutos. Pagas con tarjeta y tu QR llega al instante.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={primary.href} className="cbt-btn-gold px-8 py-3.5 text-[15px]">
              {primary.label}
            </Link>
            <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="cbt-btn-line px-7 py-3.5 text-[15px]">
              {CBT_SELL_CTA}
            </a>
          </div>
          <ul className="mt-12 grid max-w-[34rem] grid-cols-3 gap-4 border-t border-cbt-gold/20 pt-6">
            {TRUST.map((t) => (
              <li key={t.title}>
                <p className="text-sm font-semibold text-cbt-gold-hi">{t.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-cbt-ivory/55">{t.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-2 sm:px-6 lg:px-0">
          <CbtTicket event={event} />
        </div>
      </div>
    </section>
  )
}
