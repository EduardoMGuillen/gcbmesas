import Link from 'next/link'
import { CBT_EVENTS, CBT_HOME } from '@/lib/cbtickets-paths'
import { CBT_INSTAGRAM, CBT_SUPPORT_PHONE_LABEL, CBT_SUPPORT_WHATSAPP } from './contact'

export function CbtFooter() {
  return (
    <footer className="relative z-[1] mt-auto border-t border-white/10 bg-black">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href={CBT_HOME} aria-label="GCBTickets inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gcbtickets/logo.svg" alt="GCBTickets" className="h-10 w-auto" />
          </Link>
          <p className="mt-4 max-w-xs text-sm text-[#EDE6D6]/55">
            Entradas en línea para eventos en Honduras. Pago seguro y QR al instante.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm" aria-label="Enlaces">
          <p className="cbt-eyebrow mb-1">Explora</p>
          <Link href={CBT_EVENTS} className="text-[#EDE6D6]/70 hover:text-[#EDE6D6]">Eventos</Link>
          <Link href={`${CBT_HOME}#organizadores`} className="text-[#EDE6D6]/70 hover:text-[#EDE6D6]">Para organizadores</Link>
          <Link href={`${CBT_HOME}#faq`} className="text-[#EDE6D6]/70 hover:text-[#EDE6D6]">Preguntas frecuentes</Link>
          <Link href={`${CBT_HOME}#reembolsos`} className="text-[#EDE6D6]/70 hover:text-[#EDE6D6]">Política de reembolso</Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm">
          <p className="cbt-eyebrow mb-1">Soporte</p>
          <a href={CBT_SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-[#EDE6D6]/70 hover:text-[#EDE6D6]">
            WhatsApp {CBT_SUPPORT_PHONE_LABEL}
          </a>
          <a href={CBT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="text-[#EDE6D6]/70 hover:text-[#EDE6D6]">
            Instagram
          </a>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-[#EDE6D6]/35">
        © {new Date().getFullYear()} GCBTickets · Powered by{' '}
        <a href="https://www.nexusglobalsuministros.com/" target="_blank" rel="noopener noreferrer" className="text-[#B08F42] underline underline-offset-2">
          Nexus Global
        </a>
      </div>
    </footer>
  )
}
