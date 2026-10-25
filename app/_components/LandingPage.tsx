'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { isStandalonePWA } from '@/lib/pwa-detect'
import { isPublicFreeCoverOnly } from '@/lib/public-event-pricing'
import HalloweenContest from './HalloweenContest'

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
}

interface LandingPageProps {
  events: PublicEvent[]
}

export default function LandingPage({ events }: LandingPageProps) {
  const router = useRouter()
  const vantaRef = useRef<HTMLDivElement>(null)
  const vantaEffect = useRef<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // PWA instalada: la pantalla pública es solo para navegador; en app siempre ir a login de personal
  useLayoutEffect(() => {
    if (isStandalonePWA()) {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadVanta = async () => {
      if (isStandalonePWA()) return
      if (!(window as any).THREE) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'
          s.onload = () => resolve()
          s.onerror = reject
          document.head.appendChild(s)
        })
      }
      if (!(window as any).VANTA) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js'
          s.onload = () => resolve()
          s.onerror = reject
          document.head.appendChild(s)
        })
      }
      if (vantaRef.current && !vantaEffect.current) {
        vantaEffect.current = (window as any).VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0xff5a1f,
          backgroundColor: 0x07040a,
          points: 7.0,
          maxDistance: 18.0,
          spacing: 28.0,
          showDots: false,
        })
      }
    }
    loadVanta()
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy()
        vantaEffect.current = null
      }
    }
  }, [])

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const navLinks = [
    { label: 'Inicio',    id: 'hero' },
    ...(Date.now() < Date.UTC(2026, 10, 1, 12) ? [{ label: 'Concurso', id: 'halloween' }] : []),
    { label: 'Eventos',   id: 'eventos' },
    { label: 'Ubicación', id: 'ubicacion' },
    { label: 'Horarios',  id: 'horarios' },
    { label: 'Contacto',  id: 'contacto' },
  ]

  const latestEvents = events.slice(0, 3)

  // La temática del evento se muestra hasta la mañana del 1 de noviembre (hora de Honduras)
  const halloweenActive = Date.now() < Date.UTC(2026, 10, 1, 12)
  const halloweenEvent = events.find(e => /halloween/i.test(e.name))

  return (
    <>
      {/* Google Analytics */}
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-N9P8433PYZ" strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-N9P8433PYZ');
      `}</Script>

      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&family=Creepster&family=Oswald:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .landing {
          --void: #07040a;
          --void-2: #120609;
          --blood: #c8141c;
          --blood-deep: #6e0409;
          --ember: #ff6a1a;
          --bone: #ede3cf;
          --gold: #c9a15a;
          --fog: #8e8597;
          --line: rgba(237,227,207,0.12);
        }
        .landing * { box-sizing: border-box; }
        .landing { font-family: 'Barlow', sans-serif; color: var(--bone); overflow-x: hidden; }
        .landing :focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
        .orbitron { font-family: 'Oswald', sans-serif; }
        .section-title {
          font-family: 'Oswald', sans-serif;
          font-size: clamp(2.1rem, 5.5vw, 3.4rem);
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          text-align: center;
          color: var(--bone);
          margin: 0 0 3rem;
          text-shadow: 0 0 24px rgba(200,20,28,0.45);
        }
        .section-title::after {
          content: '';
          display: block;
          width: 64px; height: 3px; margin: 0.9rem auto 0;
          background: var(--blood);
          box-shadow: 0 0 14px rgba(200,20,28,0.8);
        }
        /* Nav */
        .nav-link {
          color: var(--bone);
          text-decoration: none;
          font-family: 'Oswald', sans-serif;
          font-weight: 500;
          font-size: 0.98rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          position: relative;
          transition: color 0.25s;
          cursor: pointer;
          background: none;
          border: none;
          white-space: nowrap;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -5px; left: 0;
          width: 0; height: 2px;
          background: var(--blood);
          transition: width 0.25s;
        }
        .nav-link:hover { color: #fff; }
        .nav-link:hover::after { width: 100%; }
        .nav-desktop { display: flex; gap: 2rem; align-items: center; }
        .nav-hamburger { display: none; }
        .nav-mobile-menu {
          display: none;
          flex-direction: column;
          padding: 0.5rem 0 1rem;
          border-top: 1px solid var(--line);
        }
        .nav-mobile-menu.open { display: flex; }
        .nav-mobile-link {
          color: var(--bone); background: none; border: none;
          font-family: 'Oswald', sans-serif; font-size: 1.05rem; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          padding: 0.85rem 1.5rem; text-align: left; cursor: pointer; width: 100%;
          transition: background 0.2s, color 0.2s;
        }
        .nav-mobile-link:hover { background: rgba(200,20,28,0.12); color: #fff; }
        @media (max-width: 760px) {
          .nav-desktop { display: none; }
          .nav-hamburger { display: flex; align-items: center; justify-content: center; }
        }
        /* Buttons */
        .btn-primary, .btn-secondary {
          padding: 0.85rem 1.9rem;
          border-radius: 999px;
          font-family: 'Oswald', sans-serif;
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          display: inline-block;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s, border-color 0.2s;
        }
        .btn-primary {
          background: linear-gradient(180deg, #e3161f, #8a0006);
          color: #fff;
          border: none;
          box-shadow: 0 8px 26px rgba(200,20,28,0.35);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 34px rgba(200,20,28,0.55); }
        .btn-secondary {
          background: rgba(7,4,10,0.55);
          color: var(--bone);
          border: 1px solid rgba(201,161,90,0.6);
        }
        .btn-secondary:hover { transform: translateY(-2px); border-color: var(--gold); background: rgba(201,161,90,0.1); }
        .glow-btn { animation: none; }
        /* Cards */
        .glass-card {
          background: linear-gradient(180deg, rgba(30,8,12,0.85), rgba(12,4,7,0.92));
          border: 1px solid var(--line);
          border-radius: 18px;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
        }
        .glass-card:hover {
          transform: translateY(-6px);
          border-color: rgba(200,20,28,0.55);
          box-shadow: 0 20px 44px rgba(110,4,9,0.45);
        }
        /* Social */
        .social-btn {
          width: 46px; height: 46px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; color: #fff;
          transition: transform 0.25s, box-shadow 0.25s;
          position: relative; overflow: hidden;
        }
        .social-btn:hover { transform: translateY(-4px); box-shadow: 0 0 0 2px var(--void), 0 0 0 4px var(--blood); }
        .social-btn svg { position: relative; z-index: 2; }
        /* Hero */
        .hero-wrap { position: relative; isolation: isolate; }
        .hero-wrap::before {
          content: '';
          position: absolute; left: 50%; top: 42%;
          width: min(900px, 120vw); height: 520px;
          transform: translate(-50%, -50%);
          background: radial-gradient(ellipse at center, rgba(200,20,28,0.32), rgba(110,4,9,0.12) 45%, transparent 70%);
          z-index: -1; pointer-events: none;
        }
        .hero-fog {
          position: absolute; left: 0; right: 0; bottom: 0; height: 38vh;
          background: linear-gradient(180deg, transparent, rgba(7,4,10,0.85) 70%, var(--void));
          pointer-events: none;
        }
        .hero-logos {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: clamp(32px, 6vw, 80px);
          margin-bottom: 2.5rem;
        }
        .logo-astronomical { order: 1; height: clamp(60px, 9vw, 100px);  width: auto; object-fit: contain; }
        .logo-casablanca   { order: 2; height: clamp(90px, 14vw, 160px); width: auto; object-fit: contain; filter: drop-shadow(0 0 18px rgba(201,161,90,0.35)); }
        .logo-studio       { order: 3; height: clamp(60px, 9vw, 100px);  width: auto; object-fit: contain; }
        @media (max-width: 600px) {
          .hero-logos { flex-direction: column; gap: 18px; margin-bottom: 2rem; }
          .logo-astronomical { order: 1; height: 60px; }
          .logo-studio       { order: 2; height: 60px; }
          .logo-casablanca   { order: 3; height: 84px; }
        }
        .hero-title {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: clamp(2.2rem, 7vw, 4.6rem);
          line-height: 1.02;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          color: var(--bone);
          margin: 0 0 0.9rem;
          text-shadow: 0 2px 0 #2a0204, 0 0 30px rgba(200,20,28,0.5);
        }
        .hero-title span { display: block; color: var(--blood); font-size: 0.55em; letter-spacing: 0.32em; margin-top: 0.35rem; text-shadow: 0 0 22px rgba(200,20,28,0.6); }
        .hero-when {
          font-size: clamp(1rem, 2.4vw, 1.2rem);
          color: var(--gold);
          font-weight: 500;
          margin: 0 0 2.2rem;
        }
        .hero-tagline { font-size: clamp(1rem, 2.5vw, 1.25rem); margin-bottom: 2.4rem; color: rgba(237,227,207,0.78); font-weight: 300; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.9s ease both; }
        /* Hours */
        .hours-card {
          background: rgba(18,6,9,0.8);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 1.5rem 1rem;
          text-align: center;
          transition: border-color 0.25s;
        }
        .hours-card:hover { border-color: rgba(200,20,28,0.55); }
        .hours-card.closed { opacity: 0.55; }
        .hours-special {
          margin: 2rem auto 0; max-width: 620px; text-align: center;
          padding: 1rem 1.25rem; border-radius: 14px;
          border: 1px dashed rgba(201,161,90,0.55); color: var(--bone);
          background: rgba(201,161,90,0.06);
        }
        .hours-special strong { color: var(--gold); }
        /* Map */
        .map-frame { border-radius: 18px; overflow: hidden; border: 1px solid rgba(200,20,28,0.35); box-shadow: 0 0 40px rgba(110,4,9,0.4); }
        .map-frame iframe { filter: invert(0.92) hue-rotate(180deg) saturate(0.55) brightness(0.9); }
        /* Halloween */
        .hw-bat {
          position: fixed; z-index: 0; pointer-events: none; color: #120206;
          filter: drop-shadow(0 0 4px rgba(255,106,26,0.75)) drop-shadow(0 0 12px rgba(200,20,28,0.4));
          animation: hwFly linear infinite;
        }
        @keyframes hwFly {
          0%   { transform: translate(-10vw, 0) scale(0.9); }
          25%  { transform: translate(25vw, -4vh) scale(1); }
          50%  { transform: translate(55vw, 3vh) scale(0.85); }
          75%  { transform: translate(85vw, -3vh) scale(1); }
          100% { transform: translate(115vw, 0) scale(0.9); }
        }
        .hw-bat svg { animation: hwFlap 0.35s ease-in-out infinite alternate; transform-origin: center; }
        @keyframes hwFlap { from { transform: scaleY(1); } to { transform: scaleY(0.55); } }
        @media (prefers-reduced-motion: reduce) {
          .hw-bat { display: none; }
          .fade-up { animation: none; }
        }
      ` }} />

      <div className="landing" style={{ background: 'var(--void)', minHeight: '100vh' }}>

        {/* Vanta animated background */}
        <div
          ref={vantaRef}
          style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        />

        {/* Halloween bats */}
        {[
          { top: '18%', size: 34, dur: 22, delay: 0 },
          { top: '42%', size: 22, dur: 30, delay: -9 },
          { top: '70%', size: 28, dur: 26, delay: -17 },
        ].map((b, i) => (
          <div key={i} className="hw-bat" aria-hidden style={{ top: b.top, left: 0, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}>
            <svg width={b.size} height={b.size * 0.5} viewBox="0 0 64 32" fill="currentColor">
              <path d="M32 10c-1.6-3-3.4-4-3.4-4l.9 4.6C26 9 22 9.5 19 12c-1.2-4-5-7-10-7 2 2.4 2.6 5 2 7.5C8 11 4 11.8 0 15c5 0 8.5 2 10 5 1.8-2.2 5-3 7.5-2 .6 3 2.6 5.6 5.5 7 .5-2.3 2-4 4-4.6L32 28l5-7.6c2 .6 3.5 2.3 4 4.6 2.9-1.4 4.9-4 5.5-7 2.5-1 5.7-.2 7.5 2 1.5-3 5-5 10-5-4-3.2-8-4-11-2.5-.6-2.5 0-5.1 2-7.5-5 0-8.8 3-10 7-3-2.5-7-3-10.5-1.4l.9-4.6s-1.8 1-3.4 4z"/>
            </svg>
          </div>
        ))}

        {/* ─── NAVBAR ─────────────────────────────────── */}
        <nav
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
            background: scrolled ? 'rgba(7,4,10,0.96)' : 'rgba(7,4,10,0.7)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(200,20,28,0.22)',
            transition: 'background 0.3s',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          {/* Top bar */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Desktop nav links */}
            <div className="nav-desktop">
              {navLinks.map(l => (
                <button key={l.id} className="nav-link" onClick={() => scrollTo(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Mobile: hamburger + login */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link href="/login" className="btn-primary" style={{ padding: '0.45rem 1.2rem', fontSize: '0.875rem' }}>
                Login
              </Link>
              <button
                className="nav-hamburger"
                onClick={() => setMenuOpen(v => !v)}
                style={{ background: 'none', border: '1px solid rgba(201,161,90,0.5)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--bone)' }}
                aria-label="Menú"
              >
                {menuOpen ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          <div className={`nav-mobile-menu ${menuOpen ? 'open' : ''}`}>
            {navLinks.map(l => (
              <button key={l.id} className="nav-mobile-link" onClick={() => scrollTo(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Page content */}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* ─── HERO ──────────────────────────────────── */}
          <section
            id="hero"
            className="hero-wrap"
            style={{
              minHeight: '100svh',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', padding: '0 1.25rem 3rem', paddingTop: 'calc(96px + env(safe-area-inset-top))',
            }}
          >
            <div className="hero-fog" />
            <div style={{ maxWidth: 900, position: 'relative' }} className="fade-up">
              {/* Logos */}
              <div className="hero-logos">
                <Image src="/LogoAstronomical.png" alt="Astronomical" width={400} height={120} className="logo-astronomical" />
                <Image src="/LogoCasaBlanca.png"   alt="Casa Blanca"  width={200} height={200} className="logo-casablanca" />
                <Image src="/LogoStudio54.png"      alt="Studio 54"   width={400} height={120} className="logo-studio" />
              </div>

              {halloweenActive ? (
                <>
                  <h1 className="hero-title">
                    Resident Evil
                    <span>Halloween Party</span>
                  </h1>
                  <p className="hero-when">Sábado 31 de octubre, 8 PM. Concurso de disfraces con iPhone 18 Pro Max para el primer lugar.</p>
                </>
              ) : (
                <p className="hero-tagline">La mejor experiencia nocturna de San Pedro Sula</p>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                {halloweenActive ? (
                  <>
                    {halloweenEvent ? (
                      <Link href={`/eventos/${halloweenEvent.id}`} className="btn-primary">Comprar entrada</Link>
                    ) : (
                      <button className="btn-primary" onClick={() => scrollTo('eventos')}>Comprar entrada</button>
                    )}
                    <button className="btn-secondary" onClick={() => scrollTo('halloween')}>Inscribirme al concurso</button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={() => scrollTo('eventos')}>Ver Eventos</button>
                )}
                {!halloweenActive && (
                  <>
                    <a href="https://wa.me/50498240217" target="_blank" rel="noopener noreferrer" className="btn-secondary glow-btn">
                      Contactar
                    </a>
                    <a href="https://wa.me/50494902444" target="_blank" rel="noopener noreferrer" className="btn-secondary glow-btn" aria-label="AstroBot WhatsApp">
                      AstroBot
                    </a>
                  </>
                )}
              </div>

              {/* Social icons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem' }}>
                <a href="https://wa.me/50494902444" target="_blank" rel="noopener noreferrer" className="social-btn" style={{ background: 'linear-gradient(45deg,#25d366,#128c7e)' }} title="AstroBot · WhatsApp" aria-label="AstroBot WhatsApp">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                </a>
                <a href="https://www.instagram.com/casablanca_sps/" target="_blank" rel="noopener noreferrer" className="social-btn" style={{ background: 'linear-gradient(45deg,#e4405f,#fd1d1d,#fcb045)' }}>
                  <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61576409706854" target="_blank" rel="noopener noreferrer" className="social-btn" style={{ background: 'linear-gradient(45deg,#1877f2,#42a5f5)' }}>
                  <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
            </div>
          </section>

          {/* ─── HALLOWEEN CONTEST ─────────────────────── */}
          {halloweenActive && <HalloweenContest />}

          {/* ─── EVENTS ────────────────────────────────── */}
          <section id="eventos" style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
            <h2 className="section-title">PRÓXIMOS EVENTOS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {latestEvents.map(event => {
                const eventDate = new Date(event.date)
                const dayNum   = eventDate.toLocaleDateString('es-HN', { day: 'numeric', timeZone: 'UTC' })
                const monthStr = eventDate.toLocaleDateString('es-HN', { month: 'long', timeZone: 'UTC' })
                const weekday  = eventDate.toLocaleDateString('es-HN', { weekday: 'long', timeZone: 'UTC' })
                const price    = Number(event.paypalPrice)
                const freeOnly = isPublicFreeCoverOnly(event.coverPrice, event.paypalPrice)
                const soldOut =
                  !freeOnly &&
                  event.maxEntries != null &&
                  event.maxEntries >= 1 &&
                  Number(event.entriesSoldSum ?? 0) >= event.maxEntries
                return (
                  <div key={event.id} className="glass-card">
                    {event.coverImage && (
                      <img
                        src={event.coverImage}
                        alt={event.name}
                        style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: '20px 20px 0 0' }}
                      />
                    )}
                    <div style={{ padding: '1.8rem' }}>
                      <p style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: '0.6rem', fontSize: '1.05rem' }}>
                        {weekday.charAt(0).toUpperCase() + weekday.slice(1)} {dayNum} de {monthStr.charAt(0).toUpperCase() + monthStr.slice(1)} · 9:00 PM
                      </p>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.8rem' }}>{event.name}</h3>
                      {event.description && (
                        <p style={{ color: 'rgba(237,227,207,0.65)', marginBottom: '1.2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                          {event.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ color: 'var(--bone)', fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: '1.25rem' }}>
                          {freeOnly ? 'Cover gratuito' : `L ${price.toFixed(2)}`}
                        </span>
                        {soldOut ? (
                          <span
                            className="btn-primary"
                            style={{ padding: '0.55rem 1.4rem', fontSize: '0.9rem', opacity: 0.7, pointerEvents: 'none' }}
                          >
                            Sold Out
                          </span>
                        ) : (
                          <Link href={`/eventos/${event.id}`} className="btn-primary" style={{ padding: '0.55rem 1.4rem', fontSize: '0.9rem' }}>
                            {freeOnly ? 'Ver evento' : 'Comprar Entrada'}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Próximamente card */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 2rem', minHeight: 280 }}>
                <p className="orbitron" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--bone)', textShadow: '0 0 20px rgba(200,20,28,0.5)', marginBottom: '1.5rem', textAlign: 'center' }}>
                  PRÓXIMAMENTE
                </p>
                <a href="https://www.instagram.com/casablanca_sps/" target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Más Información
                </a>
              </div>
            </div>

            {/* Ver todos */}
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <Link href="/eventos" className="btn-primary">
                Ver Todos los Eventos →
              </Link>
            </div>
          </section>

          {/* ─── LOCATION ──────────────────────────────── */}
          <section id="ubicacion" style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
            <h2 className="section-title">UBICACIÓN</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--gold)', marginBottom: '1rem', fontFamily: "'Oswald', sans-serif", fontWeight: 600 }}>
                  Encuéntranos en San Pedro Sula
                </h3>
                <p style={{ color: 'rgba(237,227,207,0.75)', fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                  Astronomical, Studio 54 y Casa Blanca, los tres ambientes más emocionantes de San Pedro Sula, te esperan en un mismo lugar.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {[
                    { icon: '📍', text: 'GX47+J2M, CA-5, 21104 San Pedro Sula, Cortés' },
                    { icon: '🚗', text: 'Fácil acceso en vehículo' },
                    { icon: '🅿️', text: 'Estacionamiento disponible' },
                    { icon: '🚕', text: 'Zona de taxis cerca' },
                  ].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0.5rem 0', color: 'rgba(237,227,207,0.7)', fontSize: '1rem' }}>
                      <span style={{ fontSize: '1.1rem', minWidth: 24 }}>{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="map-frame">
                <iframe
                  title="Ubicación"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3774.3!2d-88.0337!3d15.5056!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTXCsDMwJzIwLjIiTiA4OMKwMDInMDEuMyJX!5e0!3m2!1ses!2shn!4v1"
                  width="100%"
                  height="380"
                  style={{ border: 'none', display: 'block' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </section>

          {/* ─── HOURS ─────────────────────────────────── */}
          <section id="horarios" style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
            <h2 className="section-title">HORARIOS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
              {[
                { day: 'Jueves',           time: '10:00 PM\n2:00 AM'  },
                { day: 'Viernes',          time: '10:00 PM\n4:00 AM'  },
                { day: 'Sábado',           time: '10:00 PM\n4:00 AM'  },
                { day: 'Domingo',          time: 'Cerrado'            },
                { day: 'Lunes – Miércoles', time: 'Cerrado'           },
              ].map(({ day, time }) => (
                <div key={day} className={`hours-card ${time === 'Cerrado' ? 'closed' : ''}`}>
                  <p style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--gold)', marginBottom: '0.5rem', fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }}>
                    {day}
                  </p>
                  <p style={{ color: 'rgba(237,227,207,0.75)', whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {time}
                  </p>
                </div>
              ))}
            </div>
            {halloweenActive && (
              <p className="hours-special">
                <strong>Sábado 31 de octubre:</strong> abrimos a las 8 PM por la Resident Evil Halloween Party. Inscripciones al concurso de 7 a 11 PM.
              </p>
            )}
            <p style={{ textAlign: 'center', color: 'var(--fog)', marginTop: '1.5rem', fontSize: '0.85rem' }}>
              Los horarios pueden variar según eventos especiales
            </p>
          </section>

          {/* ─── CONTACT / SOCIAL ──────────────────────── */}
          <section id="contacto" style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <h2 className="section-title">CONTACTO</h2>
            <p style={{ color: 'rgba(237,227,207,0.6)', marginBottom: '2rem', fontSize: '1.05rem' }}>
              Reservaciones y consultas
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <a href="https://wa.me/50494902444" target="_blank" rel="noopener noreferrer"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                aria-label="AstroBot WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                AstroBot
              </a>
              <a href="https://wa.me/50498240217" target="_blank" rel="noopener noreferrer"
                className="btn-secondary glow-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                9824-0217
              </a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem' }}>
              <a href="https://www.instagram.com/casablanca_sps/" target="_blank" rel="noopener noreferrer" className="social-btn" style={{ background: 'linear-gradient(45deg,#e4405f,#fd1d1d,#fcb045)' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61576409706854" target="_blank" rel="noopener noreferrer" className="social-btn" style={{ background: 'linear-gradient(45deg,#1877f2,#42a5f5)' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
          </section>

          {/* ─── FOOTER ────────────────────────────────── */}
          <footer style={{ background: 'rgba(0,0,0,0.85)', borderTop: '1px solid rgba(237,227,207,0.08)', padding: '2.5rem 2rem', textAlign: 'center' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(16px, 4vw, 48px)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <Image src="/LogoStudio54.png" alt="Studio 54" width={100} height={32} style={{ height: 28, width: 'auto', objectFit: 'contain', opacity: 0.5 }} />
                <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={50} height={50} style={{ height: 38, width: 'auto', objectFit: 'contain', opacity: 0.5 }} />
                <Image src="/LogoAstronomical.png" alt="Astronomical" width={100} height={32} style={{ height: 28, width: 'auto', objectFit: 'contain', opacity: 0.5 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { href: 'https://wa.me/50498240217', bg: 'linear-gradient(45deg,#25d366,#128c7e)', title: 'WhatsApp · Chat', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg> },
                  { href: 'https://wa.me/50494902444', bg: 'linear-gradient(45deg,#1e3a5f,#2563eb)', title: 'AstroBot · WhatsApp', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg> },
                  { href: 'https://www.instagram.com/casablanca_sps/', bg: 'linear-gradient(45deg,#e4405f,#fd1d1d,#fcb045)', title: 'Instagram', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
                  { href: 'https://www.facebook.com/profile.php?id=61576409706854', bg: '#1877f2', title: 'Facebook', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                ].map(({ href, bg, icon, title }, i) => (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer" title={title} aria-label={title}
                    style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: bg, transition: 'transform 0.3s', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15) translateY(-3px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {icon}
                  </a>
                ))}
              </div>
              <p style={{ color: 'rgba(237,227,207,0.3)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                © {new Date().getFullYear()} La Gran Casa Blanca · San Pedro Sula, Honduras · Todos los derechos reservados
              </p>
              <p style={{ color: 'rgba(237,227,207,0.25)', fontSize: '0.8rem' }}>
                Powered by{' '}
                <a href="https://www.nexusglobalsuministros.com/" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--gold)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Nexus Global
                </a>
              </p>
            </div>
          </footer>

        </div>
      </div>
    </>
  )
}
