'use server'

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { LogAction, OrderPrepStatus, PrepCategoryDestination } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { getClientSelfOrderingEnabled, ensureAppSettingsRow, UNCATEGORIZED_PREP_CATEGORY } from './app-settings'
import { CyberSourceApiError, getCyberSourceApiHostForLogs, getCyberSourceEnvLabel } from './cybersource'
import { WALK_IN_TABLE_NAME, WALK_IN_TABLE_SHORT_CODE, WALK_IN_TABLE_ZONE } from './walk-in-table'
import {
  findOnlineSaleLogForEntry,
  perEntryRefundAmount,
  refundCyberSourceCaptureForEntry,
} from './cybersource-refund'
import { INSUFFICIENT_BALANCE_MESSAGE } from './billing-errors'

// Helper to create log
async function createLog(
  action: LogAction,
  userId?: string,
  tableId?: string,
  details?: any
) {
  await prisma.log.create({
    data: {
      userId,
      tableId,
      action,
      details: details || {},
    },
  })
}

// Auth helper (exportado para otras acciones server si hace falta)
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error('No autorizado')
  }
  return session.user
}

const SHORT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const SHORT_CODE_LENGTH = 4

async function generateUniqueTableCode() {
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = ''
    for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
      const index = Math.floor(Math.random() * SHORT_CODE_CHARS.length)
      code += SHORT_CODE_CHARS[index]
    }

    const existing = await prisma.table.findUnique({
      where: { shortCode: code },
      select: { id: true },
    })

    if (!existing) {
      return code
    }
  }

  throw new Error('No se pudo generar un código corto único. Intenta nuevamente.')
}

async function getOrCreateWalkInTableRow() {
  return prisma.table.upsert({
    where: { shortCode: WALK_IN_TABLE_SHORT_CODE },
    update: {
      name: WALK_IN_TABLE_NAME,
      zone: WALK_IN_TABLE_ZONE,
    },
    create: {
      name: WALK_IN_TABLE_NAME,
      zone: WALK_IN_TABLE_ZONE,
      shortCode: WALK_IN_TABLE_SHORT_CODE,
    },
    select: {
      id: true,
      name: true,
      shortCode: true,
      zone: true,
    },
  })
}

function ensureCashierAccess(role: string) {
  if (!['ADMIN', 'CAJERO'].includes(role)) {
    throw new Error('Solo cajeros o administradores pueden acceder a esta sección')
  }
}

/** Crear/editar/eliminar eventos: solo admin de la casa */
function ensureEntradasAdminOnly(role: string) {
  if (role !== 'ADMIN') {
    throw new Error('Solo administradores pueden crear o modificar eventos')
  }
}

const ENTRADAS_MODULE_ROLES = ['ADMIN', 'CLIENTE_TICKETERA'] as const

function ensureEntradasModuleAccess(role: string) {
  if (!ENTRADAS_MODULE_ROLES.includes(role as (typeof ENTRADAS_MODULE_ROLES)[number])) {
    throw new Error('No autorizado al módulo de entradas')
  }
}

function isEntradasPlatformAdmin(role: string) {
  return role === 'ADMIN'
}

/** null = ve todos los eventos (admin) */
async function getEntradasEventIdScopeForUser(userId: string, role: string): Promise<string[] | null> {
  if (role === 'ADMIN') return null
  if (role !== 'CLIENTE_TICKETERA') return []
  const rows = await prisma.userEventAssignment.findMany({
    where: { userId },
    select: { eventId: true },
  })
  return rows.map((r) => r.eventId)
}

async function assertEntradasEventAccess(userId: string, role: string, eventId: string) {
  const scope = await getEntradasEventIdScopeForUser(userId, role)
  if (scope === null) return
  if (!scope.includes(eventId)) {
    throw new Error('No tienes acceso a este evento')
  }
}

async function assertEntryInEntradasScope(userId: string, role: string, entryId: string) {
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    select: { eventId: true },
  })
  if (!entry) throw new Error('Entrada no encontrada')
  await assertEntradasEventAccess(userId, role, entry.eventId)
}

function ensureEntryScanAccess(role: string) {
  if (!['ADMIN', 'CAJERO', 'TAQUILLA', 'MESERO'].includes(role)) {
    throw new Error('Solo taquilla, meseros, cajeros o administradores pueden escanear entradas')
  }
}

// ========== USER ACTIONS ==========

export async function createUser(data: {
  username: string
  password: string
  role: 'ADMIN' | 'MESERO' | 'CAJERO' | 'TAQUILLA' | 'COCINA' | 'BAR' | 'CLIENTE_TICKETERA'
  name?: string
}) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden crear usuarios')
  }

  const bcrypt = require('bcryptjs')
  const hashedPassword = await bcrypt.hash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
      role: data.role,
      name: data.name?.trim() || null,
    },
  })

  await createLog(LogAction.USER_CREATED, currentUser.id, undefined, {
    createdUserId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  })

  revalidatePath('/admin/usuarios')
  return user
}

export async function updateUser(
  userId: string,
  data: {
    username?: string
    password?: string
    role?: 'ADMIN' | 'MESERO' | 'CAJERO' | 'TAQUILLA' | 'COCINA' | 'BAR' | 'CLIENTE_TICKETERA'
    name?: string | null
  }
) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden editar usuarios')
  }

  const prev = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  const updateData: any = {}
  if (data.username) updateData.username = data.username
  if (data.role) updateData.role = data.role
  if (data.name !== undefined) updateData.name = data.name?.trim() || null
  if (data.password) {
    const bcrypt = require('bcryptjs')
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  })

  if (prev?.role === 'CLIENTE_TICKETERA' && data.role && data.role !== 'CLIENTE_TICKETERA') {
    await prisma.userEventAssignment.deleteMany({ where: { userId } })
  }

  await createLog(LogAction.USER_UPDATED, currentUser.id, undefined, {
    updatedUserId: user.id,
    changes: data,
  })

  revalidatePath('/admin/usuarios')
  return user
}

export async function deleteUser(userId: string) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden eliminar usuarios')
  }
  if (currentUser.id === userId) {
    throw new Error('No puedes eliminar tu propio usuario')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true },
  })

  if (!user) {
    throw new Error('Usuario no encontrado')
  }

  const ordersCount = await prisma.order.count({ where: { userId } })
  if (ordersCount > 0) {
    throw new Error(
      'No puedes eliminar este usuario porque tiene pedidos registrados'
    )
  }

  await prisma.user.delete({ where: { id: userId } })

  await createLog(LogAction.USER_DELETED, currentUser.id, undefined, {
    deletedUserId: userId,
    username: user.username,
    name: user.name,
  })

  revalidatePath('/admin/usuarios')
}

// ========== TABLE ACTIONS ==========

export async function createTable(data: { name: string; zone?: string }) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden crear mesas')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const shortCode = await generateUniqueTableCode()
  const table = await prisma.table.create({
    data: {
      name: data.name,
      zone: data.zone,
      shortCode,
      qrUrl: `${appUrl}/mesa/${crypto.randomUUID()}`,
    },
  })

  // Update with actual ID
  const qrUrl = `${appUrl}/mesa/${table.id}`
  const updatedTable = await prisma.table.update({
    where: { id: table.id },
    data: { qrUrl },
  })

  await createLog(LogAction.TABLE_CREATED, currentUser.id, table.id, {
    tableName: table.name,
    zone: table.zone,
    shortCode,
  })

  revalidatePath('/admin/mesas')
  
  // Return table with same structure as getTables
  return prisma.table.findUnique({
    where: { id: updatedTable.id },
    include: {
      accounts: {
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { accounts: true },
      },
    },
  })
}

export async function updateTable(
  tableId: string,
  data: { name?: string; zone?: string }
) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden editar mesas')
  }

  const table = await prisma.table.update({
    where: { id: tableId },
    data,
  })

  await createLog(LogAction.TABLE_UPDATED, currentUser.id, tableId, {
    changes: data,
  })

  revalidatePath('/admin/mesas')
  return table
}

export async function deleteTable(tableId: string) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden eliminar mesas')
  }

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { id: true, name: true, zone: true },
  })

  if (!table) {
    throw new Error('Mesa no encontrada')
  }

  const openAccounts = await prisma.account.count({
    where: { tableId, status: 'OPEN' },
  })

  if (openAccounts > 0) {
    throw new Error(
      'No puedes eliminar esta mesa porque tiene cuentas abiertas'
    )
  }

  await prisma.table.delete({ where: { id: tableId } })

  await createLog(LogAction.TABLE_DELETED, currentUser.id, tableId, {
    tableId,
    tableName: table.name,
    zone: table.zone,
  })

  revalidatePath('/admin/mesas')
}

// ========== CAJERO DASHBOARD ==========

export async function getCashierDashboardData() {
  const currentUser = await getCurrentUser()
  ensureCashierAccess(currentUser.role)

  const [accounts, pendingOrders, recentServed, activeMeseros] = await Promise.all([
    prisma.account.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        table: {
          select: { id: true, name: true, zone: true, shortCode: true },
        },
        openedBy: {
          select: { id: true, name: true, username: true },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { name: true, price: true, isTaxExempt: true } },
            user: { select: { username: true, name: true } },
          },
          take: 100,
        },
      },
    }),
    prisma.order.findMany({
      where: { served: false, rejected: false },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        quantity: true,
        price: true,
        createdAt: true,
        served: true,
        rejected: true,
        product: { select: { name: true, price: true } },
        account: {
          select: {
            id: true,
            openedByUserId: true,
            table: { select: { name: true, shortCode: true, zone: true } },
          },
        },
        user: { select: { username: true, name: true } },
      },
    }),
    prisma.order.findMany({
      where: { served: true },
      orderBy: { createdAt: 'desc' },
      take: 7,
      include: {
        product: { select: { name: true, price: true } },
        account: {
          select: {
            id: true,
            openedByUserId: true,
            table: { select: { name: true, shortCode: true, zone: true } },
          },
        },
        user: { select: { username: true, name: true } },
      },
    }),
    // Todos los meseros para el filtro del cajero (admins y cliente se excluyen del filtro)
    prisma.user.findMany({
      where: { role: 'MESERO', username: { not: 'CLIENTE' } },
      select: { id: true, name: true, username: true },
      orderBy: { name: 'asc' },
    }),
  ])

  let watchedMeseroIds: string[] = []
  if (currentUser.role === 'CAJERO') {
    watchedMeseroIds = (
      await prisma.cajeroMeseroWatch.findMany({
        where: { cajeroId: currentUser.id },
        select: { meseroId: true },
      })
    ).map((w) => w.meseroId)
  }

  return { accounts, pendingOrders, recentServed, activeMeseros, watchedMeseroIds }
}

/** Persiste qué meseros notifican a este cajero (misma lógica que el filtro del panel). */
export async function setCajeroMeseroWatches(meseroIds: string[]) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'CAJERO') {
    throw new Error('Solo los cajeros pueden guardar meseros seguidos')
  }
  const allowed = await prisma.user.findMany({
    where: {
      id: { in: meseroIds },
      role: 'MESERO',
      username: { not: 'CLIENTE' },
    },
    select: { id: true },
  })
  const allowedIds = allowed.map((u) => u.id)
  await prisma.$transaction([
    prisma.cajeroMeseroWatch.deleteMany({ where: { cajeroId: currentUser.id } }),
    ...(allowedIds.length > 0
      ? [
          prisma.cajeroMeseroWatch.createMany({
            data: allowedIds.map((meseroId) => ({
              cajeroId: currentUser.id,
              meseroId,
            })),
          }),
        ]
      : []),
  ])
  revalidatePath('/cajero')
}

export async function setOrderServed(orderId: string, served: boolean) {
  const currentUser = await getCurrentUser()
  ensureCashierAccess(currentUser.role)

  const before = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: { select: { name: true, requiresPrep: true } } },
  })
  if (!before) {
    throw new Error('Pedido no encontrado')
  }

  let prepStatus: OrderPrepStatus = before.prepStatus
  if (served && !before.rejected) {
    prepStatus = before.product.requiresPrep ? OrderPrepStatus.QUEUED : OrderPrepStatus.NONE
  } else if (!served) {
    prepStatus = OrderPrepStatus.NONE
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      served,
      prepStatus,
      servedByUserId: served ? currentUser.id : null,
    },
    include: {
      account: {
        select: {
          tableId: true,
          table: { select: { shortCode: true, name: true } },
        },
      },
      product: { select: { name: true } },
    },
  })

  revalidatePath('/cajero')
  revalidatePath('/cocina')
  revalidatePath('/bar')
  revalidatePath(`/mesa/${order.account.tableId}`)
  return order
}

