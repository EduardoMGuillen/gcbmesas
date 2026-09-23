'use server'

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import {
  CashSessionStatus,
  LogAction,
  StockLocation,
  StockMovementType,
  VenueZone,
} from '@prisma/client'
import { CASH_REGISTERS, EXPENSE_CATEGORIES } from './ops-constants'
import { STOCK_SEED } from './stock-seed-data'
import { businessDateToDate, getBusinessDate } from './business-day'
import { sendCashArqueoClosedMail } from './cash-session-mail'
import { parseStockExcelBuffer } from './stock-excel'

async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('No autorizado')
  return session.user
}

function requireAdmin(role: string) {
  if (role !== 'ADMIN') throw new Error('Solo administradores')
}

function num(v: unknown) {
  return Number(v || 0)
}

function revalidateOps() {
  revalidatePath('/admin')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/caja')
  revalidatePath('/admin/gastos')
  revalidatePath('/cajero')
  revalidatePath('/cajero/caja')
  revalidatePath('/admin/cuentas')
}

export async function ensureCashRegisters() {
  for (const r of CASH_REGISTERS) {
    await prisma.cashRegister.upsert({
      where: { slug: r.slug },
      create: {
        slug: r.slug,
        name: r.name,
        defaultFloat: r.defaultFloat,
        venueZone: r.venueZone,
      },
      update: { name: r.name, isActive: true, venueZone: r.venueZone },
    })
  }
}

export async function importStockFromExcelSnapshot() {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  const existing = await prisma.stockItem.count()
  if (existing > 0) {
    throw new Error('Ya hay inventario cargado. No se importó de nuevo para no duplicar.')
  }
  await prisma.stockItem.createMany({
    data: STOCK_SEED.map((row) => ({
      name: row.name,
      presentation: row.presentation || null,
      category: row.category,
      supplier: row.supplier || null,
      supplierPhone: row.supplierPhone || null,
      location: row.location,
      quantity: row.quantity,
      expiresAt: row.expiresAt ? new Date(`${row.expiresAt}T12:00:00`) : null,
      notes: row.notes || null,
      deductOnSale: !['Licores', 'Vinos'].includes(row.category),
    })),
  })
  revalidateOps()
  return { imported: STOCK_SEED.length }
}

