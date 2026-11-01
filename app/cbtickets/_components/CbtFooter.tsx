import Link from 'next/link'
import { CBT_EVENTS, CBT_HOME } from '@/lib/cbtickets-paths'
import { CBT_INSTAGRAM, CBT_ORGANIZERS_WHATSAPP, CBT_SELL_CTA, CBT_SUPPORT_PHONE_LABEL, CBT_SUPPORT_WHATSAPP } from './contact'

export function CbtFooter() {
  return (
    <footer className="relative z-[1] mt-auto border-t border-cbt-gold/15 bg-[#0C1C17]">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href={CBT_HOME} aria-label="GCBTickets, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gcbtickets/logo.svg" alt="GCBTickets" width={171} height={48} className="h-12 w-auto" />
          </Link>
          <p className="mt-5 max-w-sm leading-relaxed text-cbt-ivory/55">
            GCBTickets es la ticketera en línea de Honduras para comprar entradas de fiestas, conciertos y eventos, con pago seguro y entrada QR al instante.
          </p>
        </div>
        <nav aria-label="Enlaces" className="flex flex-col gap-3 text-[15px]">
          <p className="font-semibold text-cbt-gold-hi">Explora</p>
          <Link href={CBT_EVENTS} className="text-cbt-ivory/65 hover:text-cbt-ivory">Eventos en Honduras</Link>
          <Link href={`${CBT_HOME}#faq`} className="text-cbt-ivory/65 hover:text-cbt-ivory">Preguntas frecuentes</Link>
          <Link href={`${CBT_HOME}#reembolsos`} className="text-cbt-ivory/65 hover:text-cbt-ivory">Política de reembolso</Link>
          <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-cbt-ivory/65 hover:text-cbt-ivory">{CBT_SELL_CTA}</a>
        </nav>
        <div className="flex flex-col gap-3 text-[15px]">
          <p className="font-semibold text-cbt-gold-hi">Ayuda</p>
          <a href={CBT_SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-cbt-ivory/65 hover:text-cbt-ivory">
            WhatsApp {CBT_SUPPORT_PHONE_LABEL}
          </a>
          <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="text-cbt-ivory/65 hover:text-cbt-ivory">Instagram</a>
        </div>
      </div>
      <div className="border-t border-cbt-gold/10 py-6 text-center text-sm text-cbt-ivory/40">
        © {new Date().getFullYear()} GCBTickets. Powered by{' '}
        <a href="https://www.nexusglobalsuministros.com/" target="_blank" rel="noopener noreferrer" className="text-cbt-gold underline underline-offset-4">
          Nexus Global
        </a>
      </div>
    </footer>
  )
}
