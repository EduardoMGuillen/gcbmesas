import type { Metadata } from 'next'
import Script from 'next/script'
import { CbTicketsHeader } from './CbTicketsHeader'
import { CbtFooter } from './_components/CbtFooter'

const metadataBaseUrl = process.env.NEXT_PUBLIC_CBTICKETS_CANONICAL_BASE || 'https://gcbtickets.com'

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: 'GCBTickets | Entradas para eventos en Honduras',
    template: '%s | GCBTickets',
  },
  description: 'GCBTickets: compra entradas para eventos en Honduras en minutos. Pago seguro con tarjeta y QR al instante.',
  icons: { icon: '/gcbtickets/icon.png', apple: '/gcbtickets/icon.png' },
  keywords: [
    'GCBTickets',
    'GCB Tickets',
    'La Gran Casa Blanca Tickets',
    'Casa Blanca Tickets',
    'ticketera Honduras',
    'entradas Honduras',
    'boletos Honduras',
    'entradas en linea',
    'comprar boletos',
    'eventos La Gran Casa Blanca',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_HN',
    url: '/',
    siteName: 'GCBTickets',
    title: 'GCBTickets | Entradas para eventos en Honduras',
    description: 'Compra entradas para eventos en Honduras con GCBTickets. Pago seguro y QR al instante.',
    images: ['/gcbtickets/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GCBTickets | Entradas para eventos en Honduras',
    description: 'Compra entradas para eventos en Honduras con GCBTickets.',
    images: ['/gcbtickets/logo.png'],
  },
}

export default function CbTicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-W8KV5Z75GY"
        strategy="afterInteractive"
      />
      <Script id="gtag-cbtickets" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-W8KV5Z75GY');
        `}
      </Script>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Exo+2:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .cbtickets-shell { --cbt-bg: #0B0B0B; --cbt-surface: #141210; --cbt-gold: #B08F42; --cbt-gold-2: #A3832F; --cbt-ivory: #EDE6D6; }
        .cbt-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .cbt-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: var(--cbt-gold); }
        .cbt-btn-gold {
          display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
          border-radius: 9999px; font-weight: 600; color: #0B0B0B;
          background: linear-gradient(180deg, #C4A256, var(--cbt-gold-2));
          box-shadow: 0 6px 22px rgba(176,143,66,0.28);
          transition: transform .2s, box-shadow .2s, filter .2s;
        }
        .cbt-btn-gold:hover { transform: translateY(-1px); filter: brightness(1.06); box-shadow: 0 10px 30px rgba(176,143,66,0.4); }
        .cbt-btn-ghost {
          display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
          border-radius: 9999px; font-weight: 600; color: var(--cbt-ivory);
          border: 1px solid rgba(176,143,66,0.55); transition: background .2s, border-color .2s;
        }
        .cbt-btn-ghost:hover { background: rgba(176,143,66,0.12); border-color: var(--cbt-gold); }
        .cbtickets-shell :focus-visible { outline: 2px solid var(--cbt-gold); outline-offset: 3px; }
      `,
        }}
      />
      <div
        className="cbtickets-shell min-h-screen flex flex-col bg-[#0B0B0B] text-[#EDE6D6]"
        style={{ fontFamily: "'Exo 2', sans-serif" }}
      >
        <CbTicketsHeader />
        <div className="relative z-[1] flex flex-col flex-1">{children}</div>
        <CbtFooter />
      </div>
    </>
  )
}
