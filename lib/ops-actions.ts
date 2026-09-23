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
} from '@prisma/client'
import { CASH_REGISTERS, EXPENSE_CATEGORIES } from './ops-constants'
import { STOCK_SEED } from './stock-seed-data'

async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('No autorizado')
  return session.user
}

function requireOpsRole(role: string) {
  if (!['ADMIN', 'CAJERO'].includes(role)) {
    throw new Error('No autorizado')
  }
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
      create: { slug: r.slug, name: r.name, defaultFloat: r.defaultFloat },
      update: { name: r.name, isActive: true },
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
    })),
  })
  revalidateOps()
  return { imported: STOCK_SEED.length }
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
  quantity: number
  cost?: number | null
  expiresAt?: string | null
  notes?: string | null
}) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  if (!data.name.trim()) throw new Error('El nombre es obligatorio')
  if (!Number.isFinite(data.quantity) || data.quantity < 0) {
    throw new Error('Cantidad inválida')
  }
  const payload = {
    name: data.name.trim(),
    presentation: data.presentation?.trim() || null,
    category: data.category?.trim() || null,
    supplier: data.supplier?.trim() || null,
    supplierPhone: data.supplierPhone?.trim() || null,
    location: data.location,
    quantity: data.quantity,
    cost: data.cost == null || Number.isNaN(data.cost) ? null : data.cost,
    expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T12:00:00`) : null,
    notes: data.notes?.trim() || null,
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

export async function transferStock(stockItemId: string, toLocation: StockLocation, quantity: number) {
  const user = await getCurrentUser()
  requireAdmin(user.role)
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Cantidad inválida')
  const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } })
  if (!item) throw new Error('Ítem no encontrado')
  if (item.location === toLocation) throw new Error('Ya está en esa ubicación')
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
      },
    })
    const dest = sibling
      ? await tx.stockItem.update({
          where: { id: sibling.id },
          data: { quantity: { increment: quantity } },
        })
      : await tx.stockItem.create({
          data: {
            name: item.name,
            presentation: item.presentation,
            category: item.category,
            supplier: item.supplier,
            supplierPhone: item.supplierPhone,
            location: toLocation,
            quantity,
            cost: item.cost,
            notes: item.notes,
          },
        })
    await tx.stockMovement.create({
      data: {
        stockItemId: dest.id,
        type: toLocation === 'MERMA' ? StockMovementType.MERMA : StockMovementType.TRANSFER,
        quantityChange: quantity,
        note: `${item.location} → ${toLocation}`,
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
  requireOpsRole(user.role)
  await ensureCashRegisters()
  const registers = await prisma.cashRegister.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  const myOpen = await prisma.cashSession.findFirst({
    where: { status: 'OPEN', openedByUserId: user.id },
    include: { register: true },
  })
  const openAll =
    user.role === 'ADMIN'
      ? await prisma.cashSession.findMany({
          where: { status: 'OPEN' },
          include: {
            register: true,
            openedBy: { select: { id: true, name: true, username: true } },
          },
          orderBy: { openedAt: 'desc' },
        })
      : myOpen
        ? [myOpen]
        : []

  const recent = await prisma.cashSession.findMany({
    where: user.role === 'ADMIN' ? undefined : { openedByUserId: user.id },
    include: {
      register: true,
      openedBy: { select: { name: true, username: true } },
      closedBy: { select: { name: true, username: true } },
    },
    orderBy: { openedAt: 'desc' },
    take: 20,
  })

  let sessionPreview: {
    systemTotal: number
    byMethod: Record<string, number>
    accountCount: number
  } | null = null

  if (myOpen) {
    sessionPreview = await computeSessionSystemTotals(myOpen.id)
  }

  return { registers, myOpen, openAll, recent, sessionPreview }
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
  requireOpsRole(user.role)
  if (!Number.isFinite(data.openingFloat) || data.openingFloat < 0) {
    throw new Error('Fondo inválido')
  }
  const register = await prisma.cashRegister.findUnique({ where: { id: data.registerId } })
  if (!register || !register.isActive) throw new Error('Caja no encontrada')

  const alreadyOpen = await prisma.cashSession.findFirst({
    where: { registerId: register.id, status: 'OPEN' },
  })
  if (alreadyOpen) throw new Error(`Ya hay una sesión abierta en ${register.name}`)

  const mine = await prisma.cashSession.findFirst({
    where: { openedByUserId: user.id, status: 'OPEN' },
  })
  if (mine) throw new Error('Ya tienes una caja abierta. Ciérrala antes de abrir otra.')

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
  requireOpsRole(user.role)
  const session = await prisma.cashSession.findUnique({
    where: { id: data.sessionId },
    include: { register: true },
  })
  if (!session) throw new Error('Sesión no encontrada')
  if (session.status === 'CLOSED') throw new Error('Esta caja ya está cerrada')
  if (user.role !== 'ADMIN' && session.openedByUserId !== user.id) {
    throw new Error('Solo quien abrió la caja (o un admin) puede cerrarla')
  }

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

export async function findOpenSessionIdForCloser(userId: string) {
  const session = await prisma.cashSession.findFirst({
    where: { status: 'OPEN', openedByUserId: userId },
    select: { id: true },
  })
  return session?.id || null
}
