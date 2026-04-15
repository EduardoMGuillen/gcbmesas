export const WALK_IN_TABLE_NAME = 'CLIENTE_DE_PIE'
export const WALK_IN_TABLE_ZONE = 'SIN_MESA'
export const WALK_IN_TABLE_SHORT_CODE = 'PIE1'

type TableLike = {
  name?: string | null
  shortCode?: string | null
  zone?: string | null
}

export function isWalkInTable(table?: TableLike | null) {
  if (!table) return false
  if (table.shortCode === WALK_IN_TABLE_SHORT_CODE) return true
  if (table.zone === WALK_IN_TABLE_ZONE && table.name === WALK_IN_TABLE_NAME) return true
  return false
}

export function getTableLabel(table: TableLike) {
  if (isWalkInTable(table)) return 'Cliente de pie'
  const code = table.shortCode ? `Mesa ${table.shortCode}` : 'Mesa'
  return `${code} · ${table.name || 'Sin nombre'}`
}
