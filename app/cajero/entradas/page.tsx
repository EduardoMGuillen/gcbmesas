import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEntradasDashboardData } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { EntradasClient } from './EntradasClient'

export const dynamic = 'force-dynamic'

export default async function EntradasPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['CAJERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const { events, recentEntries, todayStats } = await getEntradasDashboardData()

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <Navbar />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Entradas</h1>
          <p className="text-sm sm:text-base text-dark-300">
            Vende entradas, administra eventos y envía QR por email.
          </p>
        </div>

        {/* Stats del día */}
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

        <EntradasClient events={events} recentEntries={recentEntries} />
      </main>
      {!isAdmin && <Footer />}
    </div>
  )
}