export async function importStockFromExcelBuffer(buffer: Buffer) {
  const user = await getCurrentUser()
  requireAdmin(user.role)

  const { rows, errors } = await parseStockExcelBuffer(buffer)
  if (rows.length === 0) {
    throw new Error(errors[0] || 'No hay productos para importar. Revisa la plantilla.')
  }

  const existing = await prisma.stockItem.findMany()
  const byId = new Map(existing.map((s) => [s.id, s]))
  const keyOf = (name: string, presentation: string | null, location: string, zone: string | null) =>
    `${name.trim().toLowerCase()}|${(presentation || '').trim().toLowerCase()}|${location}|${zone || ''}`
  const byKey = new Map(existing.map((s) => [keyOf(s.name, s.presentation, s.location, s.venueZone), s]))

  let created = 0
  let updated = 0

  await prisma.$transaction(
    async (tx) => {
      for (const row of rows) {
        const found = (row.id && byId.get(row.id)) || byKey.get(keyOf(row.name, row.presentation, row.location, row.venueZone))
        const liquor = ['Licores', 'Vinos'].includes(row.category || found?.category || '')
        const qty = row.quantity
        if (found) {
          const nextQty = qty == null ? num(found.quantity) : qty
          if (nextQty < 0) {
            errors.push(`Fila ${row.rowNumber} (${row.name}): cantidad inválida`)
            continue
          }
          const updatedRow = await tx.stockItem.update({
            where: { id: found.id },
            data: {
              name: row.name.trim(),
              presentation: row.presentation?.trim() || null,
              category: row.category?.trim() || found.category,
              supplier: row.supplier?.trim() || found.supplier,
              supplierPhone: row.supplierPhone?.trim() || found.supplierPhone,
              location: row.location,
              venueZone: row.venueZone,
              quantity: nextQty,
              salePrice: row.salePrice == null ? found.salePrice : row.salePrice,
              expiresAt: row.expiresAt ? new Date(`${row.expiresAt}T12:00:00`) : found.expiresAt,
              notes: row.notes?.trim() || found.notes,
            },
          })
          if (nextQty !== num(found.quantity)) {
            await tx.stockMovement.create({
              data: {
                stockItemId: found.id,
                type: StockMovementType.ADJUSTMENT,
                quantityChange: nextQty - num(found.quantity),
                note: 'Importación Excel',
                userId: user.id,
              },
            })
          }
          byId.set(found.id, updatedRow)
          byKey.set(keyOf(updatedRow.name, updatedRow.presentation, updatedRow.location, updatedRow.venueZone), updatedRow)
          updated += 1
        } else {
          const nextQty = qty == null ? 0 : qty
          if (nextQty < 0) {
            errors.push(`Fila ${row.rowNumber} (${row.name}): cantidad inválida`)
            continue
          }
          const createdRow = await tx.stockItem.create({
            data: {
              name: row.name.trim(),
              presentation: row.presentation?.trim() || null,
              category: row.category?.trim() || null,
              supplier: row.supplier?.trim() || null,
              supplierPhone: row.supplierPhone?.trim() || null,
              location: row.location,
              venueZone: row.venueZone,
              deductOnSale: !liquor,
              quantity: nextQty,
              salePrice: row.salePrice,
              expiresAt: row.expiresAt ? new Date(`${row.expiresAt}T12:00:00`) : null,
              notes: row.notes?.trim() || null,
            },
          })
          await tx.stockMovement.create({
            data: {
              stockItemId: createdRow.id,
              type: StockMovementType.PURCHASE,
              quantityChange: nextQty,
              note: 'Alta por Excel',
              userId: user.id,
            },
          })
          byId.set(createdRow.id, createdRow)
          byKey.set(keyOf(createdRow.name, createdRow.presentation, createdRow.location, createdRow.venueZone), createdRow)
          created += 1
        }
      }

      await tx.log.create({
        data: {
          userId: user.id,
          action: LogAction.STOCK_ADJUSTED,
          details: { source: 'excel', created, updated, errors: errors.slice(0, 30) },
        },
      })
    },
    { timeout: 60000 }
  )

  revalidateOps()
  return { created, updated, errors }
}

export async function getStockItems(location?: StockLocation) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  return prisma.stockItem.findMany({
    where: location ? { location } : undefined,
    orderBy: [{ location: 'asc' }, { category: 'asc' }, { name: 'asc' }],
  })
}

