'use client'

import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { isStandalonePWA } from '@/lib/pwa-detect'
import { pickFeaturedEvent } from '@/lib/featured-event'
import {
  LcbEventCard,
  LcbFooter,
  LcbHead,
  LcbHeader,
  LcbNoEvents,
  WA_RESERVA_MESA,
  WhatsAppIcon,
  eventCta,
  formatEventDate,
} from './lcb/LcbShared'

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
      <LcbHead />

      <div className="lcb min-h-screen overflow-x-hidden antialiased">
        <LcbHeader buyHref={buyHref} onHome />

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
        <section id="eventos" className="scroll-mt-20 border-y border-white/10 bg-[#100C26] px-4 py-24 sm:px-8" aria-labelledby="eventos-titulo">
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
              <div className="mt-12">
                <LcbNoEvents onDark />
              </div>
            ) : (
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 3).map((e) => (
                  <LcbEventCard key={e.id} event={e} />
                ))}
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

        <LcbFooter />
      </div>
    </>
  )
}
