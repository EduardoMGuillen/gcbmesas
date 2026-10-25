/**
 * Usuarios cuyas entradas son cortesías generadas (no ventas): siguen siendo válidas
 * y cuentan para el cupo, pero su dinero no suma a los balances de ventas.
 */
export const NON_SALE_ENTRY_CREATORS = ['eguillen']

export function isNonSaleEntryCreator(user?: { username: string } | null) {
  return !!user && NON_SALE_ENTRY_CREATORS.includes(user.username.toLowerCase())
}

/** Oculta del historial las entradas de estos usuarios, salvo para quien las creó. */
export function isHiddenEntryCreator(
  user?: { username: string; name: string | null } | null,
  viewerUsername?: string | null
) {
  if (!user) return false
  if (viewerUsername && viewerUsername.toLowerCase() === user.username.toLowerCase()) return false
  const blob = `${user.username} ${user.name || ''}`.toLowerCase()
  return blob.includes('guillen')
}

export function entryOriginLabel(createdBy?: { username: string; name: string | null } | null) {
  if (!createdBy) return 'Venta en línea'
  return `Taquilla · ${createdBy.name || createdBy.username}`
}
