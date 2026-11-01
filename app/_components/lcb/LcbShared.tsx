import Link from 'next/link'
import { isPublicFreeCoverOnly } from '@/lib/public-event-pricing'

/** Piezas compartidas del sitio de La Gran Casa Blanca (portada y /eventos). Sin hooks: sirven en server y client. */

export type LcbEvent = {
  id: string
  name: string
  date: Date | string
  coverImage: string | null
  coverPrice: number | string
  paypalPrice: number | string | null
  maxEntries: number | null
  entriesSoldSum: number
}

export const WA_RESERVAS = 'https://wa.me/50498240217'
export const WA_RESERVA_MESA = `${WA_RESERVAS}?text=${encodeURIComponent(
  'Hola, quiero reservar una mesa en La Gran Casa Blanca para el ____. Somos __ personas.'
)}`
export const WA_ASTROBOT = 'https://wa.me/50494902444'
export const INSTAGRAM = 'https://www.instagram.com/casablanca_sps/'
export const FACEBOOK = 'https://www.facebook.com/profile.php?id=61576409706854'

export const LCB_CSS = `
.lcb { --night: #140F2E; --night-2: #1C1640; --cream: #F6F1E7; --astro: #1FB5A8; --magenta: #E2457B; --studio: #E8C531; --gold: #C9A15A;
  font-family: 'Hanken Grotesk', system-ui, sans-serif; background: var(--night); color: var(--cream); }
.lcb-display { font-family: 'Big Shoulders Display', 'Oswald', sans-serif; font-weight: 800; letter-spacing: -0.005em; line-height: .92; }
.lcb :focus-visible { outline: 2px solid var(--studio); outline-offset: 3px; border-radius: 6px; }
.lcb-btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: 9999px; font-weight: 700; transition: transform .2s, background .2s, box-shadow .2s; }
.lcb-btn:hover { transform: translateY(-2px); }
.lcb-btn-yellow { background: var(--studio); color: var(--night); box-shadow: 0 12px 34px -12px rgba(232,197,49,.8); }
.lcb-btn-glass { background: rgba(246,241,231,.08); color: var(--cream); box-shadow: inset 0 0 0 1px rgba(246,241,231,.35); backdrop-filter: blur(10px); }
.lcb-btn-glass:hover { background: rgba(246,241,231,.16); }
.lcb-btn-night { background: var(--night); color: var(--cream); }

@keyframes lcbStrip { from { opacity: 0; transform: translateY(8%) scale(1.04); } to { opacity: 1; transform: none; } }
@keyframes lcbRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.lcb-strip > * { animation: lcbStrip 1.2s cubic-bezier(.2,.8,.2,1) both; }
.lcb-strip > *:nth-child(2) { animation-delay: .12s } .lcb-strip > *:nth-child(3) { animation-delay: .24s } .lcb-strip > *:nth-child(4) { animation-delay: .36s }
.lcb-rise { animation: lcbRise .9s cubic-bezier(.2,.8,.2,1) .45s both; }
@media (prefers-reduced-motion: reduce) { .lcb-strip > *, .lcb-rise { animation: none; } }

.lcb-amb { transition: flex-grow .6s cubic-bezier(.2,.8,.2,1); }
@media (min-width: 1024px) { .lcb-ambs:hover .lcb-amb { flex-grow: .8; } .lcb-ambs .lcb-amb:hover { flex-grow: 1.6; } }
.lcb-amb img.photo { transition: transform .8s cubic-bezier(.2,.8,.2,1), opacity .6s; }
.lcb-amb:hover img.photo { transform: scale(1.05); opacity: .55; }
`

export function LcbHead() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800;900&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: LCB_CSS }} />
    </>
  )
}

export function formatEventDate(d: Date | string) {
  const s = new Date(d).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function eventCta(event: LcbEvent) {
  const free = isPublicFreeCoverOnly(event.coverPrice, event.paypalPrice)
  const soldOut =
    !free && event.maxEntries != null && event.maxEntries >= 1 && Number(event.entriesSoldSum ?? 0) >= event.maxEntries
  return {
    free,
    soldOut,
    price: free ? 'Entrada libre' : `L ${Number(event.paypalPrice ?? 0).toFixed(2)}`,
    label: soldOut ? 'Agotado' : free ? 'Ver evento' : 'Comprar entrada',
  }
}

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    </svg>
  )
}

