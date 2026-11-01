import Link from 'next/link'
import { getPublicEvents } from '@/lib/public-events'
import { CBT_EVENTS } from '@/lib/cbtickets-paths'
import { CbtEventCard, toCbtEvent } from './_components/CbtEventCard'
import { CbtHero } from './_components/CbtHero'
import { CbtFaq, CbtHowItWorks, CbtOrganizers, CbtWhy } from './_components/CbtSections'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: { absolute: 'GCBTickets | Entradas para eventos en Honduras' },
  alternates: { canonical: '/' },
}

export default async function CbTicketsHomePage() {
  const events = (await getPublicEvents('cbtickets')).map(toCbtEvent)
  const featured = events[0] ?? null
  const upcoming = events.slice(0, 3)

  return (
    <main className="flex-1">
      <CbtHero event={featured} />

      {upcoming.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="cbt-eyebrow">A la venta</p>
              <h2 className="cbt-serif mt-3 text-4xl font-semibold sm:text-5xl">Próximos eventos</h2>
            </div>
            <Link href={CBT_EVENTS} className="cbt-btn-ghost px-5 py-2 text-sm">
              Ver todos los eventos →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <CbtEventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <CbtHowItWorks />
      <CbtWhy />
      <CbtOrganizers />
      <CbtFaq />
    </main>
  )
}
