import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('accountId')
    const lastOrderId = searchParams.get('lastOrderId') // Último ID de pedido conocido
    const lastOrderCount = searchParams.get('lastOrderCount') // Último conteo de pedidos

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId es requerido' },
        { status: 400 }
      )
    }

    // Obtener información actualizada de la cuenta
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        orders: {
          where: { rejected: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      )
    }

    const currentOrderCount = account.orders.length
    const latestOrderId = account.orders[0]?.id || null

    // Verificar si hay cambios
    const hasNewOrders =
      lastOrderId !== latestOrderId ||
      (lastOrderCount !== null &&
        parseInt(lastOrderCount) !== currentOrderCount)

    return NextResponse.json({
      hasNewOrders,
      orderCount: currentOrderCount,
      latestOrderId,
      currentBalance: Number(account.currentBalance),
    })
  } catch (error: any) {
    console.error('[check-new-orders] Error:', error)
    return NextResponse.json(
      { error: 'Error al verificar pedidos', details: error.message },
      { status: 500 }
    )
  }
}
