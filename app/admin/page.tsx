import { getDashboardStats, closeOldAccounts } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { PageHeader, Panel, StatCard } from '@/components/staff/ui'

export default async function AdminDashboard() {
  closeOldAccounts().catch((err) => console.error('[AdminDashboard] Error al cerrar cuentas antiguas:', err))

  let stats
  try {
    stats = await getDashboardStats()
  } catch (error: unknown) {
    console.error('Error fetching dashboard stats:', error)
    stats = {
      totalConsumedToday: 0,
      openAccounts: 0,
      activeWaiters: 0,
      topProducts: [],
      activeMeserosList: [],
    }
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Resumen general del sistema" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard label="Consumo Hoy" value={formatCurrency(stats.totalConsumedToday)} accent />
        <StatCard label="Cuentas Abiertas" value={stats.openAccounts} />
        <StatCard label="Meseros Activos" value={stats.activeWaiters} />
      </div>

      {stats.activeMeserosList.length > 0 && (
        <Panel className="mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-staff-fg mb-3 sm:mb-4">
            Meseros Activos y Mesas
          </h2>
          <div className="space-y-2 sm:space-y-3">
            {stats.activeMeserosList.map((mesero) => (
              <div
                key={mesero.id}
                className="bg-staff-raised border border-staff-border rounded-lg p-3 sm:p-4 flex justify-between items-center"
              >
                <p className="font-semibold text-staff-fg">{mesero.name}</p>
                <span className="text-primary-500 font-medium">
                  {mesero.tableCount} {mesero.tableCount === 1 ? 'mesa' : 'mesas'}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <h2 className="text-lg sm:text-xl font-semibold text-staff-fg mb-3 sm:mb-4">
          Productos Más Vendidos Hoy
        </h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm sm:text-base text-staff-muted text-center py-6 sm:py-8">
            No hay ventas registradas hoy
          </p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {stats.topProducts.map((product, index) => (
              <div
                key={product.productId}
                className="bg-staff-raised border border-staff-border rounded-lg p-3 sm:p-4 flex justify-between items-center"
              >
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600/20 rounded-full flex items-center justify-center text-primary-500 font-bold text-sm sm:text-base flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-staff-fg text-sm sm:text-base truncate">
                      {product.productName}
                    </p>
                    <p className="text-xs sm:text-sm text-staff-muted">
                      {product.totalQuantity} unidades • {product.totalOrders} pedidos
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
