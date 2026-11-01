import { describe, it, expect } from 'vitest'
import { getTicketAvailability } from '@/lib/ticket-availability'

const base = { coverPrice: 600, paypalPrice: 600, maxEntries: 100 as number | null, entriesSoldSum: 0 }

describe('getTicketAvailability', () => {
  it('cover gratuito es free', () => {
    expect(getTicketAvailability({ ...base, coverPrice: 0, paypalPrice: null })).toBe('free')
  })
  it('sin cupo es available', () => {
    expect(getTicketAvailability({ ...base, maxEntries: null, entriesSoldSum: 999 })).toBe('available')
  })
  it('84 de 100 es available', () => {
    expect(getTicketAvailability({ ...base, entriesSoldSum: 84 })).toBe('available')
  })
  it('85 de 100 es last', () => {
    expect(getTicketAvailability({ ...base, entriesSoldSum: 85 })).toBe('last')
  })
  it('100 de 100 es soldout', () => {
    expect(getTicketAvailability({ ...base, entriesSoldSum: 100 })).toBe('soldout')
  })
  it('sobreventa es soldout', () => {
    expect(getTicketAvailability({ ...base, entriesSoldSum: 120 })).toBe('soldout')
  })
  it('maxEntries 0 se trata como sin cupo', () => {
    expect(getTicketAvailability({ ...base, maxEntries: 0, entriesSoldSum: 5 })).toBe('available')
  })
})

import { daysUntil } from '@/lib/ticket-availability'

describe('daysUntil (hora Honduras)', () => {
  const ev = '2026-11-07T12:00:00Z'
  it('cuenta días calendario', () => {
    expect(daysUntil(ev, new Date('2026-11-01T16:00:00Z'))).toBe(6)
  })
  it('mismo día es 0', () => {
    expect(daysUntil(ev, new Date('2026-11-07T20:00:00Z'))).toBe(0)
  })
  it('evento pasado es 0', () => {
    expect(daysUntil(ev, new Date('2026-11-09T12:00:00Z'))).toBe(0)
  })
  it('usa la fecha de Honduras, no la UTC', () => {
    // 2026-11-01T05:30Z = 31 oct 23:30 en Honduras
    expect(daysUntil('2026-11-01T12:00:00Z', new Date('2026-11-01T05:30:00Z'))).toBe(1)
  })
})
