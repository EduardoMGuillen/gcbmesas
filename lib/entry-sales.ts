import { prisma } from './prisma'

/**
 * Usuarios cuyas entradas son cortesías generadas (no ventas): siguen siendo válidas
 * y cuentan para el cupo, pero su dinero no suma a los balances de ventas.
 */
export const NON_SALE_ENTRY_CREATORS = ['eguillen']

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
