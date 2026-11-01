import Link from 'next/link'
import { getPublicEvents } from '@/lib/public-events'
import { CBT_EVENTS } from '@/lib/cbtickets-paths'
import { homeJsonLd } from '@/lib/cbtickets-seo'
import { CbtEventCard, toCbtEvent } from './_components/CbtEventCard'
import { CbtHero } from './_components/CbtHero'
import { CbtFaq, CbtHowItWorks, CbtOrganizers } from './_components/CbtSections'
import { CBT_FAQ } from './_components/contact'

export const dynamic = 'force-dynamic'

export const metadata = {
  alternates: { canonical: '/' },
}

export default async function CbTicketsHomePage() {
  const raw = await getPublicEvents('cbtickets')
  const events = raw.map(toCbtEvent)
  const featured = events[0] ?? null
  const upcoming = events.slice(0, 6)
  const jsonLd = homeJsonLd(
    raw.map((e, i) => ({ ...events[i], description: e.description })),
    CBT_FAQ
  )

  return (
    <main className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CbtHero event={featured} />

      {upcoming.length > 0 && (
        <section className="border-t border-cbt-gold/15 bg-cbt-forest/40" aria-labelledby="cartelera">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="cartelera" className="cbt-display text-4xl font-medium sm:text-5xl">
                En cartelera
              </h2>
              <Link href={CBT_EVENTS} className="cbt-btn-line px-6 py-2.5 text-sm">
                Ver todos los eventos
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => (
                <CbtEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="border-t border-cbt-gold/15">
        <CbtHowItWorks />
      </div>
      <CbtOrganizers />
      <CbtFaq />
    </main>
  )
}