export async function rejectOrder(orderId: string) {
  const currentUser = await getCurrentUser()
  ensureCashierAccess(currentUser.role)

  // Get order with account info
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      account: {
        select: {
          id: true,
          tableId: true,
          currentBalance: true,
          status: true,
          table: { select: { shortCode: true, name: true } },
        },
      },
      product: { select: { name: true, price: true } },
      user: { select: { username: true } },
    },
  })

  if (!order) {
    throw new Error('Pedido no encontrado')
  }

  // Verificar si el campo rejected existe y está en true
  // Si el campo no existe en la BD, será undefined/null y esto será false
  if (order.rejected === true) {
    throw new Error('Este pedido ya fue rechazado')
  }

  if (order.account.status === 'CLOSED') {
    throw new Error('No se puede rechazar un pedido de una cuenta cerrada')
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Lock account row
    const lockedAccount = await tx.account.findUnique({
      where: { id: order.account.id },
    })

    if (!lockedAccount) {
      throw new Error('Cuenta no encontrada')
    }

    // Mark order as rejected
    const rejectedOrder = await tx.order.update({
      where: { id: orderId },
      data: { rejected: true },
    })

    // Revert balance (add back the price)
    const newBalance = Number(lockedAccount.currentBalance) + Number(order.price)

    await tx.account.update({
      where: { id: order.account.id },
      data: { currentBalance: newBalance },
    })

    // Log the rejection
    await tx.log.create({
      data: {
        userId: currentUser.id,
        tableId: order.account.tableId,
        action: 'ORDER_REJECTED',
        details: {
          orderId: order.id,
          productName: order.product.name,
          price: order.price.toString(),
          quantity: order.quantity,
          reason: 'Fuera de stock',
        },
      },
    })

    return rejectedOrder
  })

  revalidatePath('/cajero')
  revalidatePath(`/mesa/${order.account.tableId}`)
  return result
}

// Cancelar pedido (cliente o mesero)
export async function cancelOrderByCustomer(orderId: string) {
  const customerUser = await getOrCreateCustomerUser()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      account: {
        select: {
          id: true,
          tableId: true,
          currentBalance: true,
          status: true,
        },
      },
      product: { select: { name: true, price: true } },
    },
  })

  if (!order) {
    throw new Error('Pedido no encontrado')
  }

  if (order.rejected === true) {
    throw new Error('Este pedido ya fue cancelado')
  }

  if (order.served === true) {
    throw new Error('No se puede cancelar un pedido que ya fue servido')
  }

  if (order.account.status === 'CLOSED') {
    throw new Error('No se puede cancelar un pedido de una cuenta cerrada')
  }

  // Los clientes pueden cancelar cualquier pedido pendiente de su mesa
  // (no hay restricción de usuario ya que todos usan el mismo usuario CLIENTE)

  const result = await prisma.$transaction(async (tx) => {
    const lockedAccount = await tx.account.findUnique({
      where: { id: order.account.id },
    })

    if (!lockedAccount) {
      throw new Error('Cuenta no encontrada')
    }

    const rejectedOrder = await tx.order.update({
      where: { id: orderId },
      data: { rejected: true },
    })

    const newBalance = Number(lockedAccount.currentBalance) + Number(order.price)

    await tx.account.update({
      where: { id: order.account.id },
      data: { currentBalance: newBalance },
    })

    await tx.log.create({
      data: {
        userId: customerUser.id,
        tableId: order.account.tableId,
        action: 'ORDER_REJECTED',
        details: {
          orderId: order.id,
          productName: order.product.name,
          price: order.price.toString(),
          quantity: order.quantity,
          reason: 'Cancelado por cliente',
          cancelledBy: 'CLIENTE',
        },
      },
    })

    return rejectedOrder
  })

  revalidatePath('/clientes')
  revalidatePath(`/mesa/${order.account.tableId}`)
  return result
}

export async function cancelOrderByMesero(orderId: string) {
  const currentUser = await getCurrentUser()

  if (!['MESERO', 'ADMIN'].includes(currentUser.role)) {
    throw new Error('Solo meseros o administradores pueden cancelar pedidos')
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      account: {
        select: {
          id: true,
          tableId: true,
          currentBalance: true,
          status: true,
        },
      },
      product: { select: { name: true, price: true } },
    },
  })

  if (!order) {
    throw new Error('Pedido no encontrado')
  }

  if (order.rejected === true) {
    throw new Error('Este pedido ya fue cancelado')
  }

  if (order.served === true) {
    throw new Error('No se puede cancelar un pedido que ya fue servido')
  }

  if (order.account.status === 'CLOSED') {
    throw new Error('No se puede cancelar un pedido de una cuenta cerrada')
  }

  const result = await prisma.$transaction(async (tx) => {
    const lockedAccount = await tx.account.findUnique({
      where: { id: order.account.id },
    })

    if (!lockedAccount) {
      throw new Error('Cuenta no encontrada')
    }

    const rejectedOrder = await tx.order.update({
      where: { id: orderId },
      data: { rejected: true },
    })

    const newBalance = Number(lockedAccount.currentBalance) + Number(order.price)

    await tx.account.update({
      where: { id: order.account.id },
      data: { currentBalance: newBalance },
    })

    await tx.log.create({
      data: {
        userId: currentUser.id,
        tableId: order.account.tableId,
        action: 'ORDER_REJECTED',
        details: {
          orderId: order.id,
          productName: order.product.name,
          price: order.price.toString(),
          quantity: order.quantity,
          reason: 'Cancelado por mesero',
          cancelledBy: 'MESERO',
          cancelledByUser: currentUser.username,
        },
      },
    })

    return rejectedOrder
  })

  revalidatePath('/mesero')
  revalidatePath('/mesero/pedidos')
  revalidatePath(`/mesa/${order.account.tableId}`)
  return result
}

// ========== ACCOUNT ACTIONS ==========

export async function createAccount(data: {
  tableId: string
  initialBalance: number
  clientName?: string | null
}) {
  const currentUser = await getCurrentUser()

  const account = await prisma.account.create({
    data: {
      tableId: data.tableId,
      initialBalance: data.initialBalance,
      currentBalance: data.initialBalance,
      status: 'OPEN',
      openedByUserId: currentUser.id,
      clientName: data.clientName?.trim() || null,
    },
  })

  await createLog(LogAction.ACCOUNT_OPENED, currentUser.id, data.tableId, {
    accountId: account.id,
    initialBalance: data.initialBalance,
  })

  revalidatePath(`/mesa/${data.tableId}`)
  revalidatePath('/admin/cuentas')
  return account
}

export async function closeAccount(accountId: string) {
  const currentUser = await getCurrentUser()

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      orders: true,
      table: true,
    },
  })

  if (!account) {
    throw new Error('Cuenta no encontrada')
  }

  if (account.status === 'CLOSED') {
    throw new Error('La cuenta ya está cerrada')
  }

  // Aceptar automáticamente todos los pedidos pendientes (no aceptados ni rechazados)
  const pendingOrders = account.orders.filter(
    (order) => !order.served && !order.rejected
  )

  if (pendingOrders.length > 0) {
    const pendingIds = pendingOrders.map((o) => o.id)
    const withProd = await prisma.order.findMany({
      where: { id: { in: pendingIds }, accountId },
      select: { id: true, product: { select: { requiresPrep: true } } },
    })
    const prepIds = withProd.filter((o) => o.product.requiresPrep).map((o) => o.id)
    const noPrepIds = withProd.filter((o) => !o.product.requiresPrep).map((o) => o.id)
    const ops: ReturnType<typeof prisma.order.updateMany>[] = []
    if (prepIds.length > 0) {
      ops.push(
        prisma.order.updateMany({
          where: {
            id: { in: prepIds },
            accountId,
            served: false,
            rejected: false,
          },
          data: { served: true, prepStatus: OrderPrepStatus.QUEUED, servedByUserId: currentUser.id },
        })
      )
    }
    if (noPrepIds.length > 0) {
      ops.push(
        prisma.order.updateMany({
          where: {
            id: { in: noPrepIds },
            accountId,
            served: false,
            rejected: false,
          },
          data: { served: true, prepStatus: OrderPrepStatus.NONE, servedByUserId: currentUser.id },
        })
      )
    }
    if (ops.length > 0) {
      await prisma.$transaction(ops)
    }

    // Crear log para indicar que los pedidos fueron aceptados automáticamente
    await createLog(
      LogAction.ACCOUNT_CLOSED,
      currentUser.id,
      account.tableId,
      {
        accountId: accountId,
        autoAcceptedOrdersCount: pendingOrders.length,
        autoAcceptedOrderIds: pendingOrders.map((o) => o.id),
      }
    )
  }

  const totalConsumed =
    Number(account.initialBalance) - Number(account.currentBalance)

  const closedAccount = await prisma.account.update({
    where: { id: accountId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  })

  // El log ya fue creado arriba si hubo pedidos aceptados automáticamente
  // Si no hubo pedidos pendientes, crear el log aquí
  if (pendingOrders.length === 0) {
    await createLog(LogAction.ACCOUNT_CLOSED, currentUser.id, account.tableId, {
      accountId,
      initialBalance: account.initialBalance,
      totalConsumed,
      finalBalance: account.currentBalance,
      ordersCount: account.orders.length,
    })
  } else {
    // Actualizar el log existente con información adicional
    await createLog(LogAction.ACCOUNT_CLOSED, currentUser.id, account.tableId, {
      accountId,
      initialBalance: account.initialBalance,
      totalConsumed,
      finalBalance: account.currentBalance,
      ordersCount: account.orders.length,
      autoAcceptedOrdersCount: pendingOrders.length,
    })
  }

  revalidatePath(`/mesa/${account.tableId}`)
  revalidatePath('/admin/cuentas')
  revalidatePath('/cocina')
  revalidatePath('/bar')
  return closedAccount
}

// Cerrar automáticamente cuentas abiertas por más de 12 horas
export async function closeOldAccounts() {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)

  // Buscar cuentas antiguas (solo campos necesarios para cerrar)
  const oldAccounts = await prisma.account.findMany({
    where: {
      status: 'OPEN',
      createdAt: { lt: twelveHoursAgo },
    },
    select: {
      id: true,
      tableId: true,
      createdAt: true,
      initialBalance: true,
      currentBalance: true,
      _count: { select: { orders: true } },
      orders: {
        where: { served: false, rejected: false },
        select: { id: true },
      },
    },
  })

  const results = {
    closed: 0,
    errors: 0,
    accountIds: [] as string[],
  }

  // Cerrar cada cuenta encontrada
  for (const account of oldAccounts) {
    try {
      // Aceptar automáticamente todos los pedidos pendientes
      const pendingOrderIds = account.orders.map((o) => o.id)

      if (pendingOrderIds.length > 0) {
        const withProd = await prisma.order.findMany({
          where: { id: { in: pendingOrderIds }, accountId: account.id },
          select: { id: true, product: { select: { requiresPrep: true } } },
        })
        const prepIds = withProd.filter((o) => o.product.requiresPrep).map((o) => o.id)
        const noPrepIds = withProd.filter((o) => !o.product.requiresPrep).map((o) => o.id)
        const ops: ReturnType<typeof prisma.order.updateMany>[] = []
        if (prepIds.length > 0) {
          ops.push(
            prisma.order.updateMany({
              where: {
                id: { in: prepIds },
                accountId: account.id,
                served: false,
                rejected: false,
              },
              data: { served: true, prepStatus: OrderPrepStatus.QUEUED, servedByUserId: null },
            })
          )
        }
        if (noPrepIds.length > 0) {
          ops.push(
            prisma.order.updateMany({
              where: {
                id: { in: noPrepIds },
                accountId: account.id,
                served: false,
                rejected: false,
              },
              data: { served: true, prepStatus: OrderPrepStatus.NONE, servedByUserId: null },
            })
          )
        }
        if (ops.length > 0) {
          await prisma.$transaction(ops)
        }
      }

      const totalConsumed =
        Number(account.initialBalance) - Number(account.currentBalance)

      // Cerrar la cuenta
      await prisma.account.update({
        where: { id: account.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
      })

      // Crear log indicando cierre automático
      await createLog(
        LogAction.ACCOUNT_CLOSED,
        undefined, // Sin usuario (cierre automático del sistema)
        account.tableId,
        {
          accountId: account.id,
          autoClosed: true,
          hoursOpen: Math.round(
            (Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60)
          ),
          initialBalance: account.initialBalance,
          totalConsumed,
          finalBalance: account.currentBalance,
          ordersCount: account.orders.length,
          autoAcceptedOrdersCount: pendingOrderIds.length,
        }
      )

      revalidatePath(`/mesa/${account.tableId}`)
      revalidatePath('/admin/cuentas')
      revalidatePath('/cocina')
      revalidatePath('/bar')

      results.closed++
      results.accountIds.push(account.id)
    } catch (error: any) {
      console.error(`Error al cerrar cuenta ${account.id}:`, error)
      results.errors++
    }
  }

  return results
}

// ========== APP SETTINGS (ADMIN) ==========

export async function setClientSelfOrderingEnabled(enabled: boolean) {
  const u = await getCurrentUser()
  if (u.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden cambiar esta opción')
  }
  await ensureAppSettingsRow()
  await prisma.appSettings.update({
    where: { id: 1 },
    data: { clientSelfOrderingEnabled: enabled },
  })
  revalidatePath('/clientes')
  revalidatePath('/admin/configuracion')
}

