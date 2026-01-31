import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AccountsList } from '@/components/AccountsList'
import { closeOldAccounts } from '@/lib/actions'

export default async function CuentasPage() {
  const session = await getServerSession(authOptions)
  const userRole = session?.user?.role as string | undefined
  // Cerrar cuentas antiguas en background (no bloquea la carga)
  closeOldAccounts().catch((err) => {
    console.error('[CuentasPage] Error al cerrar cuentas antiguas:', err)
  })

  try {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        initialBalance: true,
        currentBalance: true,
        status: true,
        createdAt: true,
        closedAt: true,
        clientName: true,
        table: { select: { id: true, name: true, zone: true, shortCode: true } },
        openedBy: { select: { name: true, username: true } },
        orders: {
          select: {
            id: true,
            quantity: true,
            price: true,
            createdAt: true,
            rejected: true,
            product: { select: { name: true, price: true } },
            user: { select: { username: true } },
          },
      orderBy: { createdAt: 'desc' },
      take: 100,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return <AccountsList initialAccounts={accounts} userRole={userRole} />
  } catch (error: any) {
    console.error('Error loading accounts:', error)
    return (
      <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg">
            <p className="font-semibold mb-2">Error al cargar cuentas</p>
            <p className="text-sm">
              {error.message || 'Ocurrió un error al cargar las cuentas. Verifica que la base de datos esté actualizada.'}
            </p>
            <p className="text-xs mt-2">
              Si acabas de agregar el campo "rejected" a Order, ejecuta: npm run db:push
            </p>
          </div>
    )
  }
}

