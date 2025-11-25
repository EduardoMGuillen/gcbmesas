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
  const table = await prisma.table.create({
    data: {
      name: data.name,
      zone: data.zone,
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
  })

  revalidatePath('/admin/mesas')
  return updatedTable
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

// ========== ACCOUNT ACTIONS ==========

export async function createAccount(data: {
  tableId: string
  initialBalance: number
}) {
  const currentUser = await getCurrentUser()

  const account = await prisma.account.create({
    data: {
      tableId: data.tableId,
      initialBalance: data.initialBalance,
      currentBalance: data.initialBalance,
      status: 'OPEN',
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

  const totalConsumed =
    Number(account.initialBalance) - Number(account.currentBalance)

  const closedAccount = await prisma.account.update({
    where: { id: accountId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  })

  await createLog(LogAction.ACCOUNT_CLOSED, currentUser.id, account.tableId, {
    accountId,
    initialBalance: account.initialBalance,
    totalConsumed,
    finalBalance: account.currentBalance,
    ordersCount: account.orders.length,
  })

  revalidatePath(`/mesa/${account.tableId}`)
  revalidatePath('/admin/cuentas')
  return closedAccount
}

// ========== PRODUCT ACTIONS ==========

export async function createProduct(data: {
  name: string
  price: number
  category?: string
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

  revalidatePath(`/mesa/${account.tableId}`)
  revalidatePath('/admin/cuentas')
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

export async function getTables() {
  await getCurrentUser()
  return prisma.table.findMany({
    include: {
      accounts: {
        where: { status: 'OPEN' },
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
  ])

  // Get product details for top products
  const productIds = topProducts.map((p) => p.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
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
  }
}

