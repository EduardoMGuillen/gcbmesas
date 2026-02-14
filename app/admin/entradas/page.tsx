import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEntradasDashboardData } from '@/lib/actions'
import { EntradasClient } from './EntradasClient'

export const dynamic = 'force-dynamic'

export default async function EntradasPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'CAJERO'].includes(session.user.role)) {
    redirect('/login')
  }

  const userRole = session.user.role as 'ADMIN' | 'CAJERO'
  const { events, recentEntries, todayStats } = await getEntradasDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Entradas</h1>
        <p className="text-sm sm:text-base text-dark-300">
          {userRole === 'ADMIN'
            ? 'Vende entradas, administra eventos y envía QR por email o WhatsApp.'
            : 'Escanea entradas y consulta el historial.'}
        </p>
      </div>

      {/* Stats del día - solo para admin */}
      {userRole === 'ADMIN' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-dark-300">Ventas hoy</p>
            <p className="text-lg sm:text-2xl font-bold text-white">
              L {todayStats.totalSales.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-dark-300">Entradas hoy</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{todayStats.totalEntries}</p>
          </div>
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-dark-300">Transacciones hoy</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{todayStats.totalTransactions}</p>
          </div>
        </div>
      )}

      <EntradasClient events={events} recentEntries={recentEntries} userRole={userRole} />
    </div>
  )
}
