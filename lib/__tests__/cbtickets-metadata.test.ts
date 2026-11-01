import { describe, it, expect } from 'vitest'
import { buildCbtEventMetadata } from '@/lib/cbtickets-metadata'

describe('buildCbtEventMetadata', () => {
  const event = { id: 'abc', name: 'Noche X', dateLabel: '7 de noviembre de 2026', coverImage: 'https://x/poster.jpg' }
  it('canonical y og:url apuntan a la página del evento, no al home', () => {
    const m = buildCbtEventMetadata(event)
    expect(m.alternates?.canonical).toBe('/eventos/abc')
    expect((m.openGraph as { url?: string }).url).toBe('/eventos/abc')
  })
  it('og usa nombre y afiche del evento', () => {
    const m = buildCbtEventMetadata(event)
    expect(m.openGraph?.title).toBe('Noche X')
    expect(m.openGraph?.images).toEqual(['https://x/poster.jpg'])
    expect(m.title).toBe('Noche X')
  })
  it('sin afiche cae al logo de GCBTickets', () => {
    expect(buildCbtEventMetadata({ ...event, coverImage: null }).openGraph?.images).toEqual(['/gcbtickets/logo.png'])
  })
})
