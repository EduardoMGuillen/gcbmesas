import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEntradasDashboardData } from '@/lib/actions'
import { EntradasClient } from './EntradasClient'
import { PageHeader, StatCard } from '@/components/staff/ui'

export const dynamic = 'force-dynamic'

export default async function EntradasPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'CLIENTE_TICKETERA'].includes(session.user.role)) {
    redirect('/login')
  }

  const isTicketeraClient = session.user.role === 'CLIENTE_TICKETERA'
  const {
    events,
    recentEntries,
    todayStats,
    eventStats,
    entrySaleNotificationsEnabled,
    canManageEntrySaleNotifications,
  } = await getEntradasDashboardData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entradas"
        description={
          isTicketeraClient
            ? 'Ventas e historial de los eventos que te asignó el administrador.'
            : 'Vende entradas, administra eventos y envía QR por email o WhatsApp.'
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard
          label="Ventas hoy"
          value={`L ${todayStats.totalSales.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`}
          accent
        />
        <StatCard label="Entradas hoy" value={todayStats.totalEntries} />
        <StatCard label="Transacciones hoy" value={todayStats.totalTransactions} />
      </div>

      <EntradasClient
        events={events}
        recentEntries={recentEntries}
        eventStats={eventStats}
        isTicketeraClient={isTicketeraClient}
        entrySaleNotificationsEnabled={entrySaleNotificationsEnabled}
        canManageEntrySaleNotifications={canManageEntrySaleNotifications}
      />
    </div>
  )
}