export async function upsertStockItem(data: {
  id?: string
  name: string
  presentation?: string | null
  category?: string | null
  supplier?: string | null
  supplierPhone?: string | null
  location: StockLocation
  venueZone?: VenueZone | null
  deductOnSale?: boolean
  quantity: number
  cost?: number | null
  expiresAt?: string | null
  notes?: string | null
  productId?: string | null
  salePrice?: number | null
}) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  if (!data.name.trim()) throw new Error('El nombre es obligatorio')
  if (!Number.isFinite(data.quantity) || data.quantity < 0) {
    throw new Error('Cantidad inválida')
  }
  const liquor = ['Licores', 'Vinos'].includes(data.category || '')
  const venueZone =
    data.location === 'BODEGA' || data.location === 'MERMA' ? data.venueZone || null : data.venueZone || null
  if ((data.location === 'BARRA' || data.location === 'ABIERTO') && !venueZone) {
    throw new Error('Elige la zona (Astro, Studio54 o Garden)')
  }
  const payload = {
    name: data.name.trim(),
    presentation: data.presentation?.trim() || null,
    category: data.category?.trim() || null,
    supplier: data.supplier?.trim() || null,
    supplierPhone: data.supplierPhone?.trim() || null,
    location: data.location,
    venueZone,
    deductOnSale: data.deductOnSale ?? !liquor,
    quantity: data.quantity,
    cost: data.cost == null || Number.isNaN(data.cost) ? null : data.cost,
    expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T12:00:00`) : null,
    notes: data.notes?.trim() || null,
    productId: data.productId || null,
    salePrice: data.salePrice == null || Number.isNaN(data.salePrice) ? null : data.salePrice,
  }
  const item = data.id
    ? await prisma.stockItem.update({ where: { id: data.id }, data: payload })
    : await prisma.stockItem.create({ data: payload })

  await prisma.stockMovement.create({
    data: {
      stockItemId: item.id,
      type: data.id ? StockMovementType.ADJUSTMENT : StockMovementType.PURCHASE,
      quantityChange: data.quantity,
      note: data.id ? 'Edición de ficha' : 'Alta de ítem',
      userId: user.id,
    },
  })
  await prisma.log.create({
    data: { userId: user.id, action: LogAction.STOCK_ADJUSTED, details: { stockItemId: item.id, name: item.name } },
  })
  revalidateOps()
  return item
}

export async function adjustStock(stockItemId: string, quantityChange: number, note?: string) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  if (!Number.isFinite(quantityChange) || quantityChange === 0) {
    throw new Error('Indica un ajuste distinto de cero')
  }
  const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } })
  if (!item) throw new Error('Ítem no encontrado')
  const next = num(item.quantity) + quantityChange
  if (next < 0) throw new Error('La cantidad no puede quedar negativa')
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.stockItem.update({
      where: { id: stockItemId },
      data: { quantity: next },
    })
    await tx.stockMovement.create({
      data: {
        stockItemId,
        type: quantityChange < 0 ? StockMovementType.MERMA : StockMovementType.ADJUSTMENT,
        quantityChange,
        note: note?.trim() || null,
        userId: user.id,
      },
    })
    return row
  })
  revalidateOps()
  return updated
}

export async function transferStock(
  stockItemId: string,
  toLocation: StockLocation,
  quantity: number,
  toVenueZone?: VenueZone | null
) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Cantidad inválida')
  const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } })
  if (!item) throw new Error('Ítem no encontrado')
  const destZone =
    toLocation === 'BODEGA' || toLocation === 'MERMA' ? toVenueZone || null : toVenueZone || item.venueZone
  if ((toLocation === 'BARRA' || toLocation === 'ABIERTO') && !destZone) {
    throw new Error('Elige a qué zona va')
  }
  if (item.location === toLocation && (item.venueZone || null) === (destZone || null)) {
    throw new Error('Ya está en esa ubicación')
  }
  if (num(item.quantity) < quantity) throw new Error('No hay suficiente cantidad')

  await prisma.$transaction(async (tx) => {
    await tx.stockItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: quantity } },
    })
    const sibling = await tx.stockItem.findFirst({
      where: {
        name: item.name,
        presentation: item.presentation,
        location: toLocation,
        venueZone: destZone || null,
      },
    })
    const dest = sibling
      ? await tx.stockItem.update({
          where: { id: sibling.id },
          data: {
            quantity: { increment: quantity },
            salePrice: sibling.salePrice ?? item.salePrice,
            productId: sibling.productId || item.productId,
          },
        })
      : await tx.stockItem.create({
          data: {
            name: item.name,
            presentation: item.presentation,
            category: item.category,
            supplier: item.supplier,
            supplierPhone: item.supplierPhone,
            location: toLocation,
            venueZone: destZone,
            deductOnSale: item.deductOnSale,
            quantity,
            cost: item.cost,
            salePrice: item.salePrice,
            notes: item.notes,
            productId: item.productId,
          },
        })
    await tx.stockMovement.create({
      data: {
        stockItemId: dest.id,
        type: toLocation === 'MERMA' ? StockMovementType.MERMA : StockMovementType.TRANSFER,
        quantityChange: quantity,
        note: `${item.location}${item.venueZone ? `/${item.venueZone}` : ''} → ${toLocation}${
          destZone ? `/${destZone}` : ''
        }`,
        userId: user.id,
      },
    })
  })
  revalidateOps()
}

export async function getOpenCashSessionForUser(userId?: string) {
  const user = await getCurrentUser()
  const id = userId || user.id
  return prisma.cashSession.findFirst({
    where: { status: CashSessionStatus.OPEN, openedByUserId: id },
    include: { register: true },
    orderBy: { openedAt: 'desc' },
  })
}

export async function getCashOpsData() {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  await ensureCashRegisters()
  const registers = await prisma.cashRegister.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  const openAll = await prisma.cashSession.findMany({
    where: { status: 'OPEN' },
    include: {
      register: true,
      openedBy: { select: { id: true, name: true, username: true } },
    },
    orderBy: { openedAt: 'desc' },
  })

  const recent = await prisma.cashSession.findMany({
    include: {
      register: true,
      openedBy: { select: { name: true, username: true } },
      closedBy: { select: { name: true, username: true } },
    },
    orderBy: { openedAt: 'desc' },
    take: 20,
  })

  const sessionPreviews: Record<
    string,
    { systemTotal: number; byMethod: Record<string, number>; accountCount: number }
  > = {}
  for (const session of openAll) {
    sessionPreviews[session.id] = await computeSessionSystemTotals(session.id)
  }

  return { registers, openAll, recent, sessionPreviews }
}

const cashSessionExportInclude = {
  register: true,
  openedBy: { select: { name: true, username: true } },
  closedBy: { select: { name: true, username: true } },
  accounts: {
    where: { status: 'CLOSED' as const },
    select: {
      id: true,
      clientName: true,
      initialBalance: true,
      currentBalance: true,
      paymentMethod: true,
      closedAt: true,
      table: { select: { name: true, zone: true, shortCode: true } },
    },
    orderBy: { closedAt: 'asc' as const },
  },
}

export async function getCashSessionsForExport(fromStr: string, toStr: string, registerId?: string) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  const from = new Date(fromStr)
  from.setHours(0, 0, 0, 0)
  const to = new Date(toStr)
  to.setHours(23, 59, 59, 999)

  return prisma.cashSession.findMany({
    where: {
      ...(registerId ? { registerId } : {}),
      OR: [{ openedAt: { gte: from, lte: to } }, { closedAt: { gte: from, lte: to } }],
    },
    include: cashSessionExportInclude,
    orderBy: [{ openedAt: 'asc' }],
  })
}

export async function getCashSessionByIdForExport(sessionId: string) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  const row = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: cashSessionExportInclude,
  })
  if (!row) throw new Error('Arqueo no encontrado')
  return row
}

export async function getCashRegistersLite() {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  await ensureCashRegisters()
  return prisma.cashRegister.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
}

export async function getCashReportPreview(fromStr: string, toStr: string, registerId?: string) {
  const sessions = await getCashSessionsForExport(fromStr, toStr, registerId)
  return sessions.map((s) => {
    const cash = num(s.salesCash)
    const ficohsa = num(s.salesPosFicohsa)
    const bac = num(s.salesPosBac)
    const transfer = num(s.salesTransfer)
    return {
      id: s.id,
      registerName: s.register.name,
      status: s.status,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt ? s.closedAt.toISOString() : null,
      openingFloat: num(s.openingFloat),
      declaredTotal: cash + ficohsa + bac + transfer,
      salesCash: cash,
      countedCash: s.countedCash == null ? null : num(s.countedCash),
      systemTotal: s.systemTotal == null ? null : num(s.systemTotal),
      difference: s.difference == null ? null : num(s.difference),
      accounts: s.accounts.length,
      openedBy: s.openedBy?.name || s.openedBy?.username || '—',
      closedBy: s.closedBy?.name || s.closedBy?.username || '—',
    }
  })
}

async function computeSessionSystemTotals(sessionId: string) {
  const accounts = await prisma.account.findMany({
    where: { cashSessionId: sessionId, status: 'CLOSED' },
    select: { initialBalance: true, currentBalance: true, paymentMethod: true },
  })
  const byMethod: Record<string, number> = {
    CASH: 0,
    POS_FICOHSA: 0,
    POS_BAC: 0,
    TRANSFER: 0,
    SIN_METODO: 0,
  }
  let systemTotal = 0
  for (const a of accounts) {
    const consumed = num(a.initialBalance) - num(a.currentBalance)
    systemTotal += consumed
    const key = a.paymentMethod || 'SIN_METODO'
    byMethod[key] = (byMethod[key] || 0) + consumed
  }
  return { systemTotal, byMethod, accountCount: accounts.length }
}

export async function openCashSession(data: {
  registerId: string
  openingFloat: number
  deliveredByName?: string
  receivedByName?: string
}) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  if (!Number.isFinite(data.openingFloat) || data.openingFloat < 0) {
    throw new Error('Fondo inválido')
  }
  const register = await prisma.cashRegister.findUnique({ where: { id: data.registerId } })
  if (!register || !register.isActive) throw new Error('Caja no encontrada')

  const alreadyOpen = await prisma.cashSession.findFirst({
    where: { registerId: register.id, status: 'OPEN' },
  })
  if (alreadyOpen) throw new Error(`Ya hay una sesión abierta en ${register.name}`)

  const session = await prisma.cashSession.create({
    data: {
      registerId: register.id,
      openedByUserId: user.id,
      openingFloat: data.openingFloat,
      deliveredByName: data.deliveredByName?.trim() || null,
      receivedByName: data.receivedByName?.trim() || user.name || user.username,
    },
  })
  await prisma.log.create({
    data: {
      userId: user.id,
      action: LogAction.CASH_SESSION_OPENED,
      details: { sessionId: session.id, register: register.name, openingFloat: data.openingFloat },
    },
  })
  revalidateOps()
  return session
}

export async function closeCashSession(data: {
  sessionId: string
  salesCash: number
  salesPosFicohsa: number
  salesPosBac: number
  salesTransfer: number
  countedCash: number
  notes?: string
}) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  const session = await prisma.cashSession.findUnique({
    where: { id: data.sessionId },
    include: {
      register: true,
      openedBy: { select: { name: true, username: true } },
    },
  })
  if (!session) throw new Error('Sesión no encontrada')
  if (session.status === 'CLOSED') throw new Error('Esta caja ya está cerrada')

  const totals = await computeSessionSystemTotals(session.id)
  const difference = data.countedCash - num(session.openingFloat) - data.salesCash
  const declaredSales =
    data.salesCash + data.salesPosFicohsa + data.salesPosBac + data.salesTransfer

  const closed = await prisma.cashSession.update({
    where: { id: session.id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedByUserId: user.id,
      salesCash: data.salesCash,
      salesPosFicohsa: data.salesPosFicohsa,
      salesPosBac: data.salesPosBac,
      salesTransfer: data.salesTransfer,
      countedCash: data.countedCash,
      systemTotal: totals.systemTotal,
      difference,
      notes: data.notes?.trim() || null,
    },
  })
  await prisma.log.create({
    data: {
      userId: user.id,
      action: LogAction.CASH_SESSION_CLOSED,
      details: {
        sessionId: session.id,
        register: session.register.name,
        declaredSales,
        systemTotal: totals.systemTotal,
        difference,
      },
    },
  })
  try {
    await sendCashArqueoClosedMail({
      registerName: session.register.name,
      venueZone: session.register.venueZone,
      openedAt: session.openedAt,
      closedAt: closed.closedAt || new Date(),
      openingFloat: num(session.openingFloat),
      salesCash: data.salesCash,
      salesPosFicohsa: data.salesPosFicohsa,
      salesPosBac: data.salesPosBac,
      salesTransfer: data.salesTransfer,
      countedCash: data.countedCash,
      systemTotal: totals.systemTotal,
      difference,
      accountCount: totals.accountCount,
      byMethod: totals.byMethod,
      deliveredByName: session.deliveredByName,
      receivedByName: session.receivedByName,
      openedBy: session.openedBy.name || session.openedBy.username,
      closedBy: user.name || user.username,
      notes: data.notes,
    })
  } catch (err) {
    console.error('[caja] No se pudo enviar el correo de cierre:', err)
  }
  revalidateOps()
  return { ...closed, systemByMethod: totals.byMethod }
}

export async function getExpenses(from: Date, to: Date) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  const items = await prisma.expense.findMany({
    where: { date: { gte: from, lt: to } },
    include: { createdBy: { select: { name: true, username: true } } },
    orderBy: { date: 'desc' },
  })
  const total = items.reduce((s, e) => s + num(e.amount), 0)
  const byCategory: Record<string, number> = {}
  for (const e of items) {
    byCategory[e.category] = (byCategory[e.category] || 0) + num(e.amount)
  }
  return { items, total, byCategory, categories: EXPENSE_CATEGORIES }
}

export async function createExpense(data: {
  date: string
  category: string
  vendor?: string
  amount: number
  notes?: string
}) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  if (!EXPENSE_CATEGORIES.includes(data.category as (typeof EXPENSE_CATEGORIES)[number])) {
    throw new Error('Categoría inválida')
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('Monto inválido')
  const expense = await prisma.expense.create({
    data: {
      date: new Date(`${data.date}T12:00:00`),
      category: data.category,
      vendor: data.vendor?.trim() || null,
      amount: data.amount,
      notes: data.notes?.trim() || null,
      createdByUserId: user.id,
    },
  })
  await prisma.log.create({
    data: {
      userId: user.id,
      action: LogAction.EXPENSE_CREATED,
      details: { expenseId: expense.id, amount: data.amount, category: data.category },
    },
  })
  revalidateOps()
  return expense
}

export async function deleteExpense(id: string) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  await prisma.expense.delete({ where: { id } })
  revalidateOps()
}

export async function getMonthOpsSummary() {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [orderSum, entrySum, expenses, openSessions, mermaQty, expiring] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: from, lt: to }, rejected: false },
      _sum: { price: true },
    }),
    prisma.entry.aggregate({
      where: { createdAt: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
      _sum: { totalPrice: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.cashSession.findMany({
      where: { status: 'OPEN' },
      include: { register: true, openedBy: { select: { name: true, username: true } } },
    }),
    prisma.stockItem.aggregate({
      where: { location: 'MERMA' },
      _sum: { quantity: true },
    }),
    prisma.stockItem.findMany({
      where: {
        location: { not: 'MERMA' },
        expiresAt: { not: null, lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { expiresAt: 'asc' },
      take: 12,
    }),
  ])

  const sales = num(orderSum._sum.price) + num(entrySum._sum.totalPrice)
  const expenseTotal = num(expenses._sum.amount)
  return {
    sales,
    entrySales: num(entrySum._sum.totalPrice),
    floorSales: num(orderSum._sum.price),
    expenses: expenseTotal,
    margin: sales - expenseTotal,
    openSessions,
    mermaUnits: num(mermaQty._sum.quantity),
    expiring,
    monthLabel: from.toLocaleDateString('es-HN', { month: 'long', year: 'numeric' }),
  }
}

export async function findOpenSessionIdForZone(zone: VenueZone | null) {
  if (!zone) return null
  const register = await prisma.cashRegister.findFirst({
    where: { venueZone: zone, isActive: true },
    select: { id: true },
  })
  if (!register) return null
  const session = await prisma.cashSession.findFirst({
    where: { status: 'OPEN', registerId: register.id },
    select: { id: true },
  })
  return session?.id || null
}

export async function getWaiterZoneAssignment(userId?: string) {
  const user = await getCurrentUser()
  const id = userId || user.id
  const businessDate = getBusinessDate()
  return prisma.waiterZoneAssignment.findUnique({
    where: { userId_businessDate: { userId: id, businessDate: businessDateToDate(businessDate) } },
  })
}

export async function assignWaiterZone(zone: VenueZone) {
  const user = await getCurrentUser()
  if (!['MESERO', 'ADMIN'].includes(user.role)) throw new Error('No autorizado')
  const businessDate = getBusinessDate()
  const row = await prisma.waiterZoneAssignment.upsert({
    where: { userId_businessDate: { userId: user.id, businessDate: businessDateToDate(businessDate) } },
    create: { userId: user.id, zone, businessDate: businessDateToDate(businessDate) },
    update: { zone },
  })
  await prisma.log.create({
    data: {
      userId: user.id,
      action: LogAction.WAITER_ZONE_ASSIGNED,
      details: { zone, businessDate },
    },
  })
  revalidatePath('/mesero')
  revalidatePath('/mesero/pedidos')
  revalidatePath('/mesero/mesas-activas')
  revalidatePath('/cajero')
  return row
}

export async function getStaffSaleCatalog(zone: VenueZone | null) {
  const { stockMatchesProduct } = await import('./sale-catalog')
  const stock = zone
    ? await prisma.stockItem.findMany({
        where: {
          venueZone: zone,
          location: { in: ['BARRA', 'ABIERTO'] },
          salePrice: { not: null },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
    : []

  const allStockNames = await prisma.stockItem.findMany({
    select: { name: true },
  })
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  const menuOnly = products.filter((p) => !allStockNames.some((s) => stockMatchesProduct(s.name, p.name)))

  return {
    stock: stock.map((s) => ({
      id: s.id,
      kind: 'stock' as const,
      name: s.presentation ? `${s.name} (${s.presentation})` : s.name,
      price: num(s.salePrice),
      category: s.category,
      emoji: null as string | null,
      outOfStock: s.deductOnSale && num(s.quantity) <= 0,
    })),
    menu: menuOnly.map((p) => ({
      id: p.id,
      kind: 'menu' as const,
      name: p.name,
      price: num(p.price),
      category: p.category,
      emoji: p.emoji,
      outOfStock: false,
    })),
  }
}

export async function getInvoiceSaleCatalog() {
  const { stockMatchesProduct } = await import('./sale-catalog')
  const stock = await prisma.stockItem.findMany({
    where: { salePrice: { not: null }, location: { not: 'MERMA' } },
    orderBy: [{ name: 'asc' }, { quantity: 'desc' }],
    select: {
      id: true,
      name: true,
      presentation: true,
      category: true,
      salePrice: true,
      quantity: true,
    },
  })
  const seen = new Set<string>()
  const uniqueStock = []
  for (const s of stock) {
    const key = `${s.name}|${s.presentation || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    uniqueStock.push(s)
  }
  const allStockNames = await prisma.stockItem.findMany({ select: { name: true } })
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, price: true, category: true, isTaxExempt: true },
  })
  const menuOnly = products.filter((p) => !allStockNames.some((s) => stockMatchesProduct(s.name, p.name)))
  return [
    ...uniqueStock.map((s) => ({
      id: s.id,
      kind: 'stock' as const,
      name: s.presentation ? `${s.name} (${s.presentation})` : s.name,
      price: num(s.salePrice),
      category: s.category,
      isTaxExempt: false,
    })),
    ...menuOnly.map((p) => ({
      id: p.id,
      kind: 'menu' as const,
      name: p.name,
      price: num(p.price),
      category: p.category,
      isTaxExempt: p.isTaxExempt,
    })),
  ]
}

export async function getStockAvailabilityForZone(zone: VenueZone) {
  const items = await prisma.stockItem.findMany({
    where: {
      venueZone: zone,
      location: { in: ['BARRA', 'ABIERTO'] },
      productId: { not: null },
    },
    select: { productId: true, quantity: true, deductOnSale: true, name: true },
  })
  const byProduct: Record<string, { qty: number; tracked: boolean }> = {}
  for (const item of items) {
    if (!item.productId) continue
    const prev = byProduct[item.productId] || { qty: 0, tracked: true }
    prev.qty += num(item.quantity)
    prev.tracked = true
    byProduct[item.productId] = prev
  }
  return byProduct
}