export async function updateInvoiceSettings(data: {
  invoiceLegalName?: string | null
  invoiceTradeName?: string | null
  invoiceRtn?: string | null
  invoiceAddress?: string | null
  invoicePhone?: string | null
  invoiceEmail?: string | null
  invoiceCaiBlock?: string | null
  invoiceFooterNote?: string | null
  invoiceIsvPercent?: number | null
}) {
  const u = await getCurrentUser()
  if (u.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden editar la facturación')
  }
  await ensureAppSettingsRow()
  await prisma.appSettings.update({
    where: { id: 1 },
    data: {
      invoiceLegalName: data.invoiceLegalName,
      invoiceTradeName: data.invoiceTradeName,
      invoiceRtn: data.invoiceRtn,
      invoiceAddress: data.invoiceAddress,
      invoicePhone: data.invoicePhone,
      invoiceEmail: data.invoiceEmail,
      invoiceCaiBlock: data.invoiceCaiBlock,
      invoiceFooterNote: data.invoiceFooterNote,
      invoiceIsvPercent: data.invoiceIsvPercent,
    },
  })
  revalidatePath('/admin/configuracion')
  revalidatePath('/cajero')
}

// ========== COMANDAS (COCINA / BAR) ==========

function ensurePrepStationAccess(role: string, station: 'COCINA' | 'BAR') {
  if (station === 'COCINA') {
    if (!['ADMIN', 'COCINA'].includes(role)) {
      throw new Error('No autorizado para cocina')
    }
  } else if (!['ADMIN', 'BAR'].includes(role)) {
    throw new Error('No autorizado para bar')
  }
}

async function hasGlobalPrepRouting(): Promise<boolean> {
  try {
    return (await prisma.prepCategoryStation.count()) > 0
  } catch {
    return false
  }
}

function productCategoryKeyFromProduct(category: string | null | undefined): string {
  return category == null || category === '' ? UNCATEGORIZED_PREP_CATEGORY : category
}

function productWhereFromCategoryList(cats: string[]): Prisma.ProductWhereInput {
  const hasNone = cats.includes(UNCATEGORIZED_PREP_CATEGORY)
  const named = cats.filter((c) => c !== UNCATEGORIZED_PREP_CATEGORY)
  const parts: Prisma.ProductWhereInput[] = []
  if (named.length) parts.push({ category: { in: named } })
  if (hasNone) parts.push({ OR: [{ category: null }, { category: '' }] })
  if (parts.length === 0) return { id: '__impossible_prep_category__' }
  return parts.length === 1 ? parts[0]! : { OR: parts }
}

async function barCajeroExtraWhere(barUserId: string): Promise<
  { ok: true; extra: Prisma.OrderWhereInput } | { ok: false; needsCajeros: true }
> {
  const watches = await prisma.barCajeroWatch.findMany({
    where: { barUserId },
    select: { cajeroId: true },
  })
  const ids = watches.map((w) => w.cajeroId)
  if (ids.length === 0) return { ok: false, needsCajeros: true }
  return {
    ok: true,
    extra: {
      OR: [{ servedByUserId: { in: ids } }, { servedByUserId: null }],
    },
  }
}

const emptyOrderListWhere: Prisma.OrderWhereInput = { id: { in: [] } }

const prepQueueOrderSelect = {
  id: true,
  quantity: true,
  price: true,
  prepStatus: true,
  createdAt: true,
  servedByUserId: true,
  product: { select: { name: true, category: true } },
  servedBy: { select: { username: true, name: true } },
  account: {
    select: {
      id: true,
      clientName: true,
      openedBy: { select: { username: true, name: true } },
      table: { select: { name: true, shortCode: true, zone: true } },
    },
  },
} satisfies Prisma.OrderSelect

export async function getPrepCategoryKeys() {
  const u = await getCurrentUser()
  if (!['ADMIN', 'COCINA', 'BAR'].includes(u.role)) {
    throw new Error('No autorizado')
  }
  const rows = await prisma.product.groupBy({
    by: ['category'],
    where: { isActive: true },
  })
  const keys = rows.map((r) =>
    r.category == null || r.category === '' ? UNCATEGORIZED_PREP_CATEGORY : r.category
  )
  return Array.from(new Set(keys)).sort()
}

export async function getMyPrepCategories() {
  const u = await getCurrentUser()
  if (!['COCINA', 'BAR'].includes(u.role)) {
    throw new Error('No autorizado')
  }
  const rows = await prisma.userPrepCategory.findMany({
    where: { userId: u.id },
    select: { category: true },
    orderBy: { category: 'asc' },
  })
  return rows.map((r) => r.category)
}

export async function setMyPrepCategories(categories: string[]) {
  const u = await getCurrentUser()
  if (!['COCINA', 'BAR'].includes(u.role)) {
    throw new Error('No autorizado')
  }
  const allowed = new Set(await getPrepCategoryKeys())
  for (const c of categories) {
    if (!allowed.has(c)) {
      throw new Error(`Categoría no válida: ${c}`)
    }
  }
  await prisma.$transaction([
    prisma.userPrepCategory.deleteMany({ where: { userId: u.id } }),
    ...(categories.length > 0
      ? [
          prisma.userPrepCategory.createMany({
            data: categories.map((category) => ({ userId: u.id, category })),
          }),
        ]
      : []),
  ])
  revalidatePath('/cocina')
  revalidatePath('/bar')
}

export async function getPrepQueue(_station: 'COCINA' | 'BAR') {
  const u = await getCurrentUser()
  ensurePrepStationAccess(u.role, _station)

  const baseWhere: Prisma.OrderWhereInput = {
    served: true,
    rejected: false,
    prepStatus: { in: [OrderPrepStatus.QUEUED, OrderPrepStatus.PREPARING] },
  }

  const stationEnum = _station === 'COCINA' ? PrepCategoryDestination.COCINA : PrepCategoryDestination.BAR
  const useGlobal = await hasGlobalPrepRouting()

  const mergeBarCajero = async (
    where: Prisma.OrderWhereInput
  ): Promise<{ where: Prisma.OrderWhereInput; needsCajeros: boolean }> => {
    if (_station !== 'BAR' || u.role !== 'BAR') {
      return { where, needsCajeros: false }
    }
    const bx = await barCajeroExtraWhere(u.id)
    if (!bx.ok) return { where: { AND: [where, emptyOrderListWhere] }, needsCajeros: true }
    return { where: { ...where, AND: [bx.extra] }, needsCajeros: false }
  }

  if (useGlobal) {
    const routed = await prisma.prepCategoryStation.findMany({
      where: { station: stationEnum },
      select: { category: true },
    })
    const stationCats = routed.map((r) => r.category)
    const pw = productWhereFromCategoryList(stationCats)

    if (u.role === 'ADMIN') {
      const orders =
        stationCats.length === 0
          ? []
          : await prisma.order.findMany({
              where: { ...baseWhere, product: pw },
              orderBy: { createdAt: 'asc' },
              take: 200,
              select: prepQueueOrderSelect,
            })
      return {
        orders,
        needsCategories: false as const,
        needsCajeros: false as const,
        useGlobalRouting: true as const,
      }
    }

    if (stationCats.length === 0) {
      const needsBarCaj =
        _station === 'BAR' && u.role === 'BAR' ? !(await barCajeroExtraWhere(u.id)).ok : false
      return {
        orders: [],
        needsCategories: false as const,
        needsCajeros: needsBarCaj,
        useGlobalRouting: true as const,
      }
    }

    let where: Prisma.OrderWhereInput = { ...baseWhere, product: pw }
    let needsCajeros = false
    if (_station === 'BAR' && u.role === 'BAR') {
      const merged = await mergeBarCajero(where)
      where = merged.where
      needsCajeros = merged.needsCajeros
    }

    const orders = needsCajeros
      ? []
      : await prisma.order.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          take: 150,
          select: prepQueueOrderSelect,
        })

    return {
      orders,
      needsCategories: false as const,
      needsCajeros,
      useGlobalRouting: true as const,
    }
  }

  // —— Modo legacy: cada usuario elige categorías (cocina/bar) ——
  if (u.role === 'ADMIN') {
    const orders = await prisma.order.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: prepQueueOrderSelect,
    })
    return {
      orders,
      needsCategories: false as const,
      needsCajeros: false as const,
      useGlobalRouting: false as const,
    }
  }

  const mine = await prisma.userPrepCategory.findMany({
    where: { userId: u.id },
    select: { category: true },
  })
  const cats = mine.map((m) => m.category)
  if (cats.length === 0) {
    const needsBarCaj = _station === 'BAR' && u.role === 'BAR' ? !(await barCajeroExtraWhere(u.id)).ok : false
    return {
      orders: [],
      needsCategories: true as const,
      needsCajeros: needsBarCaj,
      useGlobalRouting: false as const,
    }
  }

  const hasNone = cats.includes(UNCATEGORIZED_PREP_CATEGORY)
  const named = cats.filter((c) => c !== UNCATEGORIZED_PREP_CATEGORY)

  const productOr: Prisma.ProductWhereInput[] = []
  if (named.length > 0) {
    productOr.push({ category: { in: named } })
  }
  if (hasNone) {
    productOr.push({ OR: [{ category: null }, { category: '' }] })
  }

  let whereLegacy: Prisma.OrderWhereInput = {
    ...baseWhere,
    product: { OR: productOr },
  }
  let needsCajeros = false
  if (_station === 'BAR' && u.role === 'BAR') {
    const merged = await mergeBarCajero(whereLegacy)
    whereLegacy = merged.where
    needsCajeros = merged.needsCajeros
  }

  const orders = needsCajeros
    ? []
    : await prisma.order.findMany({
        where: whereLegacy,
        orderBy: { createdAt: 'asc' },
        take: 150,
        select: prepQueueOrderSelect,
      })

  return {
    orders,
    needsCategories: false as const,
    needsCajeros,
    useGlobalRouting: false as const,
  }
}

export async function advancePrepStatus(
  orderId: string,
  station: 'COCINA' | 'BAR',
  next: 'PREPARING' | 'READY'
) {
  const u = await getCurrentUser()
  ensurePrepStationAccess(u.role, station)

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      served: true,
      rejected: true,
      prepStatus: true,
      servedByUserId: true,
      product: { select: { category: true } },
    },
  })
  if (!order || !order.served || order.rejected) {
    throw new Error('Pedido no válido')
  }

  if (u.role !== 'ADMIN') {
    const catKey = productCategoryKeyFromProduct(order.product.category)
    const useGlobal = await hasGlobalPrepRouting()
    if (useGlobal) {
      const row = await prisma.prepCategoryStation.findUnique({
        where: { category: catKey },
      })
      const want = station === 'COCINA' ? PrepCategoryDestination.COCINA : PrepCategoryDestination.BAR
      if (!row || row.station !== want) {
        throw new Error('Este pedido no corresponde a esta estación')
      }
      if (station === 'BAR' && u.role === 'BAR') {
        const bx = await barCajeroExtraWhere(u.id)
        if (!bx.ok) {
          throw new Error('Configura qué cajeros ves en tu comanda de bar')
        }
        const allowedIds = await prisma.barCajeroWatch.findMany({
          where: { barUserId: u.id },
          select: { cajeroId: true },
        })
        const idset = new Set(allowedIds.map((x) => x.cajeroId))
        const sid = order.servedByUserId
        if (sid != null && !idset.has(sid)) {
          throw new Error('Este pedido no corresponde a tus cajeros')
        }
      }
    } else {
      const mine = await prisma.userPrepCategory.findMany({
        where: { userId: u.id },
        select: { category: true },
      })
      if (!mine.some((m) => m.category === catKey)) {
        throw new Error('Este pedido no corresponde a tus categorías')
      }
      if (station === 'BAR' && u.role === 'BAR') {
        const bx = await barCajeroExtraWhere(u.id)
        if (!bx.ok) throw new Error('Configura qué cajeros ves en tu comanda de bar')
        const allowedIds = await prisma.barCajeroWatch.findMany({
          where: { barUserId: u.id },
          select: { cajeroId: true },
        })
        const idset = new Set(allowedIds.map((x) => x.cajeroId))
        const sid = order.servedByUserId
        if (sid != null && !idset.has(sid)) {
          throw new Error('Este pedido no corresponde a tus cajeros')
        }
      }
    }
  }

  const expected = next === 'PREPARING' ? OrderPrepStatus.QUEUED : OrderPrepStatus.PREPARING
  const nextStatus = next === 'PREPARING' ? OrderPrepStatus.PREPARING : OrderPrepStatus.READY

  const r = await prisma.order.updateMany({
    where: { id: orderId, prepStatus: expected },
    data: { prepStatus: nextStatus },
  })
  if (r.count === 0) {
    throw new Error('El pedido ya fue actualizado o no está en el estado esperado')
  }

  revalidatePath('/cocina')
  revalidatePath('/bar')
  revalidatePath('/cajero')
}

