import Link from 'next/link'
import { getDashboardStats, closeOldAccounts, getEntradasDashboardData } from '@/lib/actions'
import { getMonthOpsSummary } from '@/lib/ops-actions'
import { formatCurrency } from '@/lib/utils'
import { PageHeader, Panel } from '@/components/staff/ui'
import { STOCK_LOCATION_LABELS } from '@/lib/ops-constants'

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-staff-border bg-staff-surface p-4">
      <p className="text-xs font-medium text-staff-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${accent ? 'text-primary-500' : 'text-staff-fg'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-staff-muted">{sub}</p>}
    </div>
  )
}

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-staff-raised">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function AdminDashboard() {
  closeOldAccounts().catch((err) => console.error('[AdminDashboard] Error al cerrar cuentas antiguas:', err))

  const [stats, month, entradas] = await Promise.all([
    getDashboardStats().catch((e: unknown) => {
      console.error('Error fetching dashboard stats:', e)
      return { totalConsumedToday: 0, openAccounts: 0, activeWaiters: 0, topProducts: [], activeMeserosList: [] }
    }),
    getMonthOpsSummary().catch((e: unknown) => {
      console.error('Error fetching month ops:', e)
      return null
    }),
    getEntradasDashboardData().catch((e: unknown) => {
      console.error('Error fetching entradas:', e)
      return null
    }),
  ])

  const upcoming = (entradas?.events ?? [])
    .filter((e) => e.isActive)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <PageHeader title="Inicio" description="Lo importante de hoy" />

      {/* Próximos eventos */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-staff-muted">Próximos eventos</h2>
          <Link href="/admin/entradas" className="text-sm font-semibold text-primary-500">
            Ver todos
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <Panel>
            <p className="text-center text-sm text-staff-muted">
              No hay eventos activos.{' '}
              <Link href="/admin/entradas" className="font-semibold text-primary-500">
                Crear evento
              </Link>
            </p>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {upcoming.map((ev) => {
              const sold = ev.entriesSoldSum
              const used = ev.entriesUsedSum ?? 0
              const cap = ev.maxEntries != null && ev.maxEntries >= 1 ? ev.maxEntries : null
              return (
                <Link
                  key={ev.id}
                  href={`/admin/entradas?evento=${ev.id}`}
                  className="group flex gap-3 rounded-2xl border border-staff-border bg-staff-surface p-3 transition hover:border-primary-500/60"
                >
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-staff-raised">
                    {ev.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl font-black text-staff-muted">
                        {ev.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div>
                      <p className="truncate font-semibold text-staff-fg group-hover:text-primary-500">{ev.name}</p>
                      <p className="text-xs text-staff-muted">{fmtDate(ev.date)}</p>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-staff-muted">Vendidas</span>
                      <span className="font-semibold tabular-nums text-staff-fg">
                        {sold}
                        {cap ? <span className="font-normal text-staff-muted"> / {cap}</span> : null}
                      </span>
                    </div>
                    <Bar value={sold} max={cap ?? Math.max(sold, 1)} tone="bg-primary-500" />
                    <p className="text-xs font-semibold text-primary-500">{formatCurrency(ev.revenueLps ?? 0)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Hoy */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-staff-muted">Hoy</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Entradas vendidas"
            value={entradas?.todayStats.totalEntries ?? 0}
            sub={formatCurrency(entradas?.todayStats.totalSales ?? 0)}
            accent
          />
          <Stat label="Consumo en piso" value={formatCurrency(stats.totalConsumedToday)} />
          <Stat label="Cuentas abiertas" value={stats.openAccounts} />
          <Stat label="Meseros activos" value={stats.activeWaiters} />
        </div>
      </section>

      {/* Mes */}
      {month && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-staff-muted">Mes · {month.monthLabel}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Ventas (piso + entradas)" value={formatCurrency(month.sales)} accent />
            <Stat label="Gastos" value={formatCurrency(month.expenses)} />
            <Stat label="Margen operativo" value={formatCurrency(month.margin)} />
          </div>
        </section>
      )}

      {/* Alertas */}
      {month && (month.openSessions.length > 0 || month.expiring.length > 0 || month.mermaUnits > 0) && (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {month.openSessions.length > 0 && (
            <Panel>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-semibold text-staff-fg">Cajas abiertas</h3>
                <Link href="/admin/caja" className="text-sm font-semibold text-primary-500">
                  Ir a caja
                </Link>
              </div>
              <ul className="space-y-1 text-sm text-staff-muted">
                {month.openSessions.map((s) => (
                  <li key={s.id}>
                    {s.register.name} · {s.openedBy.name || s.openedBy.username}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {(month.expiring.length > 0 || month.mermaUnits > 0) && (
            <Panel>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-semibold text-staff-fg">Inventario</h3>
                <Link href="/admin/inventario" className="text-sm font-semibold text-primary-500">
                  Ir a inventario
                </Link>
              </div>
              {month.mermaUnits > 0 && (
                <p className="mb-1 text-sm text-staff-muted">{month.mermaUnits} unidades en expirado/pérdida este mes</p>
              )}
              <ul className="space-y-1 text-sm text-staff-muted">
                {month.expiring.map((s) => (
                  <li key={s.id}>
                    {s.name}
                    {s.presentation ? ` ${s.presentation}` : ''} · {STOCK_LOCATION_LABELS[s.location]} ·{' '}
                    {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('es-HN') : ''}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </section>
      )}

      {/* Más vendido hoy */}
      {stats.topProducts.length > 0 && (
        <Panel>
          <h3 className="mb-3 font-semibold text-staff-fg">Lo más vendido hoy</h3>
          <ol className="space-y-2">
            {stats.topProducts.map((p, i) => (
              <li key={p.productId} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-bold text-primary-500">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-staff-fg">{p.productName}</span>
                <span className="shrink-0 tabular-nums text-staff-muted">{p.totalQuantity} u.</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  )
}
