import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashierDashboardData } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { CashierAccounts } from '@/components/CashierAccounts'
import { CashierOrders } from '@/components/CashierOrders'

export const dynamic = 'force-dynamic'

export default async function CajeroPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['CAJERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const { accounts, pendingOrders, recentServed } =
    await getCashierDashboardData()

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Panel de Cajero</h1>
          <p className="text-dark-200">
            Consulta el estado de las cuentas abiertas y marca los pedidos como
            realizados cuando estén listos.
          </p>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Cuentas abiertas
          </h2>
          <CashierAccounts accounts={accounts} />
        </section>

        <section>
          <CashierOrders
            pendingOrders={pendingOrders}
            recentServed={recentServed}
          />
        </section>
      </main>
    </div>
  )
}