export async function getPrepRoutingAdmin() {
  const u = await getCurrentUser()
  if (u.role !== 'ADMIN') {
    throw new Error('Solo administradores')
  }
  const keys = await getPrepCategoryKeys()
  const rows = await prisma.prepCategoryStation.findMany({
    select: { category: true, station: true },
  })
  const map = new Map(rows.map((r) => [r.category, r.station]))
  return {
    keys,
    assignments: keys.map((k) => ({
      category: k,
      station: (map.get(k) as 'COCINA' | 'BAR' | undefined) ?? null,
    })),
    useGlobal: rows.length > 0,
  }
}

export async function setPrepRoutingAdmin(assignments: { category: string; station: 'COCINA' | 'BAR' }[]) {
  const u = await getCurrentUser()
  if (u.role !== 'ADMIN') {
    throw new Error('Solo administradores')
  }
  const allowed = new Set(await getPrepCategoryKeys())
  for (const a of assignments) {
    if (!allowed.has(a.category)) {
      throw new Error(`Categoría no válida: ${a.category}`)
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.prepCategoryStation.deleteMany()
    if (assignments.length) {
      await tx.prepCategoryStation.createMany({
        data: assignments.map((a) => ({
          category: a.category,
          station: a.station === 'COCINA' ? PrepCategoryDestination.COCINA : PrepCategoryDestination.BAR,
        })),
      })
    }
  })
  revalidatePath('/admin/comandas')
  revalidatePath('/cocina')
  revalidatePath('/bar')
}

export async function clearPrepRoutingAdmin() {
  const u = await getCurrentUser()
  if (u.role !== 'ADMIN') {
    throw new Error('Solo administradores')
  }
  await prisma.prepCategoryStation.deleteMany()
  revalidatePath('/admin/comandas')
  revalidatePath('/cocina')
  revalidatePath('/bar')
}

export async function getCajerosForBarPickup() {
  const u = await getCurrentUser()
  if (!['BAR', 'ADMIN'].includes(u.role)) {
    throw new Error('No autorizado')
  }
  return prisma.user.findMany({
    where: { role: 'CAJERO' },
    select: { id: true, username: true, name: true },
    orderBy: { username: 'asc' },
  })
}

export async function getMyBarCajeroWatches() {
  const u = await getCurrentUser()
  if (u.role !== 'BAR') {
    throw new Error('No autorizado')
  }
  const rows = await prisma.barCajeroWatch.findMany({
    where: { barUserId: u.id },
    select: { cajeroId: true },
  })
  return rows.map((r) => r.cajeroId)
}

export async function setBarCajeroWatches(cajeroIds: string[]) {
  const u = await getCurrentUser()
  if (u.role !== 'BAR') {
    throw new Error('Solo usuarios de bar pueden configurar cajeros')
  }
  const unique = Array.from(new Set(cajeroIds.filter(Boolean)))
  if (unique.length === 0) {
    await prisma.barCajeroWatch.deleteMany({ where: { barUserId: u.id } })
    revalidatePath('/bar')
    return
  }
  const valid = await prisma.user.findMany({
    where: { id: { in: unique }, role: 'CAJERO' },
    select: { id: true },
  })
  const okIds = valid.map((v) => v.id)
  await prisma.$transaction([
    prisma.barCajeroWatch.deleteMany({ where: { barUserId: u.id } }),
    prisma.barCajeroWatch.createMany({
      data: okIds.map((cajeroId) => ({ barUserId: u.id, cajeroId })),
    }),
  ])
  revalidatePath('/bar')
}

/** Lectura pública (sin sesión) para landing /clientes */
export async function getPublicClientOrderingSetting() {
  return getClientSelfOrderingEnabled()
}

export async function getProductsForCashierInvoice() {
  const u = await getCurrentUser()
  if (!['ADMIN', 'CAJERO'].includes(u.role)) {
    throw new Error('No autorizado')
  }
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, price: true, category: true, isTaxExempt: true },
  })
}

export async function createAndCloseFreeInvoiceAccount(data: {
  meseroId: string
  receptorName?: string | null
  receptorRtn?: string | null
  lines: Array<{ productId: string; quantity: number }>
}) {
  const u = await getCurrentUser()
  if (!['ADMIN', 'CAJERO'].includes(u.role)) {
    throw new Error('No autorizado')
  }

  const mesero = await prisma.user.findFirst({
    where: { id: data.meseroId, role: 'MESERO', username: { not: 'CLIENTE' } },
    select: { id: true, name: true, username: true },
  })
  if (!mesero) throw new Error('Mesero no válido')

  const rawLines = (data.lines || []).filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity >= 1)
  if (rawLines.length === 0) throw new Error('Agrega al menos un artículo válido')

  const uniqueProductIds = Array.from(new Set(rawLines.map((l) => l.productId)))
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds }, isActive: true },
    select: { id: true, name: true, price: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))

  const normalized = rawLines
    .map((l) => {
      const p = byId.get(l.productId)
      if (!p) return null
      const quantity = Math.max(1, Math.floor(l.quantity))
      return {
        productId: p.id,
        quantity,
        unitPrice: Number(p.price),
        linePrice: Number(p.price) * quantity,
        productName: p.name,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)

  if (normalized.length === 0) {
    throw new Error('Los productos seleccionados no están disponibles')
  }

  const table = await getOrCreateWalkInTableRow()
  const total = normalized.reduce((s, l) => s + l.linePrice, 0)
  const clientLabel = data.receptorName?.trim() || null
  const rtnLabel = data.receptorRtn?.trim() || null
  const clientName = rtnLabel ? `${clientLabel || 'Factura libre'} · RTN ${rtnLabel}` : clientLabel || 'Factura libre'

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.account.create({
      data: {
        tableId: table.id,
        initialBalance: total,
        currentBalance: 0,
        status: 'CLOSED',
        closedAt: new Date(),
        openedByUserId: mesero.id,
        clientName,
      },
      select: { id: true, tableId: true },
    })

    await tx.order.createMany({
      data: normalized.map((l) => ({
        accountId: created.id,
        productId: l.productId,
        userId: mesero.id,
        price: l.linePrice,
        quantity: l.quantity,
        served: true,
        rejected: false,
        prepStatus: OrderPrepStatus.NONE,
        servedByUserId: u.id,
      })),
    })

    await tx.log.create({
      data: {
        userId: u.id,
        tableId: created.tableId,
        action: LogAction.ACCOUNT_OPENED,
        details: {
          accountId: created.id,
          type: 'FREE_INVOICE',
          meseroId: mesero.id,
          mesero: mesero.name || mesero.username,
          total,
          lines: normalized.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            quantity: l.quantity,
            linePrice: l.linePrice,
          })),
        },
      },
    })

    await tx.log.create({
      data: {
        userId: u.id,
        tableId: created.tableId,
        action: LogAction.ACCOUNT_CLOSED,
        details: {
          accountId: created.id,
          reason: 'FREE_INVOICE_AUTO_CLOSE',
          total,
        },
      },
    })

    return created
  })

  revalidatePath('/cajero')
  revalidatePath('/admin/cuentas')

  return {
    ok: true as const,
    accountId: account.id,
    meseroName: mesero.name || mesero.username,
  }
}

export async function addBalanceToAccount(accountId: string, amount: number) {
  const currentUser = await getCurrentUser()

  // Verificar que el usuario tenga permisos (MESERO o ADMIN)
  if (!['MESERO', 'ADMIN'].includes(currentUser.role)) {
    throw new Error('No tienes permisos para agregar saldo a la cuenta')
  }

  if (amount <= 0) {
    throw new Error('El monto debe ser mayor a 0')
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      table: true,
    },
  })

  if (!account) {
    throw new Error('Cuenta no encontrada')
  }

  if (account.status === 'CLOSED') {
    throw new Error('No se puede agregar saldo a una cuenta cerrada')
  }

  const newCurrentBalance = Number(account.currentBalance) + amount
  const newInitialBalance = Number(account.initialBalance) + amount

  const updatedAccount = await prisma.account.update({
    where: { id: accountId },
    data: {
      initialBalance: newInitialBalance,
      currentBalance: newCurrentBalance,
    },
  })

  await createLog(LogAction.ACCOUNT_OPENED, currentUser.id, account.tableId, {
    accountId: account.id,
    action: 'BALANCE_ADDED',
    amountAdded: amount,
    previousInitialBalance: Number(account.initialBalance),
    previousCurrentBalance: Number(account.currentBalance),
    newInitialBalance: newInitialBalance,
    newCurrentBalance: newCurrentBalance,
  })

  revalidatePath(`/mesa/${account.tableId}`)
  revalidatePath(`/clientes?tableId=${account.tableId}`)
  revalidatePath('/admin/cuentas')
  return updatedAccount
}

export async function exportAccountToExcel(accountId: string) {
  const currentUser = await getCurrentUser()
  
  // Get account with all details
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      table: true,
      orders: {
        include: {
          product: true,
          user: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!account) {
    throw new Error('Cuenta no encontrada')
  }

  // Dynamic import of xlsx (server-side only)
  const XLSX = await import('xlsx')

  // Calculate statistics
  const totalConsumed = Number(account.initialBalance) - Number(account.currentBalance)
  const rejectedOrders = account.orders.filter((o) => o.rejected === true)
  const servedOrders = account.orders.filter((o) => o.served === true && o.rejected !== true)
  const pendingOrders = account.orders.filter((o) => !o.served && o.rejected !== true)
  
  const totalRejectedValue = rejectedOrders.reduce((sum, o) => sum + Number(o.price), 0)
  const totalServedValue = servedOrders.reduce((sum, o) => sum + Number(o.price), 0)
  const totalPendingValue = pendingOrders.reduce((sum, o) => sum + Number(o.price), 0)
  
  // Summary sheet with complete information
  const summaryData = [
    ['RESUMEN COMPLETO DE CUENTA'],
    [],
    ['INFORMACIÓN DE LA MESA'],
    ['Mesa', account.table.name],
    ['Código', account.table.shortCode],
    ['Zona', account.table.zone || 'N/A'],
    [],
    ['INFORMACIÓN TEMPORAL'],
    ['Fecha de Apertura', account.createdAt.toLocaleDateString('es-ES')],
    ['Hora de Apertura', account.createdAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })],
    account.closedAt ? ['Fecha de Cierre', account.closedAt.toLocaleDateString('es-ES')] : ['Fecha de Cierre', 'N/A'],
    account.closedAt ? ['Hora de Cierre', account.closedAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })] : ['Hora de Cierre', 'N/A'],
    ['Estado', account.status === 'OPEN' ? 'Abierta' : 'Cerrada'],
    [],
    ['INFORMACIÓN FINANCIERA'],
    ['Saldo Inicial', `$${Number(account.initialBalance).toFixed(2)}`],
    ['Total Consumido', `$${totalConsumed.toFixed(2)}`],
    ['Saldo Disponible', `$${Number(account.currentBalance).toFixed(2)}`],
    [],
    ['RESUMEN DE PEDIDOS'],
    ['Total de Pedidos', account.orders.length],
    ['Pedidos Realizados', `${servedOrders.length} ($${totalServedValue.toFixed(2)})`],
    ['Pedidos Rechazados', `${rejectedOrders.length} ($${totalRejectedValue.toFixed(2)})`],
    ['Pedidos Pendientes', `${pendingOrders.length} ($${totalPendingValue.toFixed(2)})`],
    [],
    ['NOTA', 'Los pedidos rechazados no afectan el saldo final de la cuenta.'],
  ]

  // Orders sheet with all details
  const ordersData = [
    ['#', 'Fecha', 'Hora', 'Mesero', 'Producto', 'Cantidad', 'Precio Unitario', 'Total', 'Estado', 'Observaciones'],
  ]

  account.orders.forEach((order, index) => {
    const orderDate = new Date(order.createdAt)
    let status = 'Pendiente'
    let observations = ''
    
    if (order.rejected === true) {
      status = 'Rechazado'
      observations = 'Pedido rechazado - Fuera de stock'
    } else if (order.served) {
      status = 'Realizado'
    }
    
    const waiterName = order.user?.name || order.user?.username || 'N/A'
    
    ordersData.push([
      (index + 1).toString(), // Número de orden
      orderDate.toLocaleDateString('es-ES'),
      orderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      waiterName,
      order.product.name,
      order.quantity.toString(),
      `$${Number(order.product.price).toFixed(2)}`,
      `$${Number(order.price).toFixed(2)}`,
      status,
      observations,
    ])
  })

  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Add summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

  // Add orders sheet
  const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData)
  XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Pedidos')

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  // Return buffer and filename
  const fileName = `Cuenta_${account.table.shortCode}_${account.createdAt.toISOString().split('T')[0]}.xlsx`
  
  return {
    buffer,
    fileName,
  }
}

// ========== PRODUCT ACTIONS ==========

export async function createProduct(data: {
  name: string
  price: number
  category?: string
  emoji?: string
  requiresPrep?: boolean
  isTaxExempt?: boolean
}) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden crear productos')
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      price: data.price,
      category: data.category,
      emoji: data.emoji || null,
      isActive: true,
      requiresPrep: data.requiresPrep !== false,
      isTaxExempt: data.isTaxExempt === true,
    },
  })

  await createLog(LogAction.PRODUCT_ADDED, currentUser.id, undefined, {
    productId: product.id,
    name: product.name,
    price: product.price,
  })

  revalidatePath('/admin/inventario')
  return product
}

