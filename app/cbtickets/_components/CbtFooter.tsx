import Link from 'next/link'
import { CBT_EVENTS, CBT_HOME } from '@/lib/cbtickets-paths'
import { CBT_INSTAGRAM, CBT_ORGANIZERS_WHATSAPP, CBT_SELL_CTA, CBT_SUPPORT_PHONE_LABEL, CBT_SUPPORT_WHATSAPP } from './contact'

export function CbtFooter() {
  return (
    <footer className="mt-auto border-t border-gcb-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Link href={CBT_HOME} aria-label="GCBTickets, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gcbtickets/logo-dark.png" alt="GCBTickets" width={157} height={44} className="h-10 w-auto" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
            Ticketera en línea de Honduras. Entradas para fiestas, conciertos y eventos con pago seguro y QR al instante.
          </p>
        </div>
        <nav aria-label="Enlaces" className="flex flex-col gap-2.5 text-sm">
          <p className="mb-1 font-semibold">Explora</p>
          <Link href={CBT_EVENTS} className="text-neutral-500 hover:text-black">Eventos en Honduras</Link>
          <Link href={`${CBT_HOME}#faq`} className="text-neutral-500 hover:text-black">Preguntas frecuentes</Link>
          <Link href={`${CBT_HOME}#reembolsos`} className="text-neutral-500 hover:text-black">Política de reembolso</Link>
          <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black">{CBT_SELL_CTA}</a>
        </nav>
        <div className="flex flex-col gap-2.5 text-sm">
          <p className="mb-1 font-semibold">Ayuda</p>
          <a href={CBT_SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black">WhatsApp {CBT_SUPPORT_PHONE_LABEL}</a>
          <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-black">Instagram</a>
        </div>
      </div>
      <div className="border-t border-gcb-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-neutral-400 sm:px-6">
          <p>© {new Date().getFullYear()} GCBTickets</p>
          <p>
            Powered by{' '}
            <a href="https://www.nexusglobalsuministros.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-gcb-gold hover:underline">
              Nexus Global
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
