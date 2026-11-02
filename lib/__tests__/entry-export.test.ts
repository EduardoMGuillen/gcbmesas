import { describe, it, expect } from 'vitest'
import { excludeEntriesByCreator, parseExcludeParam } from '@/lib/entry-export'

describe('parseExcludeParam', () => {
  it('vacío o null devuelve lista vacía', () => {
    expect(parseExcludeParam(null)).toEqual([])
    expect(parseExcludeParam('')).toEqual([])
  })
  it('separa por coma, limpia espacios y duplicados', () => {
    expect(parseExcludeParam(' a, b ,a,,c ')).toEqual(['a', 'b', 'c'])
  })
})

describe('excludeEntriesByCreator', () => {
  const rows = [
    { id: '1', createdByUserId: 'admin1' },
    { id: '2', createdByUserId: 'admin2' },
    { id: '3', createdByUserId: null },
    { id: '4', createdByUserId: 'taq' },
  ]
  it('sin exclusiones devuelve todo', () => {
    expect(excludeEntriesByCreator(rows, [])).toHaveLength(4)
  })
  it('quita solo las entradas de los creadores elegidos; las online (null) se quedan', () => {
    expect(excludeEntriesByCreator(rows, ['admin1', 'admin2']).map((r) => r.id)).toEqual(['3', '4'])
  })
})
