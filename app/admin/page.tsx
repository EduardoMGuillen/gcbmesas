import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardStats } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
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
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-dark-400">Resumen general del sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
            <h3 className="text-sm font-medium text-dark-400 mb-2">
              Consumo Hoy
            </h3>
            <p className="text-3xl font-bold text-primary-400">
              {formatCurrency(stats.totalConsumedToday)}
            </p>
          </div>
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
            <h3 className="text-sm font-medium text-dark-400 mb-2">
              Cuentas Abiertas
            </h3>
            <p className="text-3xl font-bold text-white">{stats.openAccounts}</p>
          </div>
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
            <h3 className="text-sm font-medium text-dark-400 mb-2">
              Meseros Activos
            </h3>
            <p className="text-3xl font-bold text-white">
              {stats.activeWaiters}
            </p>
          </div>
        </div>

        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Productos Más Vendidos Hoy
          </h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-dark-400 text-center py-8">
              No hay ventas registradas hoy
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="bg-dark-50 border border-dark-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-primary-600/20 rounded-full flex items-center justify-center text-primary-400 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {product.productName}
                      </p>
                      <p className="text-sm text-dark-400">
                        {product.totalQuantity} unidades • {product.totalOrders}{' '}
                        pedidos
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

