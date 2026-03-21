'use client'

import { useEffect, useRef } from 'react'

/**
 * Mismo fondo animado (Vanta.js NET) que la landing pública.
 * Envuelve el contenido de /eventos y páginas públicas relacionadas.
 */
export function PublicSiteVantaBackground({ children }: { children: React.ReactNode }) {
  const vantaRef = useRef<HTMLDivElement>(null)
  const vantaEffect = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    const loadVanta = async () => {
      if (!(window as unknown as { THREE?: unknown }).THREE) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'
          s.onload = () => resolve()
          s.onerror = reject
          document.head.appendChild(s)
        })
      }
      if (!(window as unknown as { VANTA?: unknown }).VANTA) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js'
          s.onload = () => resolve()
          s.onerror = reject
          document.head.appendChild(s)
        })
      }
      if (vantaRef.current && !vantaEffect.current) {
        const VANTA = (window as unknown as { VANTA: { NET: (opts: object) => { destroy: () => void } } }).VANTA
        vantaEffect.current = VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0xffffff,
          backgroundColor: 0x0a0015,
          points: 12.0,
          maxDistance: 22.0,
          spacing: 20.0,
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

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0a0015' }}>
      <div
        ref={vantaRef}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        aria-hidden
      />
      <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
    </div>
  )
}
