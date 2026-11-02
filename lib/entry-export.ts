/** Ids de usuario en el query `?exclude=a,b,c` de la exportación de entradas. */
export function parseExcludeParam(value: string | null | undefined): string[] {
  if (!value) return []
  return Array.from(new Set(value.split(',').map((s) => s.trim()).filter(Boolean)))
}

/** Quita las entradas creadas por los usuarios indicados. Las ventas en línea (sin creador) siempre quedan. */
export function excludeEntriesByCreator<T extends { createdByUserId: string | null }>(
  rows: T[],
  excludeIds: string[]
): T[] {
  if (!excludeIds.length) return rows
  const set = new Set(excludeIds)
  return rows.filter((r) => !r.createdByUserId || !set.has(r.createdByUserId))
}
