'use server'

import { prisma } from './prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { LogAction } from '@prisma/client'
import { Prisma } from '@prisma/client'

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

// Auth helper
async function getCurrentUser() {
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

function ensureCashierAccess(role: string) {
  if (!['ADMIN', 'CAJERO'].includes(role)) {
    throw new Error('Solo cajeros o administradores pueden acceder a esta sección')
  }
}

// ========== USER ACTIONS ==========

export async function createUser(data: {
  username: string
  password: string
  role: 'ADMIN' | 'MESERO' | 'CAJERO'
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
    role?: 'ADMIN' | 'MESERO' | 'CAJERO'
    name?: string | null
  }
) {
  const currentUser = await getCurrentUser()
  if (currentUser.role !== 'ADMIN') {
    throw new Error('Solo administradores pueden editar usuarios')
  }

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
            product: { select: { name: true } },
            user: { select: { username: true, name: true } },
          },
          take: 15,
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

  return { accounts, pendingOrders, recentServed, activeMeseros }
}

export async function setOrderServed(orderId: string, served: boolean) {
  const currentUser = await getCurrentUser()
  ensureCashierAccess(currentUser.role)

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { served },
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
    await prisma.order.updateMany({
      where: {
        id: { in: pendingOrders.map((o) => o.id) },
        accountId: accountId,
        served: false,
        rejected: false,
      },
      data: {
        served: true,
      },
    })

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
        await prisma.order.updateMany({
          where: {
            id: { in: pendingOrderIds },
            accountId: account.id,
            served: false,
            rejected: false,
          },
          data: {
            served: true,
          },
        })
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

      results.closed++
      results.accountIds.push(account.id)
    } catch (error: any) {
      console.error(`Error al cerrar cuenta ${account.id}:`, error)
      results.errors++
    }
  }

  return results
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
      openedBy: { select: { id: true, name: true, username: true } },
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
    throw new Error('Saldo insuficiente')
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Lock account row
    const lockedAccount = await tx.account.findUnique({
      where: { id: data.accountId },
    })

    if (!lockedAccount || Number(lockedAccount.currentBalance) < totalPrice) {
      throw new Error('Saldo insuficiente')
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

  // Notificar a cajeros con push activo
  {
    const meseroName = account.openedBy?.name || account.openedBy?.username || 'Desconocido'
    const { sendPushToCajeros } = await import('@/lib/push')
    sendPushToCajeros(account.table.name, product.name, quantity, meseroName)
      .catch((e) => console.error('[Push Cajero] Error:', e))
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
  // Obtener usuario cliente
  const customerUser = await getOrCreateCustomerUser()

  // Get account with lock to prevent race conditions
  const account = await prisma.account.findUnique({
    where: { id: data.accountId },
    include: {
      table: true,
      orders: true,
      openedBy: { select: { id: true, name: true, username: true } },
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
    throw new Error('Saldo insuficiente')
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Lock account row
    const lockedAccount = await tx.account.findUnique({
      where: { id: data.accountId },
    })

    if (!lockedAccount || Number(lockedAccount.currentBalance) < totalPrice) {
      throw new Error('Saldo insuficiente')
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

  // Notificar a cajeros con push activo
  {
    const meseroName = account.openedBy?.name || account.openedBy?.username || 'Desconocido'
    const { sendPushToCajeros } = await import('@/lib/push')
    sendPushToCajeros(account.table.name, product.name, quantity, meseroName)
      .catch((e) => console.error('[Push Cajero] Error:', e))
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
    },
    orderBy: { createdAt: 'desc' },
  })
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

export async function createEvent(data: {
  name: string
  date: string
  coverPrice: number
}) {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

  const event = await prisma.event.create({
    data: {
      name: data.name,
      date: new Date(data.date + 'T12:00:00'),
      coverPrice: data.coverPrice,
      createdByUserId: user.id,
    },
  })

  await createLog('EVENT_CREATED', user.id, undefined, {
    eventId: event.id,
    name: data.name,
    date: data.date,
    coverPrice: data.coverPrice,
  })

  revalidatePath('/cajero/entradas')
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
  data: { name?: string; date?: string; coverPrice?: number; isActive?: boolean }
) {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.date !== undefined) updateData.date = new Date(data.date + 'T12:00:00')
  if (data.coverPrice !== undefined) updateData.coverPrice = data.coverPrice
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  const event = await prisma.event.update({
    where: { id },
    data: updateData,
  })

  await createLog('EVENT_UPDATED', user.id, undefined, {
    eventId: event.id,
    changes: data,
  })

  revalidatePath('/cajero/entradas')
  return event
}

export async function deleteEvent(id: string) {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

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

  revalidatePath('/cajero/entradas')
}

// ========== ENTRY ACTIONS ==========

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
  numberOfEntries: number
}) {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

  // Get event to calculate price
  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
  })

  if (!event) throw new Error('Evento no encontrado')
  if (!event.isActive) throw new Error('Este evento no está activo')

  const totalPrice = Number(event.coverPrice) * data.numberOfEntries

  // Generate unique QR token
  let qrToken = generateQRToken()
  let attempts = 0
  while (attempts < 10) {
    const existing = await prisma.entry.findUnique({
      where: { qrToken },
      select: { id: true },
    })
    if (!existing) break
    qrToken = generateQRToken()
    attempts++
  }

  const entry = await prisma.entry.create({
    data: {
      eventId: data.eventId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      numberOfEntries: data.numberOfEntries,
      totalPrice,
      qrToken,
      createdByUserId: user.id,
    },
    include: {
      event: true,
    },
  })

  await createLog('ENTRY_SOLD', user.id, undefined, {
    entryId: entry.id,
    eventId: data.eventId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    numberOfEntries: data.numberOfEntries,
    totalPrice,
  })

  revalidatePath('/cajero/entradas')
  return entry
}