/** Encabezado fijo. En la portada los enlaces son anclas; en otras páginas apuntan a la portada. */
export function LcbHeader({ buyHref, onHome }: { buyHref: string; onHome: boolean }) {
  const base = onHome ? '' : '/'
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-[#140F2E]/90 to-transparent" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <a href={onHome ? '#inicio' : '/'} className="flex items-center gap-3" aria-label="La Gran Casa Blanca, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LogoCasaBlanca.png" alt="" className="h-11 w-auto" />
          <span className="lcb-display hidden text-2xl uppercase sm:inline">La Gran Casa Blanca</span>
        </a>
        <nav className="flex items-center gap-1 text-[15px] font-medium sm:gap-2" aria-label="Principal">
          <a href={onHome ? '#inicio' : '/'} className="hidden rounded-full px-3 py-2 text-white/80 hover:text-white md:inline">Inicio</a>
          <a href={`${base}#ambientes`} className="hidden rounded-full px-3 py-2 text-white/80 hover:text-white md:inline">Ambientes</a>
          <a href={onHome ? '#eventos' : '/eventos'} className="hidden rounded-full px-3 py-2 text-white/80 hover:text-white md:inline">Eventos</a>
          <a href={`${base}#visitanos`} className="hidden rounded-full px-3 py-2 text-white/80 hover:text-white md:inline">Cómo llegar</a>
          <Link href={buyHref} className="lcb-btn lcb-btn-yellow ml-2 px-5 py-2.5 text-sm">
            Comprar entrada
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function LcbFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0F0B24] px-4 py-14 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LogoAstronomical.png" alt="Astronomical" className="h-8 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LogoCasaBlanca.png" alt="Casa Blanca" className="h-12 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LogoStudio54.png" alt="Studio 54" className="h-8 w-auto" />
          </div>
          <p className="mt-5 max-w-sm text-white/55">La Gran Casa Blanca: Astronomical, Studio 54 y Casa Blanca Beer Garden en San Pedro Sula, Honduras.</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-bold text-[#E8C531]">Contacto</p>
          <a href={WA_RESERVAS} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">Reservaciones: 9824-0217</a>
          <a href={WA_ASTROBOT} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">AstroBot, asistente por WhatsApp: 9490-2444</a>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-bold text-[#E8C531]">Síguenos</p>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">Instagram</a>
          <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">Facebook</a>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/40">
        <p>
          © {new Date().getFullYear()} La Gran Casa Blanca. Powered by{' '}
          <a href="https://www.nexusglobalsuministros.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">
            Nexus Global
          </a>
        </p>
        <Link href="/login" className="hover:text-white">
          Acceso personal
        </Link>
      </div>
    </footer>
  )
}

export function LcbEventCard({ event }: { event: LcbEvent }) {
  const c = eventCta(event)
  const card = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#140F2E]">
        {event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImage} alt={`Afiche de ${event.name}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/LogoCasaBlanca.png" alt="" className="m-auto h-full w-1/3 object-contain opacity-40" />
        )}
        {c.soldOut && <span className="absolute right-4 top-4 rounded-full bg-[#140F2E]/85 px-3 py-1 text-xs font-bold">Agotado</span>}
      </div>
      <div className="flex items-end justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#E8C531]">{formatEventDate(event.date)}</p>
          <h3 className="lcb-display mt-1 line-clamp-2 text-3xl uppercase">{event.name}</h3>
          <p className="mt-1 text-white/70">{c.price}</p>
        </div>
        <span className={c.soldOut ? 'text-sm font-bold text-white/50' : 'lcb-btn lcb-btn-yellow shrink-0 px-5 py-2.5 text-sm'}>{c.label}</span>
      </div>
    </>
  )
  return c.soldOut ? (
    <div className="overflow-hidden rounded-[24px] bg-[#140F2E] opacity-75">{card}</div>
  ) : (
    <Link href={`/eventos/${event.id}`} className="group overflow-hidden rounded-[24px] bg-[#140F2E] transition-transform hover:-translate-y-1">
      {card}
    </Link>
  )
}

/** Estado sin eventos: invita a seguir en Instagram o reservar mesa. */
export function LcbNoEvents({ onDark = false }: { onDark?: boolean }) {
  return (
    <div className={`grid gap-8 rounded-[28px] ${onDark ? 'bg-[#1C1640] ring-1 ring-white/10' : 'bg-[#140F2E]'} p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center`}>
      <div>
        <p className="lcb-display text-4xl uppercase text-[#E8C531] sm:text-5xl">El próximo evento se anuncia pronto</p>
        <p className="mt-4 max-w-lg text-white/70">
          Mientras tanto, abrimos jueves, viernes y sábado. Sigue nuestro Instagram para enterarte primero de los line-ups.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
        <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="lcb-btn lcb-btn-yellow px-7 py-4">
          Seguir en Instagram
        </a>
        <a href={WA_RESERVA_MESA} target="_blank" rel="noopener noreferrer" className="lcb-btn lcb-btn-glass px-7 py-4">
          <WhatsAppIcon /> Reservar mesa este fin de semana
        </a>
      </div>
    </div>
  )
}
