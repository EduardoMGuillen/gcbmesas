import type { Prisma, VenueZone } from '@prisma/client'
import { StockMovementType } from '@prisma/client'

export async function consumeStockForSale(
  tx: Prisma.TransactionClient,
  opts: { productId: string; zone: VenueZone | null; quantity: number; userId: string }
): Promise<string | null> {
  if (!opts.zone) return null

  const items = await tx.stockItem.findMany({
    where: {
      productId: opts.productId,
      venueZone: opts.zone,
      location: { in: ['ABIERTO', 'BARRA'] },
    },
  })
  if (items.length === 0) return null

  const sorted = [...items].sort((a, b) => {
    if (a.location === b.location) return 0
    return a.location === 'ABIERTO' ? -1 : 1
  })
  const available = sorted.reduce((sum, item) => sum + Number(item.quantity), 0)
  const deduct = sorted.some((item) => item.deductOnSale)
  if (available <= 0) {
    throw new Error('No hay de este producto en esta zona')
  }
  if (!deduct) return sorted[0]?.id || null
  if (available < opts.quantity) {
    throw new Error('No hay suficiente en esta zona')
  }

  let remaining = opts.quantity
  let usedId: string | null = null
  for (const item of sorted) {
    if (remaining <= 0) break
    const qty = Number(item.quantity)
    if (qty <= 0) continue
    const take = Math.min(qty, remaining)
    await tx.stockItem.update({
      where: { id: item.id },
      data: { quantity: qty - take },
    })
    await tx.stockMovement.create({
      data: {
        stockItemId: item.id,
        type: StockMovementType.SALE,
        quantityChange: -take,
        note: 'Venta',
        userId: opts.userId,
      },
    })
    usedId = item.id
    remaining -= take
  }
  return usedId
}

export async function consumeStockItemForSale(
  tx: Prisma.TransactionClient,
  opts: { stockItemId: string; quantity: number; userId: string }
) {
  const item = await tx.stockItem.findUnique({ where: { id: opts.stockItemId } })
  if (!item) throw new Error('No hay de este producto en esta zona')
  if (!item.deductOnSale) return item
  const qty = Number(item.quantity)
  if (qty <= 0) throw new Error('No hay de este producto en esta zona')
  if (qty < opts.quantity) throw new Error('No hay suficiente en esta zona')
  const updated = await tx.stockItem.update({
    where: { id: item.id },
    data: { quantity: qty - opts.quantity },
  })
  await tx.stockMovement.create({
    data: {
      stockItemId: item.id,
      type: StockMovementType.SALE,
      quantityChange: -opts.quantity,
      note: 'Venta',
      userId: opts.userId,
    },
  })
  return updated
}

export async function ensureProductForStockItem(
  tx: Prisma.TransactionClient,
  item: {
    id: string
    name: string
    presentation?: string | null
    category?: string | null
    salePrice?: unknown
    productId?: string | null
  }
) {
  if (item.productId) {
    const existing = await tx.product.findUnique({ where: { id: item.productId } })
    if (existing) return existing
  }
  const byName = await tx.product.findFirst({
    where: { name: { equals: item.name, mode: 'insensitive' } },
  })
  if (byName) {
    await tx.stockItem.update({ where: { id: item.id }, data: { productId: byName.id } })
    return byName
  }
  const created = await tx.product.create({
    data: {
      name: item.presentation ? `${item.name} (${item.presentation})` : item.name,
      price: Number(item.salePrice || 0),
      category: item.category || null,
      isActive: false,
      requiresPrep: !['Cerveza', 'Vapes', 'Mixers'].includes(item.category || ''),
    },
  })
  await tx.stockItem.update({ where: { id: item.id }, data: { productId: created.id } })
  return created
}

export async function restoreStockForSale(
  tx: Prisma.TransactionClient,
  opts: { stockItemId: string | null; quantity: number; userId: string }
) {
  if (!opts.stockItemId || opts.quantity <= 0) return
  const item = await tx.stockItem.findUnique({ where: { id: opts.stockItemId } })
  if (!item || !item.deductOnSale) return
  await tx.stockItem.update({
    where: { id: item.id },
    data: { quantity: Number(item.quantity) + opts.quantity },
  })
  await tx.stockMovement.create({
    data: {
      stockItemId: item.id,
      type: StockMovementType.ADJUSTMENT,
      quantityChange: opts.quantity,
      note: 'Cancelación de venta',
      userId: opts.userId,
    },
  })
}
