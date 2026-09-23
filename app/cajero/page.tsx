import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashierDashboardData, closeOldAccounts } from '@/lib/actions'
import { getAppSettingsSafe } from '@/lib/app-settings'
import { getOpenCashSessionForUser } from '@/lib/ops-actions'
import { CajeroDashboard } from './CajeroDashboard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CajeroPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['CAJERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  // Cerrar cuentas antiguas en background (no bloquea)
  closeOldAccounts().catch((err) => console.error('[CajeroPage] Error al cerrar cuentas antiguas:', err))

  const [{ accounts, pendingOrders, recentServed, activeMeseros, watchedMeseroIds }, invoiceSettings, openCaja] =
    await Promise.all([getCashierDashboardData(), getAppSettingsSafe(), getOpenCashSessionForUser(session.user.id)])

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
        {!openCaja && (
          <Link
            href="/cajero/caja"
            className="block rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            No tienes caja abierta. Ábrela en Caja para que las ventas de este turno entren al arqueo.
          </Link>
        )}

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

