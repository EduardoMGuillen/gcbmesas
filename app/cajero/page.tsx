import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashierDashboardData, closeOldAccounts } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CajeroDashboard } from './CajeroDashboard'

export const dynamic = 'force-dynamic'

export default async function CajeroPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['CAJERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  // Cerrar cuentas antiguas en background (no bloquea)
  closeOldAccounts().catch((err) => console.error('[CajeroPage] Error al cerrar cuentas antiguas:', err))

  const { accounts, pendingOrders, recentServed, activeMeseros } =
    await getCashierDashboardData()

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <Navbar />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Panel de Cajero</h1>
          <p className="text-dark-200">
            Consulta el estado de las cuentas abiertas y marca los pedidos como
            realizados cuando estén listos.
          </p>
        </div>

        <CajeroDashboard
          accounts={accounts}
          pendingOrders={pendingOrders}
          recentServed={recentServed}
          activeMeseros={activeMeseros}
        />
      </main>
      {!isAdmin && <Footer />}
    </div>
  )
}

