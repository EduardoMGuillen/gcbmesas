import { describe, it, expect } from 'vitest'
import { pickFeaturedEvent } from '@/lib/featured-event'

const e = (id: string, isFeatured = false) => ({ id, isFeatured })

describe('pickFeaturedEvent', () => {
  it('sin eventos devuelve null', () => {
    expect(pickFeaturedEvent([])).toBeNull()
  })
  it('sin destacados usa el más próximo (el primero de la lista ordenada por fecha)', () => {
    expect(pickFeaturedEvent([e('a'), e('b')])?.id).toBe('a')
  })
  it('prefiere el destacado aunque no sea el más próximo', () => {
    expect(pickFeaturedEvent([e('a'), e('b', true)])?.id).toBe('b')
  })
  it('con varios destacados usa el más próximo de ellos', () => {
    expect(pickFeaturedEvent([e('a'), e('b', true), e('c', true)])?.id).toBe('b')
  })
})
