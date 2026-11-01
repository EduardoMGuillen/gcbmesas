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
.gcb { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0A0A0A; background: #fff; }
.gcb :focus-visible { outline: 2px solid #B8913A; outline-offset: 3px; border-radius: 8px; }
.gcb-btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: 9999px; font-weight: 600; transition: background .2s, color .2s, box-shadow .2s, transform .2s; text-align: center; }
.gcb-btn-gold { background: #B8913A; color: #fff; box-shadow: 0 8px 24px -10px rgba(184,145,58,.7); }
.gcb-btn-gold:hover { background: #A47F2F; }
.gcb-btn-ink { background: #0A0A0A; color: #fff; }
.gcb-btn-ink:hover { background: #262626; }
.gcb-btn-ghost { background: rgba(255,255,255,.6); color: #0A0A0A; box-shadow: inset 0 0 0 1px #E7E5E4; backdrop-filter: blur(12px); }
.gcb-btn-ghost:hover { box-shadow: inset 0 0 0 1px #0A0A0A; }
.gcb-glass { background: rgba(255,255,255,.62); backdrop-filter: blur(22px) saturate(1.6); -webkit-backdrop-filter: blur(22px) saturate(1.6); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7), 0 20px 50px -24px rgba(10,10,10,.35); }
.gcb-glass-dark { background: rgba(10,10,10,.38); backdrop-filter: blur(18px) saturate(1.4); -webkit-backdrop-filter: blur(18px) saturate(1.4); box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); }
.gcb-faq summary::-webkit-details-marker { display: none; }
.gcb-notch { --r: 12px;
  -webkit-mask: radial-gradient(circle var(--r) at 0 var(--cut), #0000 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle var(--r) at 100% var(--cut), #0000 98%, #000) right / 51% 100% no-repeat;
          mask: radial-gradient(circle var(--r) at 0 var(--cut), #0000 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle var(--r) at 100% var(--cut), #0000 98%, #000) right / 51% 100% no-repeat; }
@keyframes gcbIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.gcb-in { animation: gcbIn .7s cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .gcb-in { animation: none; } }
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
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="gcb flex min-h-screen flex-col antialiased">
        <CbTicketsHeader />
        <div className="relative z-[1] flex flex-1 flex-col">{children}</div>
        <CbtFooter />
      </div>
    </>
  )
}
