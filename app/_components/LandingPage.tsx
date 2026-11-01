'use client'

import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { isStandalonePWA } from '@/lib/pwa-detect'
import { isPublicFreeCoverOnly } from '@/lib/public-event-pricing'
import { pickFeaturedEvent } from '@/lib/featured-event'

type PublicEvent = {
  id: string
  name: string
  date: Date
  description: string | null
  coverImage: string | null
  coverPrice: number
  paypalPrice: string | null
  maxEntries: number | null
  entriesSoldSum: number
  isFeatured?: boolean
}

interface LandingPageProps {
  events: PublicEvent[]
}

const WA_RESERVAS = 'https://wa.me/50498240217'
const WA_RESERVA_MESA = `${WA_RESERVAS}?text=${encodeURIComponent(
  'Hola, quiero reservar una mesa en La Gran Casa Blanca para el ____. Somos __ personas.'
)}`
const WA_ASTROBOT = 'https://wa.me/50494902444'
const INSTAGRAM = 'https://www.instagram.com/casablanca_sps/'
const FACEBOOK = 'https://www.facebook.com/profile.php?id=61576409706854'
const PLUS_CODE = 'GX47+J2M San Pedro Sula'
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(PLUS_CODE)}`
const MAPS_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(PLUS_CODE)}&z=16&output=embed`
const WAZE_URL = `https://waze.com/ul?q=${encodeURIComponent('La Gran Casa Blanca San Pedro Sula')}&navigate=yes`

const AMBIENTES = [
  {
    name: 'Astronomical',
    logo: '/LogoAstronomical.png',
    photo: '/Eventos/3.png',
    color: '#1FB5A8',
    glow: 'rgba(31,181,168,.55)',
    text: 'La pista principal: reggaetón, urbano y la energía más alta de la noche.',
  },
  {
    name: 'Studio 54',
    logo: '/LogoStudio54.png',
    photo: '/Eventos/4.png',
    color: '#E8C531',
    glow: 'rgba(232,197,49,.5)',
    text: 'Luces, candelabros y DJ en vivo con el espíritu de la disco clásica.',
  },
  {
    name: 'Casa Blanca Beer Garden',
    logo: '/LogoCasaBlanca.png',
    photo: '/Eventos/5.png',
    color: '#C9A15A',
    glow: 'rgba(201,161,90,.5)',
    text: 'Al aire libre, para empezar la noche con una cerveza fría y buena compañía.',
  },
]

const HORARIOS = [
  { dia: 'Jueves', hora: '10 PM a 2 AM' },
  { dia: 'Viernes', hora: '10 PM a 4 AM' },
  { dia: 'Sábado', hora: '10 PM a 4 AM' },
]

