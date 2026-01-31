import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AccountsList } from '@/components/AccountsList'
import { closeOldAccounts } from '@/lib/actions'

export default async function CuentasPage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch (error: any) {
    console.error('[CuentasPage] Error getting session:', error?.message)
    redirect('/login')
    return
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MESERO')) {
    redirect('/login')
    return
  }

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

    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <AccountsList initialAccounts={accounts} />
        </main>
        <Footer />
      </div>
    )
  } catch (error: any) {
    console.error('Error loading accounts:', error)
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg">
            <p className="font-semibold mb-2">Error al cargar cuentas</p>
            <p className="text-sm">
              {error.message || 'Ocurrió un error al cargar las cuentas. Verifica que la base de datos esté actualizada.'}
            </p>
            <p className="text-xs mt-2">
              Si acabas de agregar el campo "rejected" a Order, ejecuta: npm run db:push
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }
}