export async function createBulkEntries(data: {
  eventId: string
  clientEmail: string
  guestNames: string[]
}) {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
  })

  if (!event) throw new Error('Evento no encontrado')
  if (!event.isActive) throw new Error('Este evento no está activo')

  const pricePerEntry = Number(event.coverPrice)
  const entries = []

  for (const guestName of data.guestNames) {
    let qrToken = generateQRToken()
    let attempts = 0
    while (attempts < 10) {
      const existing = await prisma.entry.findUnique({
        where: { qrToken },
        select: { id: true },
      })
      if (!existing) break
      qrToken = generateQRToken()
      attempts++
    }

    const entry = await prisma.entry.create({
      data: {
        eventId: data.eventId,
        clientName: guestName.trim(),
        clientEmail: data.clientEmail.trim(),
        numberOfEntries: 1,
        totalPrice: pricePerEntry,
        qrToken,
        createdByUserId: user.id,
      },
      include: {
        event: true,
      },
    })

    entries.push(entry)
  }

  await createLog('ENTRY_SOLD', user.id, undefined, {
    eventId: data.eventId,
    clientEmail: data.clientEmail,
    guestNames: data.guestNames,
    numberOfEntries: data.guestNames.length,
    totalPrice: pricePerEntry * data.guestNames.length,
    entryIds: entries.map((e) => e.id),
  })

  revalidatePath('/cajero/entradas')
  return entries
}

export async function getEntries(filters?: {
  eventId?: string
  status?: 'ACTIVE' | 'USED' | 'CANCELLED'
  search?: string
}) {
  const where: any = {}
  if (filters?.eventId) where.eventId = filters.eventId
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
      event: { select: { name: true, date: true, coverPrice: true } },
      createdBy: { select: { name: true, username: true } },
    },
    take: 200,
  })
}

export async function getEntradasDashboardData() {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

  const [events, recentEntries, todayStats] = await Promise.all([
    prisma.event.findMany({
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { entries: true } },
        createdBy: { select: { name: true, username: true } },
      },
    }),
    prisma.entry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        event: { select: { name: true, date: true, coverPrice: true } },
        createdBy: { select: { name: true, username: true } },
      },
    }),
    // Today stats
    prisma.entry.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { totalPrice: true, numberOfEntries: true },
      _count: true,
    }),
  ])

  return {
    events: events.map((e: any) => ({
      ...e,
      coverPrice: Number(e.coverPrice),
    })),
    recentEntries: recentEntries.map((e: any) => ({
      ...e,
      totalPrice: Number(e.totalPrice),
      event: {
        ...e.event,
        coverPrice: Number(e.event.coverPrice),
      },
    })),
    todayStats: {
      totalSales: Number(todayStats._sum.totalPrice || 0),
      totalEntries: Number(todayStats._sum.numberOfEntries || 0),
      totalTransactions: todayStats._count,
    },
  }
}

export async function markEntryUsed(entryId: string) {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

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

  revalidatePath('/cajero/entradas')
}

export async function revertEntryToActive(entryId: string) {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

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

  revalidatePath('/cajero/entradas')
}

export async function cancelEntry(entryId: string) {
  const user = await getCurrentUser()
  ensureCashierAccess(user.role)

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
  })

  if (!entry) throw new Error('Entrada no encontrada')
  if (entry.status === 'USED') throw new Error('No se puede cancelar una entrada ya utilizada')

  await prisma.entry.update({
    where: { id: entryId },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/cajero/entradas')
}

export async function validateEntryByToken(token: string) {
  const entry = await prisma.entry.findUnique({
    where: { qrToken: token },
    include: {
      event: { select: { name: true, date: true, coverPrice: true } },
    },
  })

  if (!entry) return null

  return {
    id: entry.id,
    clientName: entry.clientName,
    clientEmail: entry.clientEmail,
    numberOfEntries: entry.numberOfEntries,
    totalPrice: Number(entry.totalPrice),
    status: entry.status,
    createdAt: entry.createdAt,
    event: {
      name: entry.event.name,
      date: entry.event.date,
      coverPrice: Number(entry.event.coverPrice),
    },
  }
}

export async function markEntryEmailSent(entryId: string) {
  await prisma.entry.update({
    where: { id: entryId },
    data: { emailSent: true },
  })
}

