import type { Metadata } from 'next'
import Script from 'next/script'
import { CbTicketsHeader } from './CbTicketsHeader'

const metadataBaseUrl = process.env.NEXT_PUBLIC_CBTICKETS_CANONICAL_BASE || 'https://gcbtickets.com'

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: 'GCBTickets | Ticketera oficial de eventos',
    template: '%s | GCBTickets',
  },
  description: 'GCBTickets es la ticketera en linea para comprar entradas de eventos en La Gran Casa Blanca.',
  keywords: [
    'GCBTickets',
    'ticketera Honduras',
    'entradas en linea',
    'comprar boletos',
    'eventos La Gran Casa Blanca',
  ],
  alternates: {
    canonical: '/cbtickets',
  },
  openGraph: {
    type: 'website',
    locale: 'es_HN',
    url: '/cbtickets',
    siteName: 'GCBTickets',
    title: 'GCBTickets | Ticketera oficial de eventos',
    description: 'Compra entradas de eventos en GCBTickets, la ticketera de La Gran Casa Blanca.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GCBTickets | Ticketera oficial de eventos',
    description: 'Compra entradas de eventos en GCBTickets.',
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
      <div
        className="cbtickets-shell min-h-screen flex flex-col"
        style={{
          fontFamily: "'Exo 2', sans-serif",
          background: 'linear-gradient(180deg, #f5efe2 0%, #ead9b8 42%, #d8c09a 100%)',
        }}
      >
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.11] z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L30 60M0 30L60 30' stroke='%23a07828' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />
        <CbTicketsHeader />
        <div className="relative z-[1] flex flex-col flex-1">{children}</div>
      </div>
    </>
  )
}
