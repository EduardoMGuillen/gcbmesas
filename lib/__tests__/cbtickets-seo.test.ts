import { describe, it, expect } from 'vitest'
import { eventJsonLd, homeJsonLd } from '@/lib/cbtickets-seo'

const ev = {
  id: 'abc', name: 'Noche X', date: '2026-11-07T12:00:00.000Z', coverImage: 'https://x/p.jpg',
  coverPrice: 600, paypalPrice: 600, maxEntries: 100, entriesSoldSum: 100,
  venueName: 'Studio 54', venueAddress: 'San Pedro Sula', description: 'Fiesta',
}

describe('eventJsonLd', () => {
  it('describe el evento con precio en lempiras y URL absoluta', () => {
    const j = eventJsonLd(ev)
    expect(j['@type']).toBe('Event')
    expect(j.url).toBe('https://gcbtickets.com/eventos/abc')
    expect(j.startDate).toBe('2026-11-07')
    expect(j.offers.priceCurrency).toBe('HNL')
    expect(j.offers.price).toBe('600.00')
    expect(j.location.name).toBe('Studio 54')
    expect(j.location.address.addressCountry).toBe('HN')
  })
  it('marca agotado como SoldOut', () => {
    expect(eventJsonLd(ev).offers.availability).toBe('https://schema.org/SoldOut')
    expect(eventJsonLd({ ...ev, entriesSoldSum: 3 }).offers.availability).toBe('https://schema.org/InStock')
  })
  it('evento gratis tiene precio 0', () => {
    expect(eventJsonLd({ ...ev, coverPrice: 0, paypalPrice: null }).offers.price).toBe('0')
  })
  it('sin lugar usa Honduras como ubicación', () => {
    expect(eventJsonLd({ ...ev, venueName: null, venueAddress: null }).location.name).toBe('Honduras')
  })
})

describe('homeJsonLd', () => {
  it('incluye organización con WhatsApp de Nexus, sitio, FAQ y lista de eventos', () => {
    const g = homeJsonLd([ev], [{ q: '¿P?', a: 'R' }])['@graph']
    const types = g.map((n: { '@type': string }) => n['@type'])
    expect(types).toEqual(['Organization', 'WebSite', 'FAQPage', 'ItemList'])
    expect(g[0].contactPoint.telephone).toBe('+504-9882-3627')
    expect(g[2].mainEntity[0].acceptedAnswer.text).toBe('R')
    expect(g[3].itemListElement[0].item['@type']).toBe('Event')
  })
  it('sin eventos omite la lista', () => {
    const g = homeJsonLd([], [])['@graph']
    expect(g.map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite', 'FAQPage'])
  })
})
