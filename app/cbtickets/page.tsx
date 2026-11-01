import Link from 'next/link'
import { getPublicEvents } from '@/lib/public-events'
import { CBT_EVENTS } from '@/lib/cbtickets-paths'
import { homeJsonLd } from '@/lib/cbtickets-seo'
import { pickFeaturedEvent } from '@/lib/featured-event'
import { CbtEventCard, toCbtEvent } from './_components/CbtEventCard'
import { CbtHero } from './_components/CbtHero'
import { CbtFaq, CbtOrganizers } from './_components/CbtSections'
import { CBT_FAQ } from './_components/contact'

export const dynamic = 'force-dynamic'

export const metadata = {
  alternates: { canonical: '/' },
}

export default async function CbTicketsHomePage() {
  const raw = await getPublicEvents('cbtickets')
  const events = raw.map(toCbtEvent)
  const featured = pickFeaturedEvent(events)
  const jsonLd = homeJsonLd(
    raw.map((e, i) => ({ ...events[i], description: e.description })),
    CBT_FAQ
  )

  return (
    <main className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CbtHero event={featured} />

      {events.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6" aria-labelledby="proximos">
          <div className="flex items-end justify-between gap-4">
            <h2 id="proximos" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Próximos eventos
            </h2>
            <Link href={CBT_EVENTS} className="text-sm font-semibold text-gcb-gold hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {events.slice(0, 8).map((event) => (
              <CbtEventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <CbtOrganizers />
      <CbtFaq />
    </main>
  )
}
