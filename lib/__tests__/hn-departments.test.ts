import { describe, it, expect } from 'vitest'
import { HN_DEPARTMENTS, departmentDefaults } from '@/lib/hn-departments'

describe('HN_DEPARTMENTS', () => {
  it('lista los 18 departamentos sin repetir', () => {
    expect(HN_DEPARTMENTS).toHaveLength(18)
    expect(new Set(HN_DEPARTMENTS.map((d) => d.name)).size).toBe(18)
  })
  it('cada departamento trae cabecera y código postal de 5 dígitos', () => {
    for (const d of HN_DEPARTMENTS) {
      expect(d.city.length).toBeGreaterThan(0)
      expect(d.postalCode).toMatch(/^\d{5}$/)
    }
  })
})

describe('departmentDefaults', () => {
  it('Cortés llena San Pedro Sula', () => {
    expect(departmentDefaults('Cortés')).toEqual({ city: 'San Pedro Sula', postalCode: '21101' })
  })
  it('Francisco Morazán llena Tegucigalpa', () => {
    expect(departmentDefaults('Francisco Morazán')).toEqual({ city: 'Tegucigalpa', postalCode: '11101' })
  })
  it('departamento desconocido devuelve null', () => {
    expect(departmentDefaults('Texas')).toBeNull()
  })
})
