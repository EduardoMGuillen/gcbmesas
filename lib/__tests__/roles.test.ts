import { describe, it, expect } from 'vitest'
import { roleHome, ROLE_HOME } from '@/lib/roles'

describe('roleHome', () => {
  it('cada rol va a su inicio', () => {
    expect(roleHome('ADMIN')).toBe('/admin')
    expect(roleHome('CLIENTE_TICKETERA')).toBe('/admin/entradas')
    expect(roleHome('MESERO')).toBe('/mesero')
    expect(roleHome('CAJERO')).toBe('/cajero')
    expect(roleHome('TAQUILLA')).toBe('/taquilla')
    expect(roleHome('COCINA')).toBe('/cocina')
    expect(roleHome('BAR')).toBe('/bar')
  })
  it('rol desconocido o vacío va a /', () => {
    expect(roleHome('OTRO')).toBe('/')
    expect(roleHome(undefined)).toBe('/')
    expect(roleHome(null)).toBe('/')
  })
  it('cubre los 7 roles', () => {
    expect(Object.keys(ROLE_HOME)).toHaveLength(7)
  })
})