export async function updateProduct(
  productId: string,
  data: {
    name?: string
    price?: number
    category?: string
    emoji?: string | null
    isActive?: boolean
    requiresPrep?: boolean
    isTaxExempt?: boolean
  }
) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden editar productos')
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data,
  })

  await createLog(LogAction.PRODUCT_UPDATED, currentUser.id, undefined, {
    productId,
    changes: data,
  })

  revalidatePath('/admin/inventario')
  return product
}

export async function deactivateProduct(productId: string) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden desactivar productos')
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  })

  await createLog(LogAction.PRODUCT_DEACTIVATED, currentUser.id, undefined, {
    productId,
    name: product.name,
  })

  revalidatePath('/admin/inventario')
  return product
}

export async function activateProduct(productId: string) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden activar productos')
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: { isActive: true },
  })

  await createLog(LogAction.PRODUCT_ACTIVATED, currentUser.id, undefined, {
    productId,
    name: product.name,
  })

  revalidatePath('/admin/inventario')
  return product
}

export async function deleteProduct(productId: string) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden eliminar productos')
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, price: true },
  })

  if (!product) {
    throw new Error('Producto no encontrado')
  }

  // Verificar si tiene órdenes asociadas
  const ordersCount = await prisma.order.count({ where: { productId } })
  if (ordersCount > 0) {
    throw new Error(
      'No puedes eliminar este producto porque tiene pedidos registrados'
    )
  }

  await prisma.product.delete({ where: { id: productId } })

  await createLog(LogAction.PRODUCT_DELETED, currentUser.id, undefined, {
    productId,
    name: product.name,
    price: product.price,
  })

  revalidatePath('/admin/inventario')
}

// ========== ORDER ACTIONS ==========

export async function createOrder(data: {
  accountId: string
  productId: string
  quantity?: number
}) {
  const currentUser = await getCurrentUser()

  // Get account with lock to prevent race conditions
  const account = await prisma.account.findUnique({
    where: { id: data.accountId },
    include: {
      table: true,
      orders: true,
      openedBy: { select: { id: true, name: true, username: true, role: true } },
    },
  })

  if (!account) {
    throw new Error('Cuenta no encontrada')
  }

  if (account.status === 'CLOSED') {
    throw new Error('La cuenta está cerrada')
  }

  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  })

  if (!product) {
    throw new Error('Producto no encontrado')
  }

  if (!product.isActive) {
    throw new Error('Producto no disponible')
  }

  const quantity = data.quantity || 1
  const totalPrice = Number(product.price) * quantity
  const isWalkInAccount =
    account.table?.shortCode === WALK_IN_TABLE_SHORT_CODE ||
    (account.table?.zone === WALK_IN_TABLE_ZONE && account.table?.name === WALK_IN_TABLE_NAME)

  if (!isWalkInAccount && Number(account.currentBalance) < totalPrice) {
    throw new Error(INSUFFICIENT_BALANCE_MESSAGE)
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Lock account row
    const lockedAccount = await tx.account.findUnique({
      where: { id: data.accountId },
    })

    if (!lockedAccount) {
      throw new Error('Cuenta no encontrada')
    }
    if (!isWalkInAccount && Number(lockedAccount.currentBalance) < totalPrice) {
      throw new Error(INSUFFICIENT_BALANCE_MESSAGE)
    }

    // Create order
    const order = await tx.order.create({
      data: {
        accountId: data.accountId,
        productId: data.productId,
        userId: currentUser.id,
        price: totalPrice,
        quantity,
      },
    })

    // Update balance
    const newBalance =
      Number(lockedAccount.currentBalance) - totalPrice

    await tx.account.update({
      where: { id: data.accountId },
      data: { currentBalance: newBalance },
    })

    return order
  })

  await createLog(LogAction.ORDER_CREATED, currentUser.id, account.tableId, {
    orderId: result.id,
    accountId: data.accountId,
    productId: data.productId,
    productName: product.name,
    price: totalPrice,
    quantity,
  })

  // Notificar al mesero que abrió la cuenta si quien agrega no es él
  if (account.openedByUserId && account.openedByUserId !== currentUser.id) {
    const { sendPushToAccountOpener } = await import('@/lib/push')
    sendPushToAccountOpener(
      account.openedByUserId,
      account.table.name,
      product.name,
      quantity
    ).catch((e) => console.error('[Push] Error:', e))
  }

  // Notificar a cajeros que siguen al mesero de este pedido (misma selección que el panel)
  {
    const meseroName = account.openedBy?.name || account.openedBy?.username || 'Desconocido'
    const { resolveMeseroIdForCajeroPush, sendPushToCajerosFollowingMesero } = await import('@/lib/push')
    const meseroId = resolveMeseroIdForCajeroPush('staff', currentUser, account)
    sendPushToCajerosFollowingMesero(
      meseroId,
      account.table.name,
      product.name,
      quantity,
      meseroName
    ).catch((e) => console.error('[Push Cajero] Error:', e))
  }

  // Revalidar rutas para que tanto clientes como meseros vean los cambios
  revalidatePath(`/clientes`, 'page')
  revalidatePath(`/mesa/${account.tableId}`, 'page')
  revalidatePath('/admin/cuentas', 'page')
  revalidatePath('/mesero/pedidos', 'page')
  revalidatePath('/cajero', 'page')
  // También revalidar el layout para limpiar cache
  revalidatePath('/', 'layout')
  return result
}

export async function cancelOrder(orderId: string) {
  const currentUser = await getCurrentUser()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      account: {
        include: { table: true },
      },
      product: true,
    },
  })

  if (!order) {
    throw new Error('Pedido no encontrado')
  }

  // Use transaction
  await prisma.$transaction(async (tx) => {
    // Restore balance
    await tx.account.update({
      where: { id: order.accountId },
      data: {
        currentBalance: {
          increment: Number(order.price),
        },
      },
    })

    // Delete order
    await tx.order.delete({
      where: { id: orderId },
    })
  })

  await createLog(LogAction.ORDER_CANCELLED, currentUser.id, order.account.tableId, {
    orderId,
    accountId: order.accountId,
    productName: order.product.name,
    refundedAmount: order.price,
  })

  revalidatePath(`/mesa/${order.account.tableId}`)
  revalidatePath('/admin/cuentas')
}

// ========== DATA FETCHING ==========

