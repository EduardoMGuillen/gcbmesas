import Link from 'next/link'
import { CBT_EVENTS, CBT_HOME } from '@/lib/cbtickets-paths'
import { CBT_ORGANIZERS_WHATSAPP, CBT_SUPPORT_WHATSAPP } from './_components/contact'

export function CbTicketsHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-cbt-gold/15 bg-cbt-night/85 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href={CBT_HOME} className="shrink-0" aria-label="GCBTickets, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gcbtickets/logo.svg" alt="GCBTickets" width={157} height={44} className="h-9 w-auto sm:h-11" />
        </Link>
        <nav className="flex items-center gap-1 text-[15px] sm:gap-2" aria-label="Principal">
          <Link href={CBT_EVENTS} className="rounded-full px-3 py-2 text-cbt-ivory/80 transition-colors hover:text-cbt-ivory">
            Eventos
          </Link>
          <a
            href={CBT_SUPPORT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full px-3 py-2 text-cbt-ivory/80 transition-colors hover:text-cbt-ivory sm:inline-flex"
          >
            Ayuda
          </a>
          <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="cbt-btn-line ml-1 px-4 py-2 text-sm">
            <span className="sm:hidden">Vender</span>
            <span className="hidden sm:inline">Vende tus entradas</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
