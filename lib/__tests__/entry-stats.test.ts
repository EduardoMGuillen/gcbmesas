import { describe, it, expect } from 'vitest'
import { bucketByHour, bucketByDay, entryOrigin, summarizeEntries } from '@/lib/entry-stats'

// Honduras = UTC-6 todo el año.
const hn = (iso: string) => new Date(`${iso}-06:00`)

describe('bucketByHour', () => {
  it('agrupa por hora local de Honduras y rellena huecos entre la primera y la última', () => {
    const out = bucketByHour([hn('2026-10-31T21:05'), hn('2026-10-31T21:50'), hn('2026-10-31T23:10')])
    expect(out).toEqual([
      { key: '2026-10-31T21', label: '9 p. m.', count: 2 },
      { key: '2026-10-31T22', label: '10 p. m.', count: 0 },
      { key: '2026-10-31T23', label: '11 p. m.', count: 1 },
    ])
  })

  it('cruza la medianoche', () => {
    const out = bucketByHour([hn('2026-10-31T23:30'), hn('2026-11-01T00:15')])
    expect(out.map((b) => b.key)).toEqual(['2026-10-31T23', '2026-11-01T00'])
  })

  it('lista vacía devuelve vacío', () => {
    expect(bucketByHour([])).toEqual([])
  })
})

describe('bucketByDay', () => {
  it('agrupa por día de Honduras y rellena días sin ventas', () => {
    const out = bucketByDay([hn('2026-10-28T10:00'), hn('2026-10-30T23:59'), hn('2026-10-30T08:00')])
    expect(out.map((b) => [b.key, b.count])).toEqual([
      ['2026-10-28', 1],
      ['2026-10-29', 0],
      ['2026-10-30', 2],
    ])
  })

  it('una venta a las 11 p. m. hora HN cuenta en ese día (no en el siguiente UTC)', () => {
    expect(bucketByDay([hn('2026-10-30T23:00')])[0].key).toBe('2026-10-30')
  })
})

describe('entryOrigin', () => {
  it('sin creador = online', () => {
    expect(entryOrigin(null, [])).toBe('online')
  })
  it('creador de cortesía = cortesia', () => {
    expect(entryOrigin('u1', ['u1'])).toBe('cortesia')
  })
  it('otro creador = taquilla', () => {
    expect(entryOrigin('u2', ['u1'])).toBe('taquilla')
  })
})

describe('summarizeEntries', () => {
  it('cuenta estados, ingreso sin canceladas ni cortesías y porcentaje de ingreso', () => {
    const s = summarizeEntries(
      [
        { status: 'USED', totalPrice: 500, createdByUserId: null },
        { status: 'USED', totalPrice: 500, createdByUserId: 'taq' },
        { status: 'ACTIVE', totalPrice: 500, createdByUserId: null },
        { status: 'ACTIVE', totalPrice: 0, createdByUserId: 'corte' },
        { status: 'CANCELLED', totalPrice: 500, createdByUserId: null },
      ],
      ['corte']
    )
    expect(s).toEqual({
      sold: 4,
      used: 2,
      pending: 2,
      cancelled: 1,
      revenue: 1500,
      usedPct: 50,
      byOrigin: { online: 2, taquilla: 1, cortesia: 1 },
    })
  })

  it('sin ventas: porcentaje 0', () => {
    expect(summarizeEntries([], []).usedPct).toBe(0)
  })
})
