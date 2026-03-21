'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type PublicEvent = {
  id: string
  name: string
  date: Date
  description: string | null
  coverImage: string | null
  paypalPrice: string | null
}

interface LandingPageProps {
  events: PublicEvent[]
}

export default function LandingPage({ events }: LandingPageProps) {
  const vantaRef = useRef<HTMLDivElement>(null)
  const vantaEffect = useRef<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadVanta = async () => {
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
      if (vantaRef.current && !(vantaEffect.current)) {
        vantaEffect.current = (window as any).VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0x00ffff,
          backgroundColor: 0x050015,
          points: 15.0,
          maxDistance: 25.0,
          spacing: 18.0,
          showDots: true,
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
    { label: 'Eventos',   id: 'eventos' },
    { label: 'Ubicación', id: 'ubicacion' },
    { label: 'Horarios',  id: 'horarios' },
    { label: 'Contacto',  id: 'contacto' },
  ]

  const latestEvents = events.slice(0, 3)

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        .landing * { box-sizing: border-box; }
        .landing { font-family: 'Exo 2', sans-serif; color: #fff; overflow-x: hidden; }
        .orbitron { font-family: 'Orbitron', monospace; }
        .gradient-text {
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .section-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 700;
          text-align: center;
          margin-bottom: 3rem;
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        /* Nav */
        .nav-link {
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          position: relative;
          transition: color 0.3s;
          cursor: pointer;
          background: none;
          border: none;
          font-family: 'Exo 2', sans-serif;
          font-size: 1rem;
          white-space: nowrap;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          transition: width 0.3s;
        }
        .nav-link:hover::after { width: 100%; }
        .nav-desktop { display: flex; gap: 2rem; align-items: center; }
        .nav-hamburger { display: none; }
        .nav-mobile-menu {
          display: none;
          flex-direction: column;
          gap: 0;
          padding: 0.5rem 0 1rem;
          border-top: 1px solid rgba(0,255,255,0.08);
        }
        .nav-mobile-menu.open { display: flex; }
        .nav-mobile-link {
          color: #fff; background: none; border: none;
          font-family: 'Exo 2', sans-serif; font-size: 1rem; font-weight: 600;
          padding: 0.85rem 1.5rem; text-align: left; cursor: pointer; width: 100%;
          transition: background 0.2s, color 0.2s;
        }
        .nav-mobile-link:hover { background: rgba(0,255,255,0.06); color: #00ffff; }
        @media (max-width: 680px) {
          .nav-desktop { display: none; }
          .nav-hamburger { display: flex; align-items: center; justify-content: center; }
        }
        /* Buttons */
        .btn-primary {
          padding: 0.85rem 2rem;
          border-radius: 50px;
          font-weight: 700;
          font-family: 'Exo 2', sans-serif;
          font-size: 1rem;
          text-decoration: none;
          display: inline-block;
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          color: #000;
          border: none;
          cursor: pointer;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,255,255,0.35);
        }
        .btn-secondary {
          padding: 0.85rem 2rem;
          border-radius: 50px;
          font-weight: 700;
          font-family: 'Exo 2', sans-serif;
          font-size: 1rem;
          text-decoration: none;
          display: inline-block;
          background: transparent;
          color: #fff;
          border: 2px solid #00ffff;
          cursor: pointer;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .btn-secondary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,255,255,0.2);
        }
        .glow-btn {
          animation: pulseGlow 2s infinite;
        }
        @keyframes pulseGlow {
          0%   { box-shadow: 0 0 15px rgba(0,255,255,0.6); border-color: #00ffff; }
          50%  { box-shadow: 0 0 30px rgba(255,0,255,0.8); border-color: #ff00ff; }
          100% { box-shadow: 0 0 15px rgba(0,255,255,0.6); border-color: #00ffff; }
        }
        /* Cards */
        .glass-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
          position: relative;
          overflow: hidden;
        }
        .glass-card::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
          transition: left 0.5s;
        }
        .glass-card:hover::before { left: 100%; }
        .glass-card:hover {
          transform: translateY(-10px);
          border-color: rgba(0,255,255,0.45);
          box-shadow: 0 20px 40px rgba(0,255,255,0.15);
        }
        /* Social */
        .social-btn {
          width: 48px; height: 48px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; color: #fff;
          transition: transform 0.3s;
          position: relative; overflow: hidden;
        }
        .social-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          opacity: 0; transition: opacity 0.3s; border-radius: 50%;
        }
        .social-btn:hover::before { opacity: 1; }
        .social-btn:hover { transform: translateY(-5px) scale(1.1); }
        .social-btn svg { position: relative; z-index: 2; }
        /* Hero logos */
        .hero-logos {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: clamp(32px, 6vw, 80px);
          margin-bottom: 2.5rem;
        }
        .hero-logo-astronomical { height: clamp(60px, 10vw, 110px); width: auto; object-fit: contain; }
        .hero-logo-studio       { height: clamp(60px, 10vw, 110px); width: auto; object-fit: contain; }
        .hero-logo-casa         { height: clamp(80px, 13vw, 140px); width: auto; object-fit: contain; }
        @media (max-width: 600px) {
          .hero-logos {
            flex-direction: column;
            gap: 24px;
          }
          .hero-logo-astronomical { height: 70px; }
          .hero-logo-studio       { height: 70px; }
          .hero-logo-casa         { height: 90px; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        /* Video */
        .video-card {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(0,255,255,0.2);
          box-shadow: 0 0 20px rgba(0,255,255,0.1);
          background: #000;
          aspect-ratio: 9/16;
        }
        .video-card video {
          width: 100%; height: 100%;
          object-fit: cover;
        }
        /* Hours card */
        .hours-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 15px;
          padding: 1.5rem;
          text-align: center;
          transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
        }
        .hours-card:hover {
          transform: translateY(-6px);
          border-color: rgba(0,255,255,0.5);
          box-shadow: 0 15px 30px rgba(0,255,255,0.1);
        }
      `}</style>

      <div className="landing" style={{ background: '#050015', minHeight: '100vh' }}>
        {/* Vanta background — fixed, full page */}
        <div
          ref={vantaRef}
          style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        />

        {/* ─── NAVBAR ─────────────────────────────────── */}
        <nav
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
            background: scrolled ? 'rgba(5,0,21,0.97)' : 'rgba(5,0,21,0.7)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0,255,255,0.08)',
            transition: 'background 0.3s',
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
                style={{ background: 'none', border: '1px solid rgba(0,255,255,0.3)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#00ffff' }}
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
            style={{
              minHeight: '100vh',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', padding: '0 2rem', paddingTop: '80px',
            }}
          >
            <div style={{ maxWidth: 900 }} className="fade-up">
              {/* Logos */}
              <div className="hero-logos">
                <Image src="/LogoAstronomical.png" alt="Astronomical" width={400} height={120} className="hero-logo-astronomical" />
                <Image src="/LogoStudio54.png"      alt="Studio 54"   width={400} height={120} className="hero-logo-studio" />
                <Image src="/LogoCasaBlanca.png"   alt="Casa Blanca"  width={180} height={180} className="hero-logo-casa" />
              </div>

              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', marginBottom: '2.5rem', color: 'rgba(255,255,255,0.75)', fontWeight: 300 }}>
                La mejor experiencia nocturna de San Pedro Sula
              </p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                <button className="btn-primary" onClick={() => scrollTo('eventos')}>Ver Eventos</button>
                <a href="https://wa.me/50494373757" target="_blank" rel="noopener noreferrer" className="btn-secondary glow-btn">
                  Contactar
                </a>
              </div>

              {/* Social icons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem' }}>
                <a href="https://wa.me/50494902444" target="_blank" rel="noopener noreferrer" className="social-btn" style={{ background: 'linear-gradient(45deg,#25d366,#128c7e)' }}>
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

          {/* ─── VIDEOS ────────────────────────────────── */}
          <section style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
            <h2 className="section-title">NUESTROS VIDEOS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {[
                '/Reels/video1.mp4',
                '/Reels/video2.mp4',
                '/Reels/video3.mp4',
              ].map((src, i) => (
                <div key={i} className="video-card">
                  <video autoPlay muted loop playsInline>
                    <source src={src} type="video/mp4" />
                  </video>
                </div>
              ))}
            </div>
          </section>

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
                      <p style={{ color: '#00ffff', fontWeight: 600, marginBottom: '0.6rem', fontSize: '1.05rem' }}>
                        {weekday.charAt(0).toUpperCase() + weekday.slice(1)} {dayNum} de {monthStr.charAt(0).toUpperCase() + monthStr.slice(1)} · 9:00 PM
                      </p>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.8rem' }}>{event.name}</h3>
                      {event.description && (
                        <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '1.2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                          {event.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ color: '#00ffff', fontWeight: 700, fontSize: '1.1rem' }}>
                          L {price.toFixed(2)}
                        </span>
                        <Link href={`/eventos/${event.id}`} className="btn-primary" style={{ padding: '0.55rem 1.4rem', fontSize: '0.9rem' }}>
                          Comprar Entrada
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Próximamente card */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 2rem', minHeight: 280 }}>
                <p className="orbitron" style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(45deg,#00ffff,#ff00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '1.5rem', textAlign: 'center' }}>
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
                <h3 style={{ fontSize: '1.8rem', color: '#00ffff', marginBottom: '1rem', fontFamily: "'Exo 2', sans-serif" }}>
                  Encuéntranos en San Pedro Sula
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                  Astronomical, Studio 54 y Casa Blanca, los tres ambientes más emocionantes de San Pedro Sula, te esperan en un mismo lugar.
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {[
                    { icon: '📍', text: 'GX47+J2M, CA-5, 21104 San Pedro Sula, Cortés' },
                    { icon: '🚗', text: 'Fácil acceso en vehículo' },
                    { icon: '🅿️', text: 'Estacionamiento disponible' },
                    { icon: '🚕', text: 'Zona de taxis cerca' },
                  ].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0.5rem 0', color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
                      <span style={{ fontSize: '1.1rem', minWidth: 24 }}>{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 0 40px rgba(0,255,255,0.15)' }}>
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
                <div key={day} className="hours-card">
                  <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#00ffff', marginBottom: '0.5rem', fontFamily: "'Orbitron', monospace" }}>
                    {day}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {time}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: '2rem', fontSize: '0.85rem' }}>
              Los horarios pueden variar según eventos especiales
            </p>
          </section>

          {/* ─── CONTACT / SOCIAL ──────────────────────── */}
          <section id="contacto" style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <h2 className="section-title">CONTACTO</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '1.05rem' }}>
              Reservaciones y consultas
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <a href="https://wa.me/50494902444" target="_blank" rel="noopener noreferrer"
                className="btn-primary"
                style={{ background: 'linear-gradient(45deg,#25d366,#128c7e)', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                9490-2444
              </a>
              <a href="https://wa.me/50494373757" target="_blank" rel="noopener noreferrer"
                className="btn-secondary glow-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                9437-3757
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
          <footer style={{ background: 'rgba(0,0,0,0.85)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '2.5rem 2rem', textAlign: 'center' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(16px, 4vw, 48px)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <Image src="/LogoStudio54.png" alt="Studio 54" width={100} height={32} style={{ height: 28, width: 'auto', objectFit: 'contain', opacity: 0.5 }} />
                <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={50} height={50} style={{ height: 38, width: 'auto', objectFit: 'contain', opacity: 0.5 }} />
                <Image src="/LogoAstronomical.png" alt="Astronomical" width={100} height={32} style={{ height: 28, width: 'auto', objectFit: 'contain', opacity: 0.5 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { href: 'https://wa.me/50494902444', bg: 'linear-gradient(45deg,#25d366,#128c7e)', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.344 0-4.507-.81-6.214-2.163l-.436-.345-2.648.888.888-2.648-.345-.436A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg> },
                  { href: 'https://www.instagram.com/casablanca_sps/', bg: 'linear-gradient(45deg,#e4405f,#fd1d1d,#fcb045)', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
                  { href: 'https://www.facebook.com/profile.php?id=61576409706854', bg: '#1877f2', icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                ].map(({ href, bg, icon }, i) => (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                    style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: bg, transition: 'transform 0.3s', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15) translateY(-3px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {icon}
                  </a>
                ))}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                © {new Date().getFullYear()} La Gran Casa Blanca · San Pedro Sula, Honduras · Todos los derechos reservados
              </p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
                Powered by{' '}
                <a href="https://www.nexusglobalsuministros.com/" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'rgba(0,255,255,0.5)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
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
