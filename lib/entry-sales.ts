import { prisma } from './prisma'
import { NON_SALE_ENTRY_CREATORS } from './entry-historial'

export async function getNonSaleEntryCreatorIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: NON_SALE_ENTRY_CREATORS.map((username) => ({
        username: { equals: username, mode: 'insensitive' as const },
      })),
    },
    select: { id: true },
  })
  return users.map((u) => u.id)
}

/** Filtro Prisma de entradas que sí son venta (las online no tienen createdByUserId). */
export function saleEntriesWhere(nonSaleCreatorIds: string[]) {
  if (nonSaleCreatorIds.length === 0) return {}
  return { OR: [{ createdByUserId: null }, { createdByUserId: { notIn: nonSaleCreatorIds } }] }
}
