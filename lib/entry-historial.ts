export function isHiddenEntryCreator(user?: { username: string; name: string | null } | null) {
  if (!user) return false
  const blob = `${user.username} ${user.name || ''}`.toLowerCase()
  return blob.includes('guillen')
}

export function entryOriginLabel(createdBy?: { username: string; name: string | null } | null) {
  if (!createdBy) return 'Venta en línea'
  return `Taquilla · ${createdBy.name || createdBy.username}`
}
