import Link from 'next/link'
import { CBT_EVENTS, CBT_HOME } from '@/lib/cbtickets-paths'
import { CBT_ORGANIZERS_WHATSAPP, CBT_SUPPORT_WHATSAPP } from './_components/contact'

export function CbTicketsHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl backdrop-saturate-150"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={CBT_HOME} className="shrink-0" aria-label="GCBTickets, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gcbtickets/logo-dark.png" alt="GCBTickets" width={143} height={40} className="h-8 w-auto sm:h-9" />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium" aria-label="Principal">
          <Link href={CBT_HOME} className="rounded-full px-2.5 py-2 text-neutral-600 transition-colors hover:text-black sm:px-3">
            Inicio
          </Link>
          <Link href={CBT_EVENTS} className="rounded-full px-2.5 py-2 text-neutral-600 transition-colors hover:text-black sm:px-3">
            Eventos
          </Link>
          <a href={CBT_SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="hidden rounded-full px-3 py-2 text-neutral-600 transition-colors hover:text-black sm:inline">
            Ayuda
          </a>
          <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="gcb-btn gcb-btn-ink ml-2 px-4 py-2 text-sm">
            <span className="sm:hidden">Vender</span>
            <span className="hidden sm:inline">Vende tus entradas</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
