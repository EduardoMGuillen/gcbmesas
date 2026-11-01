import type { Metadata } from 'next'
import Script from 'next/script'
import { CbTicketsHeader } from './CbTicketsHeader'
import { CbtFooter } from './_components/CbtFooter'

const metadataBaseUrl = process.env.NEXT_PUBLIC_CBTICKETS_CANONICAL_BASE || 'https://gcbtickets.com'

const TITLE = 'GCBTickets | La mejor ticketera de Honduras: entradas y boletos en línea'
const DESCRIPTION =
  'Compra entradas para fiestas, conciertos y eventos en Honduras en minutos. Pago seguro con tarjeta y tu QR al instante. ¿Organizas eventos? Vende tus entradas con GCBTickets.'

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: { default: TITLE, template: '%s | GCBTickets' },
  description: DESCRIPTION,
  applicationName: 'GCBTickets',
  keywords: [
    'ticketera Honduras',
    'mejor ticketera de Honduras',
    'boletos Honduras',
    'entradas Honduras',
    'comprar entradas en línea Honduras',
    'venta de boletos Honduras',
    'entradas San Pedro Sula',
    'boletos San Pedro Sula',
    'eventos en Honduras',
    'conciertos Honduras',
    'fiestas San Pedro Sula',
    'vender entradas de mi evento',
    'plataforma de venta de boletos',
    'GCBTickets',
    'GCB Tickets',
  ],
  icons: { icon: '/gcbtickets/icon.png', apple: '/gcbtickets/icon.png' },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: {
    type: 'website',
    locale: 'es_HN',
    url: '/',
    siteName: 'GCBTickets',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/gcbtickets/logo.png', width: 4000, height: 1120, alt: 'GCBTickets' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/gcbtickets/logo.png'] },
  other: { 'geo.region': 'HN', 'geo.placename': 'Honduras' },
}

const CSS = `
.cbtickets-shell { font-family: 'Instrument Sans', system-ui, sans-serif; font-feature-settings: 'tnum' 0; }
.cbt-display { font-family: 'Bodoni Moda', 'Didot', Georgia, serif; font-optical-sizing: none; font-variation-settings: 'opsz' 18; letter-spacing: -0.015em; }
.cbt-foil {
  background: linear-gradient(105deg, #A9843A 0%, #E6CB86 28%, #C8A257 46%, #F4E2AE 58%, #A9843A 100%);
  background-size: 220% 100%;
}
.cbt-foil-text { color: transparent; -webkit-background-clip: text; background-clip: text; }
.cbt-btn-gold {
  display: inline-flex; align-items: center; justify-content: center; gap: .55rem;
  border-radius: 9999px; font-weight: 600; color: #1D1B16;
  background: linear-gradient(180deg, #E6CB86, #C8A257 55%, #A9843A);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 10px 30px -10px rgba(200,162,87,.7);
  transition: transform .2s, box-shadow .2s;
}
.cbt-btn-gold:hover { transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 16px 40px -12px rgba(200,162,87,.85); }
.cbt-btn-line {
  display: inline-flex; align-items: center; justify-content: center; gap: .55rem;
  border-radius: 9999px; font-weight: 600; color: #F3ECDD;
  box-shadow: inset 0 0 0 1px rgba(200,162,87,.55); transition: background .2s, box-shadow .2s;
}
.cbt-btn-line:hover { background: rgba(200,162,87,.1); box-shadow: inset 0 0 0 1px #C8A257; }
.cbt-btn-ink {
  display: inline-flex; align-items: center; justify-content: center; gap: .55rem;
  border-radius: 9999px; font-weight: 600; color: #F3ECDD; background: #10241D;
  transition: transform .2s, background .2s;
}
.cbt-btn-ink:hover { transform: translateY(-1px); background: #173329; }

/* Boleto: muescas troqueladas en la línea de perforación (--cut = posición horizontal o vertical) */
.cbt-ticket {
  --r: 14px;
  -webkit-mask: radial-gradient(circle var(--r) at var(--cut) 0, #0000 98%, #000) top / 100% 51% no-repeat,
                radial-gradient(circle var(--r) at var(--cut) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
          mask: radial-gradient(circle var(--r) at var(--cut) 0, #0000 98%, #000) top / 100% 51% no-repeat,
                radial-gradient(circle var(--r) at var(--cut) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
}
.cbt-ticket-h {
  --r: 12px;
  -webkit-mask: radial-gradient(circle var(--r) at 0 var(--cut), #0000 98%, #000) left / 51% 100% no-repeat,
                radial-gradient(circle var(--r) at 100% var(--cut), #0000 98%, #000) right / 51% 100% no-repeat;
          mask: radial-gradient(circle var(--r) at 0 var(--cut), #0000 98%, #000) left / 51% 100% no-repeat,
                radial-gradient(circle var(--r) at 100% var(--cut), #0000 98%, #000) right / 51% 100% no-repeat;
}
.cbt-paper {
  background-color: #F3ECDD;
  background-image: radial-gradient(rgba(29,27,22,.05) 1px, transparent 1px);
  background-size: 3px 3px;
}

@keyframes cbtTicketIn {
  0%   { opacity: 0; transform: translateY(40px) rotate(-12deg) scale(.96); }
  70%  { opacity: 1; transform: translateY(-4px) rotate(-3deg) scale(1); }
  100% { opacity: 1; transform: translateY(0) rotate(-4deg) scale(1); }
}
@keyframes cbtSheen { from { background-position: 120% 0; } to { background-position: -20% 0; } }
.cbt-ticket-in { animation: cbtTicketIn 1.1s cubic-bezier(.2,.8,.2,1) .15s both; }
.cbt-sheen { animation: cbtSheen 1.6s ease-out 1.1s both; }
@media (prefers-reduced-motion: reduce) {
  .cbt-ticket-in { animation: none; transform: rotate(-4deg); }
  .cbt-sheen { animation: none; }
}
.cbtickets-shell :focus-visible { outline: 2px solid #E6CB86; outline-offset: 3px; border-radius: 6px; }
.cbt-faq summary::-webkit-details-marker { display: none; }
`

export default function CbTicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-W8KV5Z75GY" strategy="afterInteractive" />
      <Script id="gtag-cbtickets" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-W8KV5Z75GY');
        `}
      </Script>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..800;1,6..96,400..800&family=Instrument+Sans:wght@400..700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cbtickets-shell flex min-h-screen flex-col bg-cbt-night text-cbt-ivory antialiased">
        <CbTicketsHeader />
        <div className="relative z-[1] flex flex-1 flex-col">{children}</div>
        <CbtFooter />
      </div>
    </>
  )
}