export async function getMeseroActiveTables() {
  const currentUser = await getCurrentUser()
  if (!['MESERO', 'ADMIN'].includes(currentUser.role)) {
    throw new Error('Solo meseros o administradores pueden acceder')
  }

  const accounts = await prisma.account.findMany({
    where: {
      status: 'OPEN',
      openedByUserId: currentUser.id,
    },
    select: {
      id: true,
      initialBalance: true,
      currentBalance: true,
      createdAt: true,
      clientName: true,
      table: {
        select: {
          id: true,
          name: true,
          shortCode: true,
          zone: true,
        },
      },
      orders: {
        select: { id: true, served: true, rejected: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return accounts
}

export async function getWalkInTable() {
  const currentUser = await getCurrentUser()
  if (!['MESERO', 'ADMIN'].includes(currentUser.role)) {
    throw new Error('Solo meseros o administradores pueden acceder')
  }
  return getOrCreateWalkInTableRow()
}

export async function getTables() {
  await getCurrentUser()
  return prisma.table.findMany({
    include: {
      accounts: {
        where: { status: 'OPEN' },
        include: { openedBy: { select: { name: true, username: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { accounts: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getTableById(tableId: string) {
  await getCurrentUser()
  return prisma.table.findUnique({
    where: { id: tableId },
    include: {
      accounts: {
        where: { status: 'OPEN' },
        include: {
          openedBy: { select: { name: true, username: true } },
          orders: {
            include: {
              product: true,
              user: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
}

// Función pública para obtener mesa (sin autenticación)
export async function getTableByIdPublic(tableId: string) {
  return prisma.table.findUnique({
    where: { id: tableId },
    include: {
      accounts: {
        where: { status: 'OPEN' },
        include: {
          openedBy: { select: { name: true, username: true } },
          orders: {
            where: { rejected: false },
            include: {
              product: true,
              user: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
}

// Función pública para obtener mesa por código corto
export async function getTableByShortCodePublic(shortCode: string) {
  const normalized = shortCode.toUpperCase().trim()
  return prisma.table.findFirst({
    where: { shortCode: normalized },
    include: {
      accounts: {
        where: { status: 'OPEN' },
        include: {
          openedBy: { select: { name: true, username: true } },
          orders: {
            where: { rejected: false },
            include: {
              product: true,
              user: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
}

// Función pública para obtener productos activos
export async function getProductsPublic() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
}

// Helper para obtener o crear usuario CLIENTE
async function getOrCreateCustomerUser() {
  let customerUser = await prisma.user.findFirst({
    where: { username: 'CLIENTE' },
  })

  if (!customerUser) {
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('cliente' + Date.now(), 10)
    customerUser = await prisma.user.create({
      data: {
        username: 'CLIENTE',
        password: hashedPassword,
        role: 'MESERO', // Usamos MESERO como rol por defecto
        name: 'Cliente',
      },
    })
  }

  return customerUser
}

// Crear pedido desde cliente (público)
export async function createCustomerOrder(data: {
  accountId: string
  productId: string
  quantity?: number
}) {
  const clientOrdersOk = await getClientSelfOrderingEnabled()
  if (!clientOrdersOk) {
    throw new Error('Los pedidos desde la mesa están deshabilitados. Solicita al personal.')
  }

  // Obtener usuario cliente
  const customerUser = await getOrCreateCustomerUser()

  // Get account with lock to prevent race conditions
  const account = await prisma.account.findUnique({
    where: { id: data.accountId },
    include: {
      table: true,
      orders: true,
      openedBy: { select: { id: true, name: true, username: true, role: true } },
    },
  })

  if (!account) {
    throw new Error('Cuenta no encontrada')
  }

  if (account.status === 'CLOSED') {
    throw new Error('La cuenta está cerrada')
  }

  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  })

  if (!product) {
    throw new Error('Producto no encontrado')
  }

  if (!product.isActive) {
    throw new Error('Producto no disponible')
  }

  const quantity = data.quantity || 1
  const totalPrice = Number(product.price) * quantity

  if (Number(account.currentBalance) < totalPrice) {
    throw new Error(INSUFFICIENT_BALANCE_MESSAGE)
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Lock account row
    const lockedAccount = await tx.account.findUnique({
      where: { id: data.accountId },
    })

    if (!lockedAccount || Number(lockedAccount.currentBalance) < totalPrice) {
      throw new Error(INSUFFICIENT_BALANCE_MESSAGE)
    }

    // Create order
    const order = await tx.order.create({
      data: {
        accountId: data.accountId,
        productId: data.productId,
        userId: customerUser.id,
        price: totalPrice,
        quantity,
      },
    })

    // Update balance
    const newBalance = Number(lockedAccount.currentBalance) - totalPrice

    await tx.account.update({
      where: { id: data.accountId },
      data: { currentBalance: newBalance },
    })

    return order
  })

  await createLog(LogAction.ORDER_CREATED, customerUser.id, account.tableId, {
    orderId: result.id,
    accountId: data.accountId,
    productId: data.productId,
    productName: product.name,
    price: totalPrice,
    quantity,
    isCustomerOrder: true,
  })

  // Notificar al mesero que abrió la cuenta (cliente agregó pedido)
  if (account.openedByUserId) {
    const { sendPushToAccountOpener } = await import('@/lib/push')
    sendPushToAccountOpener(
      account.openedByUserId,
      account.table.name,
      product.name,
      quantity
    ).catch((e) => console.error('[Push] Error:', e))
  }

  // Notificar a cajeros que siguen al mesero de la mesa
  {
    const meseroName = account.openedBy?.name || account.openedBy?.username || 'Desconocido'
    const { resolveMeseroIdForCajeroPush, sendPushToCajerosFollowingMesero } = await import('@/lib/push')
    const meseroId = resolveMeseroIdForCajeroPush('customer', customerUser, account)
    sendPushToCajerosFollowingMesero(
      meseroId,
      account.table.name,
      product.name,
      quantity,
      meseroName
    ).catch((e) => console.error('[Push Cajero] Error:', e))
  }

  // Revalidar todas las posibles rutas que pueden mostrar esta mesa
  // Nota: revalidatePath no funciona bien con query params, así que revalidamos sin ellos
  revalidatePath(`/clientes`, 'page')
  // También revalidar usando el patrón de ruta dinámica
  revalidatePath(`/mesa/${account.tableId}`, 'page')
  // Forzar revalidación del layout para limpiar cache
  revalidatePath('/', 'layout')
  return result
}

export async function getProducts(activeOnly: boolean = false) {
  await getCurrentUser()
  return prisma.product.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: 'asc' },
  })
}

export async function getUsers() {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden ver usuarios')
  }
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      name: true,
      ticketeraEventAssignments: { select: { eventId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Listado de eventos para asignar a clientes ticketera (solo admin) */
export async function getEventsForTicketeraAssignment() {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden ver este listado')
  }
  return prisma.event.findMany({
    orderBy: { date: 'desc' },
    select: { id: true, name: true, date: true, isActive: true },
  })
}

/** Reemplaza las asignaciones de eventos de un usuario cliente ticketera */
export async function setUserTicketeraEvents(userId: string, eventIds: string[]) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden asignar eventos')
  }
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })
  if (!target) throw new Error('Usuario no encontrado')
  if (target.role !== 'CLIENTE_TICKETERA') {
    throw new Error('Solo aplica a usuarios con rol Cliente ticketera')
  }
  const unique = Array.from(new Set(eventIds.filter(Boolean)))
  await prisma.$transaction(async (tx) => {
    await tx.userEventAssignment.deleteMany({ where: { userId } })
    if (unique.length) {
      await tx.userEventAssignment.createMany({
        data: unique.map((eventId) => ({ userId, eventId })),
      })
    }
  })
  revalidatePath('/admin/usuarios')
  revalidatePath('/admin/entradas')
}

export async function getLogs(filters?: {
  tableId?: string
  userId?: string
  action?: LogAction
  startDate?: Date
  endDate?: Date
}) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden ver logs')
  }

  const where: Prisma.LogWhereInput = {}
  if (filters?.tableId) where.tableId = filters.tableId
  if (filters?.userId) where.userId = filters.userId
  if (filters?.action) where.action = filters.action
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {}
    if (filters.startDate) where.createdAt.gte = filters.startDate
    if (filters.endDate) where.createdAt.lte = filters.endDate
  }

  return prisma.log.findMany({
    where,
    include: {
      user: {
        select: { username: true, role: true },
      },
      table: {
        select: { name: true, zone: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })
}

export async function getDashboardStats() {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden ver estadísticas')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    totalConsumedToday,
    openAccounts,
    activeWaiters,
    topProducts,
    activeMeserosWithTables,
  ] = await Promise.all([
    // Total consumido hoy
    prisma.order.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        price: true,
      },
    }),

    // Cuentas abiertas
    prisma.account.count({
      where: { status: 'OPEN' },
    }),

    // Meseros activos hoy
    prisma.user.count({
      where: {
        role: 'MESERO',
        logs: {
          some: {
            action: 'LOGIN',
            createdAt: {
              gte: today,
            },
          },
        },
      },
    }),

    // Productos más vendidos
    prisma.order.groupBy({
      by: ['productId'],
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    }),

    // Meseros con cuentas abiertas y cuántas mesas llevan
    prisma.account.groupBy({
      by: ['openedByUserId'],
      where: {
        status: 'OPEN',
        openedByUserId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ])

  // Get product details for top products
  const productIds = topProducts.map((p) => p.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  })

  // Obtener nombres de meseros que tienen cuentas abiertas
  const meseroIds = activeMeserosWithTables
    .map((m) => m.openedByUserId)
    .filter((id): id is string => id != null)
  const meseros = await prisma.user.findMany({
    where: { id: { in: meseroIds } },
    select: { id: true, name: true, username: true },
  })
  const activeMeserosList = activeMeserosWithTables
    .filter((m) => m.openedByUserId)
    .map((m) => {
      const user = meseros.find((u) => u.id === m.openedByUserId)
      return {
        id: m.openedByUserId!,
        name: user?.name || user?.username || 'Desconocido',
        username: user?.username || '',
        tableCount: m._count.id,
      }
    })

  const topProductsWithDetails = topProducts.map((tp) => {
    const product = products.find((p) => p.id === tp.productId)
    return {
      productId: tp.productId,
      productName: product?.name || 'Desconocido',
      totalQuantity: tp._sum.quantity || 0,
      totalOrders: tp._count.id,
    }
  })

  return {
    totalConsumedToday: Number(totalConsumedToday._sum.price || 0),
    openAccounts,
    activeWaiters,
    topProducts: topProductsWithDetails,
    activeMeserosList,
  }
}

// ========== REPORTES ==========

export async function getReportData(fromStr: string, toStr: string) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden generar reportes')
  }

  const from = new Date(fromStr)
  from.setHours(0, 0, 0, 0)
  const to = new Date(toStr)
  to.setHours(23, 59, 59, 999)

  const dateFilter = { gte: from, lte: to }

  const [
    totalSales,
    totalOrders,
    rejectedOrders,
    accountsOpened,
    accountsClosed,
    ordersByProduct,
    ordersByHour,
    ordersByDay,
    meseroAccounts,
    meseroSales,
  ] = await Promise.all([
    // Total de ventas
    prisma.order.aggregate({
      where: { createdAt: dateFilter, rejected: false },
      _sum: { price: true },
    }),
    // Total de pedidos aceptados
    prisma.order.count({
      where: { createdAt: dateFilter, rejected: false },
    }),
    // Total de pedidos rechazados
    prisma.order.count({
      where: { createdAt: dateFilter, rejected: true },
    }),
    // Cuentas abiertas en rango
    prisma.account.count({
      where: { createdAt: dateFilter },
    }),
    // Cuentas cerradas en rango
    prisma.account.count({
      where: { closedAt: dateFilter },
    }),
    // Pedidos agrupados por producto
    prisma.order.groupBy({
      by: ['productId'],
      where: { createdAt: dateFilter, rejected: false },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
    }),
    // Pedidos agrupados por hora (raw SQL para extraer hora)
    prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*)::bigint as count
      FROM orders
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to} AND rejected = false
      GROUP BY hour
      ORDER BY hour
    `,
    // Ventas por día (raw SQL)
    prisma.$queryRaw<Array<{ day: string; sales: string; orders: bigint; accounts: bigint }>>`
      SELECT
        TO_CHAR(o."createdAt", 'YYYY-MM-DD') as day,
        COALESCE(SUM(o.price), 0)::text as sales,
        COUNT(*)::bigint as orders,
        COUNT(DISTINCT o."accountId")::bigint as accounts
      FROM orders o
      WHERE o."createdAt" >= ${from} AND o."createdAt" <= ${to} AND o.rejected = false
      GROUP BY day
      ORDER BY day
    `,
    // Mesas por mesero
    prisma.account.groupBy({
      by: ['openedByUserId'],
      where: { createdAt: dateFilter, openedByUserId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    // Ventas por mesero (a través de las cuentas que abrieron)
    prisma.$queryRaw<Array<{ userId: string; totalSales: string; totalOrders: bigint }>>`
      SELECT
        a."openedByUserId" as "userId",
        COALESCE(SUM(o.price), 0)::text as "totalSales",
        COUNT(o.id)::bigint as "totalOrders"
      FROM orders o
      JOIN accounts a ON o."accountId" = a.id
      WHERE o."createdAt" >= ${from} AND o."createdAt" <= ${to}
        AND o.rejected = false
        AND a."openedByUserId" IS NOT NULL
      GROUP BY a."openedByUserId"
      ORDER BY "totalSales" DESC
    `,
  ])

  // Obtener nombres de productos
  const productIds = ordersByProduct.map((p) => p.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, category: true },
  })

  // Obtener nombres de meseros
  const meseroIds = Array.from(new Set([
    ...meseroAccounts.map((m) => m.openedByUserId).filter((id): id is string => id != null),
    ...meseroSales.map((m) => m.userId),
  ]))
  const meseros = await prisma.user.findMany({
    where: { id: { in: meseroIds } },
    select: { id: true, name: true, username: true },
  })

  // Calcular promedio de consumo por mesa
  const avgConsumption = accountsOpened > 0
    ? Number(totalSales._sum.price || 0) / accountsOpened
    : 0

  // Armar datos de productos
  const productData = ordersByProduct.map((p) => {
    const prod = products.find((pr) => pr.id === p.productId)
    return {
      name: prod?.name || 'Desconocido',
      category: prod?.category || 'Sin categoría',
      quantity: p._sum.quantity || 0,
      amount: Number(p._sum.price || 0),
    }
  })

  // Ventas por categoría
  const categoryMap = new Map<string, { quantity: number; amount: number }>()
  for (const p of productData) {
    const existing = categoryMap.get(p.category) || { quantity: 0, amount: 0 }
    existing.quantity += p.quantity
    existing.amount += p.amount
    categoryMap.set(p.category, existing)
  }
  const categoryData = Array.from(categoryMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.amount - a.amount)

  // Armar datos de meseros (combinar mesas + ventas)
  const meseroData = meseroIds.map((id) => {
    const user = meseros.find((u) => u.id === id)
    const accs = meseroAccounts.find((m) => m.openedByUserId === id)
    const sales = meseroSales.find((m) => m.userId === id)
    return {
      name: user?.name || user?.username || 'Desconocido',
      tables: accs?._count.id || 0,
      sales: Number(sales?.totalSales || 0),
      orders: Number(sales?.totalOrders || 0),
    }
  }).sort((a, b) => b.sales - a.sales)

  // Horarios
  const hourData = Array.from({ length: 24 }, (_, i) => {
    const match = ordersByHour.find((h) => Number(h.hour) === i)
    return { hour: i, orders: match ? Number(match.count) : 0 }
  }).filter((h) => h.orders > 0)

  // Ventas por día
  const dailyData = ordersByDay.map((d) => ({
    date: d.day,
    sales: Number(d.sales),
    orders: Number(d.orders),
    tables: Number(d.accounts),
  }))

  return {
    summary: {
      totalSales: Number(totalSales._sum.price || 0),
      totalOrders,
      rejectedOrders,
      accountsOpened,
      accountsClosed,
      avgConsumption,
    },
    dailyData,
    meseroData,
    productData,
    categoryData,
    hourData,
    dateRange: { from: fromStr, to: toStr },
  }
}

// ========== EVENT ACTIONS ==========

function assertOnlinePublishChannels(
  paypalPrice: number | null | undefined,
  publishOnLcb: boolean,
  publishOnCbtickets: boolean
) {
  const online = paypalPrice != null && Number(paypalPrice) > 0
  if (online && !publishOnLcb && !publishOnCbtickets) {
    throw new Error('Activa al menos un canal de publicación (Casa Blanca o CBTickets) para venta en línea.')
  }
}

export async function createEvent(data: {
  name: string
  date: string
  coverPrice: number
  description?: string
  coverImage?: string
  paypalPrice?: number | null
  maxEntries?: number | null
  publishOnLcb?: boolean
  publishOnCbtickets?: boolean
  venueName?: string | null
  venueAddress?: string | null
}) {
  const user = await getCurrentUser()
  ensureEntradasAdminOnly(user.role)

  const maxEntries = normalizeMaxEntriesInput(data.maxEntries)
  const publishOnLcb = data.publishOnLcb !== false
  const publishOnCbtickets = data.publishOnCbtickets === true
  assertOnlinePublishChannels(data.paypalPrice ?? null, publishOnLcb, publishOnCbtickets)

  const event = await prisma.event.create({
    data: {
      name: data.name,
      date: new Date(data.date + 'T12:00:00'),
      coverPrice: data.coverPrice,
      description: data.description || null,
      coverImage: data.coverImage || null,
      paypalPrice: data.paypalPrice || null,
      publishOnLcb,
      publishOnCbtickets,
      venueName: data.venueName?.trim() || null,
      venueAddress: data.venueAddress?.trim() || null,
      ...(maxEntries !== undefined ? { maxEntries } : {}),
      createdByUserId: user.id,
    },
  })

  await createLog('EVENT_CREATED', user.id, undefined, {
    eventId: event.id,
    name: data.name,
    date: data.date,
    coverPrice: data.coverPrice,
  })

  revalidatePath('/admin/entradas')
  revalidatePath('/eventos')
  revalidatePath('/cbtickets')
  return event
}

export async function getEvents(onlyActive = false) {
  const where = onlyActive ? { isActive: true } : {}
  return prisma.event.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { entries: true } },
      createdBy: { select: { name: true, username: true } },
    },
  })
}

export async function updateEvent(
  id: string,
  data: {
    name?: string
    date?: string
    coverPrice?: number
    isActive?: boolean
    description?: string
    coverImage?: string
    paypalPrice?: number | null
    maxEntries?: number | null
    publishOnLcb?: boolean
    publishOnCbtickets?: boolean
    venueName?: string | null
    venueAddress?: string | null
  }
) {
  const user = await getCurrentUser()
  ensureEntradasAdminOnly(user.role)

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.date !== undefined) updateData.date = new Date(data.date + 'T12:00:00')
  if (data.coverPrice !== undefined) updateData.coverPrice = data.coverPrice
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage || null
  if (data.paypalPrice !== undefined) updateData.paypalPrice = data.paypalPrice || null
  if (data.publishOnLcb !== undefined) updateData.publishOnLcb = data.publishOnLcb
  if (data.publishOnCbtickets !== undefined) updateData.publishOnCbtickets = data.publishOnCbtickets
  if (data.venueName !== undefined) updateData.venueName = data.venueName?.trim() || null
  if (data.venueAddress !== undefined) updateData.venueAddress = data.venueAddress?.trim() || null
  if (data.maxEntries !== undefined) {
    const next = normalizeMaxEntriesInput(data.maxEntries)
    updateData.maxEntries = next
    if (next != null && next >= 1) {
      const sold = await getEventSoldEntriesCount(id)
      if (next < sold) {
        throw new Error(`El límite no puede ser menor a las entradas ya vendidas (${sold}).`)
      }
    }
  }

  if (
    data.publishOnLcb !== undefined ||
    data.publishOnCbtickets !== undefined ||
    data.paypalPrice !== undefined
  ) {
    const current = await prisma.event.findUnique({
      where: { id },
      select: {
        paypalPrice: true,
        publishOnLcb: true,
        publishOnCbtickets: true,
      },
    })
    if (current) {
      const nextPaypal =
        data.paypalPrice !== undefined ? data.paypalPrice : current.paypalPrice != null ? Number(current.paypalPrice) : null
      const nextLcb = data.publishOnLcb !== undefined ? data.publishOnLcb : current.publishOnLcb
      const nextCb = data.publishOnCbtickets !== undefined ? data.publishOnCbtickets : current.publishOnCbtickets
      assertOnlinePublishChannels(nextPaypal, nextLcb, nextCb)
    }
  }

  const event = await prisma.event.update({
    where: { id },
    data: updateData,
  })

  await createLog('EVENT_UPDATED', user.id, undefined, {
    eventId: event.id,
    changes: data,
  })

  revalidatePath('/admin/entradas')
  revalidatePath('/eventos')
  revalidatePath('/cbtickets')
  return event
}

export async function deleteEvent(id: string) {
  const user = await getCurrentUser()
  ensureEntradasAdminOnly(user.role)

  // Check if the event has entries
  const entryCount = await prisma.entry.count({ where: { eventId: id } })
  if (entryCount > 0) {
    throw new Error('No se puede eliminar un evento que ya tiene entradas vendidas')
  }

  await prisma.event.delete({ where: { id } })

  await createLog('EVENT_UPDATED', user.id, undefined, {
    eventId: id,
    action: 'deleted',
  })

  revalidatePath('/admin/entradas')
  revalidatePath('/eventos')
  revalidatePath('/cbtickets')
}

// ========== ENTRY ACTIONS ==========

type PrismaDbClient = typeof prisma | Prisma.TransactionClient

export async function getEventSoldEntriesCount(eventId: string, db: PrismaDbClient = prisma): Promise<number> {
  const agg = await db.entry.aggregate({
    where: { eventId, status: { not: 'CANCELLED' } },
    _sum: { numberOfEntries: true },
  })
  return Number(agg._sum.numberOfEntries ?? 0)
}

/** null/<1 en maxEntries = sin límite. */
export async function assertEventEntryCapacity(
  event: { id: string; maxEntries: number | null },
  additionalEntries: number,
  db: PrismaDbClient = prisma
): Promise<void> {
  if (event.maxEntries == null || event.maxEntries < 1) return
  const sold = await getEventSoldEntriesCount(event.id, db)
  const remaining = event.maxEntries - sold
  if (additionalEntries > remaining) {
    throw new Error(
      remaining <= 0
        ? 'Cupo de entradas agotado para este evento.'
        : `Solo quedan ${remaining} entrada(s) disponible(s) para este evento.`
    )
  }
}

function normalizeMaxEntriesInput(value: number | null | undefined): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (!Number.isFinite(value) || value < 1) return null
  return Math.floor(value)
}

function generateQRToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 24; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export async function createEntry(data: {
  eventId: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  numberOfEntries: number
}) {
  const user = await getCurrentUser()
  ensureEntradasModuleAccess(user.role)
  await assertEntradasEventAccess(user.id, user.role, data.eventId)

  // Get event to calculate price
  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
  })

  if (!event) throw new Error('Evento no encontrado')
  if (!event.isActive) throw new Error('Este evento no está activo')

  const totalPrice = Number(event.coverPrice) * data.numberOfEntries

  const entry = await prisma.$transaction(
    async (tx) => {
      await assertEventEntryCapacity(event, data.numberOfEntries, tx)
      let qrToken = generateQRToken()
      let attempts = 0
      while (attempts < 10) {
        const existing = await tx.entry.findUnique({
          where: { qrToken },
          select: { id: true },
        })
        if (!existing) break
        qrToken = generateQRToken()
        attempts++
      }
      return tx.entry.create({
        data: {
          eventId: data.eventId,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone?.trim() || null,
          numberOfEntries: data.numberOfEntries,
          totalPrice,
          qrToken,
          createdByUserId: user.id,
        },
        include: {
          event: true,
        },
      })
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    }
  )

  await createLog('ENTRY_SOLD', user.id, undefined, {
    entryId: entry.id,
    eventId: data.eventId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    numberOfEntries: data.numberOfEntries,
    totalPrice,
  })

  revalidatePath('/admin/entradas')
  return entry
}

export async function createBulkEntries(data: {
  eventId: string
  clientEmail: string
  clientPhone?: string
  guestNames: string[]
}) {
  const user = await getCurrentUser()
  ensureEntradasModuleAccess(user.role)
  await assertEntradasEventAccess(user.id, user.role, data.eventId)

  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
  })

  if (!event) throw new Error('Evento no encontrado')
  if (!event.isActive) throw new Error('Este evento no está activo')

  const pricePerEntry = Number(event.coverPrice)
  const qty = data.guestNames.length

  const entries = await prisma.$transaction(
    async (tx) => {
      await assertEventEntryCapacity(event, qty, tx)
      const created = []
      for (const guestName of data.guestNames) {
        let qrToken = generateQRToken()
        let attempts = 0
        while (attempts < 10) {
          const existing = await tx.entry.findUnique({
            where: { qrToken },
            select: { id: true },
          })
          if (!existing) break
          qrToken = generateQRToken()
          attempts++
        }

        const entry = await tx.entry.create({
          data: {
            eventId: data.eventId,
            clientName: guestName.trim(),
            clientEmail: data.clientEmail.trim(),
            clientPhone: data.clientPhone?.trim() || null,
            numberOfEntries: 1,
            totalPrice: pricePerEntry,
            qrToken,
            createdByUserId: user.id,
          },
          include: {
            event: true,
          },
        })
        created.push(entry)
      }
      return created
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    }
  )

  await createLog('ENTRY_SOLD', user.id, undefined, {
    eventId: data.eventId,
    clientEmail: data.clientEmail,
    guestNames: data.guestNames,
    numberOfEntries: data.guestNames.length,
    totalPrice: pricePerEntry * data.guestNames.length,
    entryIds: entries.map((e) => e.id),
  })

  revalidatePath('/admin/entradas')
  return entries
}

export async function getEntries(filters?: {
  eventId?: string
  status?: 'ACTIVE' | 'USED' | 'CANCELLED'
  search?: string
}) {
  const user = await getCurrentUser()
  ensureEntradasModuleAccess(user.role)
  const scope = await getEntradasEventIdScopeForUser(user.id, user.role)

  const where: any = {}
  if (scope !== null) {
    if (!scope.length) {
      return []
    }
    if (filters?.eventId) {
      if (!scope.includes(filters.eventId)) {
        throw new Error('No tienes acceso a este evento')
      }
      where.eventId = filters.eventId
    } else {
      where.eventId = { in: scope }
    }
  } else if (filters?.eventId) {
    where.eventId = filters.eventId
  }
  if (filters?.status) where.status = filters.status
  if (filters?.search) {
    where.OR = [
      { clientName: { contains: filters.search, mode: 'insensitive' } },
      { clientEmail: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  return prisma.entry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { name: true, date: true, coverPrice: true, venueName: true, venueAddress: true } },
      createdBy: { select: { name: true, username: true } },
    },
    take: 200,
  })
}

export async function getEntradasDashboardData() {
  const user = await getCurrentUser()
  ensureEntradasModuleAccess(user.role)
  const eventScope = await getEntradasEventIdScopeForUser(user.id, user.role)
  if (eventScope !== null && eventScope.length === 0) {
    const empty = {
      events: [] as any[],
      eventStats: [] as any[],
      recentEntries: [] as any[],
      todayStats: { totalSales: 0, totalEntries: 0, totalTransactions: 0 },
    }
    return JSON.parse(JSON.stringify(empty)) as typeof empty
  }
  const eventWhere = eventScope === null ? {} : { id: { in: eventScope } }
  const entryEventFilter = eventScope === null ? {} : { eventId: { in: eventScope } }

  const [events, recentEntries, todayStats, soldByEvent] = await Promise.all([
    prisma.event.findMany({
      where: eventWhere,
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { entries: true } },
        createdBy: { select: { name: true, username: true } },
      },
    }),
    prisma.entry.findMany({
      where: entryEventFilter,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        event: { select: { name: true, date: true, coverPrice: true, venueName: true, venueAddress: true } },
        createdBy: { select: { name: true, username: true } },
      },
    }),
    // Today stats
    prisma.entry.aggregate({
      where: {
        ...entryEventFilter,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { totalPrice: true, numberOfEntries: true },
      _count: true,
    }),
    prisma.entry.groupBy({
      by: ['eventId'],
      where: { status: { not: 'CANCELLED' }, ...entryEventFilter },
      _sum: { numberOfEntries: true, totalPrice: true },
    }),
  ])

  const soldMap = new Map<string, number>()
  const revenueByEventMap = new Map<string, number>()
  for (const r of soldByEvent) {
    soldMap.set(r.eventId, Number(r._sum.numberOfEntries ?? 0))
    revenueByEventMap.set(r.eventId, Number(r._sum.totalPrice ?? 0))
  }

  const payload = {
    events: events.map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      description: e.description,
      coverImage: e.coverImage,
      coverPrice: Number(e.coverPrice),
      paypalPrice: e.paypalPrice != null ? Number(e.paypalPrice) : null,
      maxEntries: e.maxEntries,
      isActive: e.isActive,
      publishOnLcb: e.publishOnLcb,
      publishOnCbtickets: e.publishOnCbtickets,
      venueName: e.venueName,
      venueAddress: e.venueAddress,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      createdByUserId: e.createdByUserId,
      _count: e._count,
      createdBy: e.createdBy,
      entriesSoldSum: soldMap.get(e.id) ?? 0,
    })),
    eventStats: events.map((e: any) => ({
      eventId: e.id,
      name: e.name,
      date: e.date,
      venueName: e.venueName ?? null,
      entriesSold: soldMap.get(e.id) ?? 0,
      revenueLps: revenueByEventMap.get(e.id) ?? 0,
    })),
    recentEntries: recentEntries.map((e: any) => ({
      id: e.id,
      eventId: e.eventId,
      clientName: e.clientName,
      clientEmail: e.clientEmail,
      clientPhone: e.clientPhone,
      numberOfEntries: e.numberOfEntries,
      totalPrice: Number(e.totalPrice),
      qrToken: e.qrToken,
      status: e.status,
      emailSent: e.emailSent,
      whatsappSent: e.whatsappSent,
      createdAt: e.createdAt,
      createdByUserId: e.createdByUserId,
      event: {
        name: e.event.name,
        date: e.event.date,
        coverPrice: Number(e.event.coverPrice),
        venueName: e.event.venueName ?? null,
        venueAddress: e.event.venueAddress ?? null,
      },
      createdBy: e.createdBy,
    })),
    todayStats: {
      totalSales: Number(todayStats._sum.totalPrice ?? 0),
      totalEntries: Number(todayStats._sum.numberOfEntries ?? 0),
      totalTransactions: todayStats._count,
    },
  }

  return JSON.parse(JSON.stringify(payload)) as typeof payload
}

const TAQUILLA_HISTORY_ROLES = ['ADMIN', 'TAQUILLA', 'MESERO', 'CAJERO'] as const

export type TaquillaHistoryEntry = {
  id: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  totalPrice: number
  qrToken: string
  status: 'ACTIVE' | 'USED' | 'CANCELLED'
  createdAt: Date
  emailSent: boolean
}

/** Historial de entradas por evento (taquilla): lectura + reenvío de correo en UI */
export async function getTaquillaEventEntries(input: {
  eventId: string
  status?: 'all' | 'ACTIVE' | 'USED' | 'CANCELLED'
  search?: string
}): Promise<TaquillaHistoryEntry[]> {
  const user = await getCurrentUser()
  if (!TAQUILLA_HISTORY_ROLES.includes(user.role as (typeof TAQUILLA_HISTORY_ROLES)[number])) {
    throw new Error('No autorizado')
  }

  const where: Record<string, unknown> = { eventId: input.eventId }
  if (input.status && input.status !== 'all') {
    where.status = input.status
  }
  const q = input.search?.trim()
  if (q) {
    where.AND = [
      {
        OR: [
          { clientName: { contains: q, mode: 'insensitive' } },
          { clientEmail: { contains: q, mode: 'insensitive' } },
        ],
      },
    ]
  }

  const rows = await prisma.entry.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: 400,
    select: {
      id: true,
      clientName: true,
      clientEmail: true,
      numberOfEntries: true,
      totalPrice: true,
      qrToken: true,
      status: true,
      createdAt: true,
      emailSent: true,
    },
  })

  return rows.map((r) => ({
    ...r,
    totalPrice: Number(r.totalPrice),
  }))
}

export async function markEntryUsed(entryId: string) {
  const user = await getCurrentUser()
  ensureEntryScanAccess(user.role)

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
  })

  if (!entry) throw new Error('Entrada no encontrada')
  if (entry.status === 'USED') throw new Error('Esta entrada ya fue utilizada')
  if (entry.status === 'CANCELLED') throw new Error('Esta entrada fue cancelada')

  await prisma.entry.update({
    where: { id: entryId },
    data: { status: 'USED' },
  })

  await createLog('ENTRY_USED', user.id, undefined, {
    entryId,
    clientName: entry.clientName,
  })

  revalidatePath('/admin/entradas')
  revalidatePath('/taquilla')
}

export async function revertEntryToActive(entryId: string) {
  const user = await getCurrentUser()
  ensureEntradasModuleAccess(user.role)
  if (!isEntradasPlatformAdmin(user.role)) {
    await assertEntryInEntradasScope(user.id, user.role, entryId)
  }

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
  })

  if (!entry) throw new Error('Entrada no encontrada')
  if (entry.status !== 'USED') throw new Error('Solo se pueden revertir entradas marcadas como usadas')

  await prisma.entry.update({
    where: { id: entryId },
    data: { status: 'ACTIVE' },
  })

  await createLog('ENTRY_USED', user.id, undefined, {
    entryId,
    clientName: entry.clientName,
    action: 'reverted_to_active',
  })

  revalidatePath('/admin/entradas')
}

export type CancelEntryResult = { ok: true } | { ok: false; message: string }

/** Fallo de reembolso CyberSource persistido en `logs` (Admin → Logs); no depende de Vercel Runtime Logs. */
async function persistRefundFailureAuditLog(params: {
  userId: string | undefined
  entryId: string
  saleLogId: string
  paymentReference: string
  captureId: string
  refundAmount: string
  error: unknown
}) {
  try {
    const details: Record<string, unknown> = {
      type: 'CYBERSOURCE_REFUND_FAILED',
      entryId: params.entryId,
      saleLogId: params.saleLogId,
      paymentReference: params.paymentReference,
      refundAmount: params.refundAmount,
      at: new Date().toISOString(),
      cybersourceEnv: getCyberSourceEnvLabel(),
      cybersourceApiHost: getCyberSourceApiHostForLogs(),
    }
    if (params.captureId) {
      details.captureIdPrefix = `${params.captureId.slice(0, 8)}…`
    }
    const err = params.error
    if (err instanceof CyberSourceApiError) {
      details.httpStatus = err.status
      details.endpoint = err.endpoint
      details.requestId = err.requestId
      details.cybersourceMessage = err.message
      details.responseBody =
        typeof err.responseBody === 'string'
          ? err.responseBody.slice(0, 2000)
          : JSON.stringify(err.responseBody ?? {}).slice(0, 2000)
      if (err.status === 404) {
        details.refund404Hint =
          'Si cybersourceApiHost es apitest.cybersource.com, CYBERSOURCE_ENV no está en live/production. Si es api.cybersource.com y sigue 404: mismo merchant que la venta, o reembolso no permitido para ese adquirente (soporte CyberSource).'
      }
    } else if (err instanceof Error) {
      details.errorMessage = err.message
      details.errorName = err.name
    } else {
      details.errorMessage = String(err)
    }
    await createLog('EVENT_UPDATED', params.userId, undefined, details)
    revalidatePath('/admin/logs')
  } catch {
    // sin bloquear cancelEntry
  }
}

/** Devuelve resultado en lugar de lanzar: en producción las server actions que lanzan suelen mostrar digest genérico. */
export async function cancelEntry(entryId: string): Promise<CancelEntryResult> {
  try {
    const user = await getCurrentUser()
    ensureEntradasModuleAccess(user.role)

    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
    })

    if (!entry) return { ok: false, message: 'Entrada no encontrada' }
    if (!isEntradasPlatformAdmin(user.role)) {
      try {
        await assertEntradasEventAccess(user.id, user.role, entry.eventId)
      } catch {
        return { ok: false, message: 'No tienes acceso a esta entrada' }
      }
    }
    if (entry.status === 'USED') return { ok: false, message: 'No se puede cancelar una entrada ya utilizada' }
    if (entry.status === 'CANCELLED') return { ok: false, message: 'Esta entrada ya fue cancelada' }

    const saleLog = await findOnlineSaleLogForEntry(entryId)

    if (!saleLog) {
      await prisma.entry.update({
        where: { id: entryId },
        data: { status: 'CANCELLED' },
      })
      revalidatePath('/admin/entradas')
      return { ok: true }
    }

    const details =
      saleLog.details && typeof saleLog.details === 'object'
        ? (saleLog.details as Record<string, unknown>)
        : {}
    const entryIds = details.entryIds as string[] | undefined
    if (!entryIds?.length) {
      return {
        ok: false,
        message:
          'Esta venta online no tiene datos de reembolso automático (ventas anteriores). Reembolsa manualmente en CyberSource o contacta soporte.',
      }
    }

    const priorRefunds = Array.isArray(details.cybersourceRefundEvents)
      ? (details.cybersourceRefundEvents as Array<{ entryId: string }>)
      : []
    if (priorRefunds.some((r) => r.entryId === entryId)) {
      return { ok: false, message: 'Esta entrada ya tiene un reembolso registrado.' }
    }

    const idx = entryIds.indexOf(entryId)
    if (idx < 0) {
      return { ok: false, message: 'Inconsistencia entre la entrada y el registro de venta. Contacta soporte.' }
    }

    const isMock =
      process.env.CYBERSOURCE_MOCK === 'true' ||
      String(details.cybersourceTransactionId || '').startsWith('mock_')

    const captureId = String(details.cybersourceCaptureId || '').trim()
    if (!isMock && !captureId) {
      return {
        ok: false,
        message:
          'No hay ID de captura de CyberSource para esta venta. No se puede reembolsar de forma automática.',
      }
    }

    const totalPrice = Number(details.totalPrice ?? 0)
    const refundAmountStr = perEntryRefundAmount(totalPrice, idx, entryIds.length)
    const currency = String(details.currency || 'HNL')
    const paymentReference = String(details.paymentReference || 'ref')

    let refundResponse: { id?: string; status?: string }

    try {
      if (isMock) {
        refundResponse = { id: `mock_refund_${entryId}`, status: 'PENDING' }
      } else {
        refundResponse = await refundCyberSourceCaptureForEntry({
          captureId,
          currency,
          refundAmount: refundAmountStr,
          paymentReference,
          entryId,
          paymentTransactionId: String(details.cybersourceTransactionId || '').trim() || null,
        })
      }
    } catch (e) {
      if (e instanceof CyberSourceApiError) {
        const reason =
          typeof e.responseBody === 'string'
            ? e.responseBody
            : (e.responseBody as any)?.errorInformation?.reason ||
              (e.responseBody as any)?.message ||
              e.message
        await persistRefundFailureAuditLog({
          userId: user.id,
          entryId,
          saleLogId: saleLog.id,
          paymentReference,
          captureId,
          refundAmount: refundAmountStr,
          error: e,
        })
        return {
          ok: false,
          message: `CyberSource no pudo procesar el reembolso (${e.status}): ${reason}`,
        }
      }
      await persistRefundFailureAuditLog({
        userId: user.id,
        entryId,
        saleLogId: saleLog.id,
        paymentReference,
        captureId,
        refundAmount: refundAmountStr,
        error: e,
      })
      throw e
    }

    const refundId = String(refundResponse?.id || '')
    const newEvent = {
      entryId,
      refundId,
      amount: refundAmountStr,
      at: new Date().toISOString(),
      status: String(refundResponse?.status || 'OK'),
    }

    const nextRefundEvents = [...priorRefunds, newEvent]

    const mergedDetails = JSON.parse(
      JSON.stringify({
        ...details,
        cybersourceRefundEvents: nextRefundEvents,
      })
    ) as Prisma.InputJsonValue

    await prisma.$transaction([
      prisma.log.update({
        where: { id: saleLog.id },
        data: { details: mergedDetails },
      }),
      prisma.entry.update({
        where: { id: entryId },
        data: { status: 'CANCELLED' },
      }),
    ])

    try {
      await createLog('PAYMENT_REFUNDED', user.id, undefined, {
        entryId,
        saleLogId: saleLog.id,
        paymentReference,
        refundAmount: refundAmountStr,
        refundId,
      })
    } catch (auditErr) {
      console.error('[cancelEntry] Audit log PAYMENT_REFUNDED failed (¿migración enum en BD?)', auditErr)
      try {
        await createLog('EVENT_UPDATED', user.id, undefined, {
          type: 'PAYMENT_REFUNDED',
          entryId,
          saleLogId: saleLog.id,
          paymentReference,
          refundAmount: refundAmountStr,
          refundId,
        })
      } catch (fallbackErr) {
        console.error('[cancelEntry] Fallback audit log failed', fallbackErr)
      }
    }

    revalidatePath('/admin/entradas')
    return { ok: true }
  } catch (e: unknown) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === 'string'
          ? e
          : 'No se pudo cancelar la entrada. Intenta de nuevo.'
    console.error('[cancelEntry] failed', e)
    return { ok: false, message }
  }
}

export async function validateEntryByToken(token: string) {
  const entry = await prisma.entry.findUnique({
    where: { qrToken: token },
    include: {
      event: {
        select: {
          name: true,
          date: true,
          description: true,
          coverPrice: true,
          coverImage: true,
          venueName: true,
          venueAddress: true,
        },
      },
    },
  })

  if (!entry) return null

  return {
    id: entry.id,
    clientName: entry.clientName,
    clientEmail: entry.clientEmail,
    clientPhone: entry.clientPhone,
    numberOfEntries: entry.numberOfEntries,
    totalPrice: Number(entry.totalPrice),
    status: entry.status,
    createdAt: entry.createdAt,
    event: {
      id: entry.eventId,
      name: entry.event.name,
      date: entry.event.date,
      description: entry.event.description,
      coverPrice: Number(entry.event.coverPrice),
      coverImage: entry.event.coverImage,
      venueName: entry.event.venueName,
      venueAddress: entry.event.venueAddress,
    },
  }
}

export async function markEntryEmailSent(entryId: string) {
  const user = await getCurrentUser()
  ensureEntradasModuleAccess(user.role)
  if (!isEntradasPlatformAdmin(user.role)) {
    await assertEntryInEntradasScope(user.id, user.role, entryId)
  }
  await prisma.entry.update({
    where: { id: entryId },
    data: { emailSent: true },
  })
}

export async function markEntryWhatsappSent(entryId: string) {
  const user = await getCurrentUser()
  ensureEntradasModuleAccess(user.role)
  if (!isEntradasPlatformAdmin(user.role)) {
    await assertEntryInEntradasScope(user.id, user.role, entryId)
  }
  await prisma.entry.update({
    where: { id: entryId },
    data: { whatsappSent: true },
  })
}

// ========== PUBLIC EVENT ACTIONS ==========
// Consultas públicas de eventos: ver `@/lib/public-events` (no van en este archivo `'use server'`).

export async function createPublicEntry(data: {
  eventId: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  numberOfEntries: number
  paymentReference: string
}) {
  const event = await prisma.event.findUnique({ where: { id: data.eventId } })
  if (!event) throw new Error('Evento no encontrado')
  if (!event.isActive) throw new Error('Este evento no está activo')
  if (!event.paypalPrice) throw new Error('Este evento no acepta pagos en línea')

  const totalPrice = Number(event.paypalPrice) * data.numberOfEntries

  const entries = await prisma.$transaction(
    async (tx) => {
      await assertEventEntryCapacity(event, data.numberOfEntries, tx)
      const created = []
      for (let i = 0; i < data.numberOfEntries; i++) {
        let qrToken = generateQRToken()
        let attempts = 0
        while (attempts < 10) {
          const existing = await tx.entry.findUnique({ where: { qrToken }, select: { id: true } })
          if (!existing) break
          qrToken = generateQRToken()
          attempts++
        }

        const entry = await tx.entry.create({
          data: {
            eventId: data.eventId,
            clientName: data.clientName.trim(),
            clientEmail: data.clientEmail.trim(),
            clientPhone: data.clientPhone?.trim() || null,
            numberOfEntries: 1,
            totalPrice: Number(event.coverPrice),
            qrToken,
          },
          include: { event: true },
        })
        created.push(entry)
      }
      return created
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    }
  )

  await prisma.log.create({
    data: {
      action: 'ENTRY_SOLD',
      details: {
        eventId: data.eventId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        numberOfEntries: data.numberOfEntries,
        totalPrice,
        paymentReference: data.paymentReference,
        source: 'online_cybersource',
      },
    },
  })

  revalidatePath('/admin/entradas')
  return entries
}

