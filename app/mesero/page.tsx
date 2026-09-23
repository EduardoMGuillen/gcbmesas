import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { closeOldAccounts, getTables, getWalkInTable } from '@/lib/actions'
import { getWaiterZoneAssignment } from '@/lib/ops-actions'
import { WaiterZonePicker } from '@/components/WaiterZonePicker'
import { formatBusinessDayLabel, getBusinessDate } from '@/lib/business-day'
import { VENUE_ZONE_LABELS } from '@/lib/venue-zones'
import { isWalkInTable } from '@/lib/walk-in-table'

export default async function MeseroPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  closeOldAccounts().catch((err) => console.error('[MeseroPage] Error al cerrar cuentas antiguas:', err))

  const [assignment, tables, walkInTable] = await Promise.all([
    getWaiterZoneAssignment(session.user.id),
    getTables(),
    getWalkInTable(),
  ])

  const zone = assignment?.zone || null
  const dayLabel = formatBusinessDayLabel(getBusinessDate())

  if (session.user.role === 'MESERO' && !zone) {
    return <WaiterZonePicker businessDayLabel={dayLabel} />
  }

  const zoneTables = tables.filter((t) => !isWalkInTable(t))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {zone ? VENUE_ZONE_LABELS[zone] : 'Mesas'}
          </h1>
          <p className="text-sm text-dark-400">Toca la mesa para cobrar. Día: {dayLabel}</p>
        </div>
        {zone && (
          <WaiterZonePicker businessDayLabel={dayLabel} currentZone={zone} compact />
        )}
      </div>

      <Link
        href={`/mesero/pedidos?tableId=${walkInTable.id}&newWalkIn=1`}
        className="block rounded-2xl border border-cyan-500/40 bg-cyan-600/20 px-4 py-4 text-center text-lg font-bold text-white touch-manipulation"
      >
        Cliente de pie
      </Link>

      {zoneTables.length === 0 ? (
        <p className="text-staff-muted text-sm">No hay mesas en esta zona. Pide al admin que las asigne.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {zoneTables.map((table) => {
            const open = Array.isArray(table.accounts) ? table.accounts.length : 0
            return (
              <Link
                key={table.id}
                href={`/mesero/pedidos?tableId=${table.id}`}
                className="min-h-[88px] rounded-2xl border border-dark-200 bg-dark-100 px-3 py-4 text-center touch-manipulation hover:border-primary-500"
              >
                <p className="text-lg font-bold text-white">{table.name}</p>
                {open > 0 && <p className="text-xs text-amber-300 mt-1">Abierta</p>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
