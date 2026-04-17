import Image from 'next/image'
import Link from 'next/link'

export function CbTicketsHeader() {
  return (
    <header
      className="shrink-0 border-b border-amber-200/50 bg-white/95 backdrop-blur-md shadow-sm relative"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-center">
        <Link href="/cbtickets" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image
            src="/LogoCasaBlanca.png"
            alt="Casa Blanca"
            width={56}
            height={56}
            className="h-11 w-11 sm:h-14 sm:w-14 object-contain shrink-0"
            priority
          />
          <div className="min-w-0 text-left">
            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-amber-700">GCBTickets</p>
            <p className="text-xs sm:text-sm font-semibold text-stone-800 leading-tight truncate">La Gran Casa Blanca</p>
          </div>
        </Link>
      </div>
    </header>
  )
}