const CSS = `
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

function formatEventDate(d: Date) {
  const s = new Date(d).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function eventCta(event: PublicEvent) {
  const free = isPublicFreeCoverOnly(event.coverPrice, event.paypalPrice)
  const soldOut = !free && event.maxEntries != null && event.maxEntries >= 1 && Number(event.entriesSoldSum ?? 0) >= event.maxEntries
  return {
    free,
    soldOut,
    price: free ? 'Entrada libre' : `L ${Number(event.paypalPrice ?? 0).toFixed(2)}`,
    label: soldOut ? 'Agotado' : free ? 'Ver evento' : 'Comprar entrada',
  }
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    </svg>
  )
}

export default function LandingPage({ events }: LandingPageProps) {
  const router = useRouter()

  // PWA instalada: la pantalla pública es solo para navegador; en app siempre ir a login de personal
  useLayoutEffect(() => {
    if (isStandalonePWA()) router.replace('/login')
  }, [router])

  const next = pickFeaturedEvent(events)
  const nextCta = next ? eventCta(next) : null
  const buyHref = next && !nextCta?.soldOut ? `/eventos/${next.id}` : '/eventos'

  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-N9P8433PYZ" strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-N9P8433PYZ');
      `}</Script>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800;900&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="lcb min-h-screen overflow-x-hidden antialiased">
        {/* ─── Header ─── */}
        <header className="fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-[#140F2E]/90 to-transparent" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <a href="#inicio" className="flex items-center gap-3" aria-label="La Gran Casa Blanca, inicio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/LogoCasaBlanca.png" alt="" className="h-11 w-auto" />
              <span className="lcb-display hidden text-2xl uppercase sm:inline">La Gran Casa Blanca</span>
            </a>
            <nav className="flex items-center gap-1 text-[15px] font-medium sm:gap-2" aria-label="Principal">
              <a href="#ambientes" className="hidden rounded-full px-3 py-2 text-white/80 hover:text-white md:inline">Ambientes</a>
              <a href="#eventos" className="hidden rounded-full px-3 py-2 text-white/80 hover:text-white md:inline">Eventos</a>
              <a href="#visitanos" className="hidden rounded-full px-3 py-2 text-white/80 hover:text-white md:inline">Cómo llegar</a>
              <Link href={buyHref} className="lcb-btn lcb-btn-yellow ml-2 px-5 py-2.5 text-sm">
                Comprar entrada
              </Link>
            </nav>
          </div>
        </header>

        {/* ─── Hero: tira de película ─── */}
        <section id="inicio" className="relative flex min-h-[100svh] items-end overflow-hidden">
          <div className="lcb-strip absolute inset-0 grid grid-cols-2 gap-1.5 md:grid-cols-4" aria-hidden>
            {['/Eventos/2.png', '/Eventos/3.png', '/Eventos/4.png', '/Eventos/5.png'].map((src, i) => (
              <div key={src} className={`relative overflow-hidden ${i === 0 || i === 2 ? 'hidden md:block' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#140F2E] via-[#140F2E]/70 to-[#140F2E]/20" aria-hidden />
          <div
            className="absolute inset-0 mix-blend-color opacity-40"
            style={{ background: 'linear-gradient(110deg, #1FB5A8 0%, transparent 40%, #E2457B 75%, #E8C531 100%)' }}
            aria-hidden
          />

          <div className="lcb-rise relative mx-auto w-full max-w-7xl px-4 pb-14 pt-32 sm:px-8 sm:pb-20">
            {next && (
              <Link
                href={`/eventos/${next.id}`}
                className="mb-6 inline-flex max-w-full items-center gap-3 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4 text-sm backdrop-blur-md transition hover:bg-white/15"
              >
                <span className="rounded-full bg-[#E8C531] px-3 py-1 font-bold text-[#140F2E]">{next.isFeatured ? 'Destacado' : 'Próximo'}</span>
                <span className="truncate">
                  {next.name}, {formatEventDate(next.date).toLowerCase()}
                </span>
              </Link>
            )}
            <h1 className="lcb-display max-w-5xl text-[3.6rem] uppercase sm:text-[6rem] lg:text-[8.5rem]">
              Tres ambientes, una sola noche
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
              Astronomical, Studio 54 y Casa Blanca Beer Garden en un mismo lugar en San Pedro Sula. Jueves a sábado desde las 10 PM.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={buyHref} className="lcb-btn lcb-btn-yellow px-8 py-4 text-base">
                {nextCta && !nextCta.soldOut ? nextCta.label : 'Ver eventos'}
              </Link>
              <a href={WA_RESERVA_MESA} target="_blank" rel="noopener noreferrer" className="lcb-btn lcb-btn-glass px-8 py-4 text-base">
                <WhatsAppIcon /> Reservar mesa
              </a>
            </div>
          </div>
        </section>

        {/* ─── Ambientes ─── */}
        <section id="ambientes" className="scroll-mt-20 px-4 py-24 sm:px-8" aria-labelledby="ambientes-titulo">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="ambientes-titulo" className="lcb-display text-6xl uppercase sm:text-7xl">
                Elige tu ambiente
              </h2>
              <p className="max-w-sm text-white/65">Con una sola entrada te mueves entre los tres. Cambia de música sin cambiar de lugar.</p>
            </div>
            <div className="lcb-ambs mt-12 flex flex-col gap-4 lg:h-[560px] lg:flex-row">
              {AMBIENTES.map((a) => (
                <article
                  key={a.name}
                  className="lcb-amb group relative flex min-h-[360px] flex-1 flex-col justify-end overflow-hidden rounded-[28px] p-7 sm:p-9"
                  style={{ background: `linear-gradient(180deg, #1C1640 0%, ${a.color}40 100%)`, boxShadow: `inset 0 0 0 1px ${a.color}55` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.photo} alt="" className="photo absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#140F2E] via-[#140F2E]/40 to-transparent" aria-hidden />
                  <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: a.glow }} aria-hidden />
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.logo} alt={a.name} className="h-20 w-auto max-w-[80%] object-contain object-left drop-shadow-[0_6px_24px_rgba(0,0,0,.6)]" />
                    <h3 className="lcb-display mt-6 text-4xl uppercase" style={{ color: a.color }}>
                      {a.name}
                    </h3>
                    <p className="mt-3 max-w-xs leading-relaxed text-white/75">{a.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Eventos ─── */}
        <section id="eventos" className="scroll-mt-20 bg-[#1C1640] px-4 py-24 sm:px-8" aria-labelledby="eventos-titulo">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="eventos-titulo" className="lcb-display text-6xl uppercase sm:text-7xl">
                Próximos eventos
              </h2>
              {events.length > 0 && (
                <Link href="/eventos" className="lcb-btn lcb-btn-glass px-6 py-3 text-sm">
                  Ver todos
                </Link>
              )}
            </div>

            {events.length === 0 ? (
              <div className="mt-12 grid gap-8 rounded-[28px] bg-[#140F2E] p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
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
            ) : (
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 3).map((e) => {
                  const c = eventCta(e)
                  const card = (
                    <>
                      <div className="relative aspect-[4/5] overflow-hidden bg-[#140F2E]">
                        {e.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.coverImage} alt={`Afiche de ${e.name}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src="/LogoCasaBlanca.png" alt="" className="m-auto h-full w-1/3 object-contain opacity-40" />
                        )}
                        {c.soldOut && (
                          <span className="absolute right-4 top-4 rounded-full bg-[#140F2E]/85 px-3 py-1 text-xs font-bold">Agotado</span>
                        )}
                      </div>
                      <div className="flex items-end justify-between gap-4 p-6">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#E8C531]">{formatEventDate(e.date)}</p>
                          <h3 className="lcb-display mt-1 line-clamp-2 text-3xl uppercase">{e.name}</h3>
                          <p className="mt-1 text-white/70">{c.price}</p>
                        </div>
                        <span className={c.soldOut ? 'text-sm font-bold text-white/50' : 'lcb-btn lcb-btn-yellow shrink-0 px-5 py-2.5 text-sm'}>
                          {c.label}
                        </span>
                      </div>
                    </>
                  )
                  return c.soldOut ? (
                    <div key={e.id} className="overflow-hidden rounded-[24px] bg-[#140F2E] opacity-75">{card}</div>
                  ) : (
                    <Link key={e.id} href={`/eventos/${e.id}`} className="group overflow-hidden rounded-[24px] bg-[#140F2E] transition-transform hover:-translate-y-1">
                      {card}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ─── Reserva ─── */}
        <section className="bg-[#E8C531] px-4 py-20 text-[#140F2E] sm:px-8" aria-labelledby="reserva-titulo">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 id="reserva-titulo" className="lcb-display text-6xl uppercase sm:text-8xl">
                Reserva tu mesa
              </h2>
              <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-[#140F2E]/80">
                Cumpleaños, despedidas o solo porque es viernes. Escríbenos por WhatsApp con la fecha y cuántos son, y te confirmamos tu mesa.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 lg:items-end">
              <a href={WA_RESERVA_MESA} target="_blank" rel="noopener noreferrer" className="lcb-btn lcb-btn-night px-9 py-5 text-lg">
                <WhatsAppIcon size={22} /> Reservar por WhatsApp
              </a>
              <p className="text-sm font-semibold text-[#140F2E]/70">Reservaciones: 9824-0217</p>
            </div>
          </div>
        </section>

        {/* ─── Visítanos ─── */}
        <section id="visitanos" className="scroll-mt-20 px-4 py-24 sm:px-8" aria-labelledby="visitanos-titulo">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 id="visitanos-titulo" className="lcb-display text-6xl uppercase sm:text-7xl">
                Cómo llegar
              </h2>
              <p className="mt-5 text-lg text-white/75">CA-5, San Pedro Sula, Cortés. Estacionamiento disponible y zona de taxis cerca.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="lcb-btn lcb-btn-yellow px-6 py-3 text-sm">
                  Abrir en Google Maps
                </a>
                <a href={WAZE_URL} target="_blank" rel="noopener noreferrer" className="lcb-btn lcb-btn-glass px-6 py-3 text-sm">
                  Abrir en Waze
                </a>
              </div>
              <dl className="mt-12 divide-y divide-white/10 border-y border-white/10">
                {HORARIOS.map((h) => (
                  <div key={h.dia} className="flex items-baseline justify-between py-4">
                    <dt className="lcb-display text-3xl uppercase">{h.dia}</dt>
                    <dd className="text-lg font-semibold text-[#E8C531]">{h.hora}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between py-4 text-white/45">
                  <dt className="lcb-display text-3xl uppercase">Domingo a miércoles</dt>
                  <dd className="text-lg">Cerrado</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-white/45">Los horarios pueden cambiar en eventos especiales.</p>
            </div>
            <div className="min-h-[380px] overflow-hidden rounded-[28px] ring-1 ring-white/10">
              <iframe
                title="Mapa de La Gran Casa Blanca"
                src={MAPS_EMBED}
                className="h-full min-h-[380px] w-full border-0"
                style={{ filter: 'invert(.9) hue-rotate(200deg) saturate(.6) brightness(.95)' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
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
      </div>
    </>
  )
}
