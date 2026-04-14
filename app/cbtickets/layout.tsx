import type { Metadata } from 'next'
import { CbTicketsHeader } from './CbTicketsHeader'

export const metadata: Metadata = {
  title: 'CBTickets · La Gran Casa Blanca',
  description: 'Entradas en línea · La Gran Casa Blanca',
}

export default function CbTicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Exo+2:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div
        className="cbtickets-shell min-h-screen flex flex-col"
        style={{
          fontFamily: "'Exo 2', sans-serif",
          background: 'linear-gradient(180deg, #fffefb 0%, #faf6ef 45%, #f3ebe0 100%)',
        }}
      >
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.07] z-0"
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
