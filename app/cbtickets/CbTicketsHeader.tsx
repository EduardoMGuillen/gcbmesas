import Link from 'next/link'
import { CBT_EVENTS, CBT_HOME } from '@/lib/cbtickets-paths'
import { CBT_SUPPORT_WHATSAPP } from './_components/contact'

export function CbTicketsHeader() {
  return (
    <header
      className="sticky top-0 z-50 shrink-0 border-b border-white/10 bg-[#0B0B0B]/90 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={CBT_HOME} className="shrink-0" aria-label="GCBTickets inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gcbtickets/logo.svg" alt="GCBTickets" className="h-9 w-auto sm:h-11" />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href={CBT_EVENTS} className="px-2 text-sm font-semibold text-[#EDE6D6]/80 hover:text-[#EDE6D6]">
            Eventos
          </Link>
          <a
            href={CBT_SUPPORT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="cbt-btn-ghost px-3 py-1.5 text-sm sm:px-4"
            aria-label="Soporte por WhatsApp"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm5.472-7.618c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            <span className="hidden sm:inline">Soporte</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
