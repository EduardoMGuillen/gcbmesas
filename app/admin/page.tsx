import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardStats } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CleanUrlParams } from '@/components/CleanUrlParams'
import { Suspense } from 'react'
import { formatCurrency } from '@/lib/utils'

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
    return
  }

  let stats
  try {
    stats = await getDashboardStats()
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    // Return default stats on error
    stats = {
      totalConsumedToday: 0,
      openAccounts: 0,
      activeWaiters: 0,
      topProducts: [],
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={null}>
        <CleanUrlParams />
      </Suspense>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex-1">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-dark-400">Resumen general del sistema</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-dark-400 mb-2">
              Consumo Hoy
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-primary-400">
              {formatCurrency(stats.totalConsumedToday)}
            </p>
          </div>
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-dark-400 mb-2">
              Cuentas Abiertas
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.openAccounts}</p>
          </div>
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <h3 className="text-xs sm:text-sm font-medium text-dark-400 mb-2">
              Meseros Activos
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {stats.activeWaiters}
            </p>
          </div>
        </div>

        <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
            Productos Más Vendidos Hoy
          </h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm sm:text-base text-dark-400 text-center py-6 sm:py-8">
              No hay ventas registradas hoy
            </p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {stats.topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="bg-dark-50 border border-dark-200 rounded-lg p-3 sm:p-4 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600/20 rounded-full flex items-center justify-center text-primary-400 font-bold text-sm sm:text-base flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white text-sm sm:text-base truncate">
                        {product.productName}
                      </p>
                      <p className="text-xs sm:text-sm text-dark-400">
                        {product.totalQuantity} unidades • {product.totalOrders} pedidos
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

