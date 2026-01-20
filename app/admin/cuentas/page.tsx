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

  // Cerrar automáticamente cuentas abiertas por más de 12 horas
  try {
    const closeResults = await closeOldAccounts()
    if (closeResults.closed > 0) {
      console.log(`[CuentasPage] Se cerraron automáticamente ${closeResults.closed} cuenta(s) antigua(s)`)
    }
  } catch (error: any) {
    // No fallar la página si hay error al cerrar cuentas antiguas
    console.error('[CuentasPage] Error al cerrar cuentas antiguas:', error)
  }

  try {
    const accounts = await prisma.account.findMany({
      include: {
        table: true,
        orders: {
          include: {
            product: true,
            user: true,
          },
          orderBy: { createdAt: 'desc' },
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

