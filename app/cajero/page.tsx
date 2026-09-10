import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashierDashboardData, closeOldAccounts } from '@/lib/actions'
import { getAppSettingsSafe } from '@/lib/app-settings'
import { CajeroDashboard } from './CajeroDashboard'

export const dynamic = 'force-dynamic'

export default async function CajeroPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['CAJERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  // Cerrar cuentas antiguas en background (no bloquea)
  closeOldAccounts().catch((err) => console.error('[CajeroPage] Error al cerrar cuentas antiguas:', err))

  const [{ accounts, pendingOrders, recentServed, activeMeseros, watchedMeseroIds }, invoiceSettings] =
    await Promise.all([getCashierDashboardData(), getAppSettingsSafe()])

  const isCajero = session.user.role === 'CAJERO'

  return (
    <div className="space-y-8">
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
          userId={session.user.id}
          watchedMeseroIds={watchedMeseroIds}
          isCajero={isCajero}
          invoiceSettings={invoiceSettings}
        />
    </div>
  )
}

