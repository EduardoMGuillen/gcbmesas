'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteEvent, getEventDashboard, updateEvent } from '@/lib/actions'
import { HourBars } from '@/components/entries/HourBars'
import { ExportEntriesDialog } from './ExportEntriesDialog'
import { EntryList } from './EntryList'
import { fmtEventDate, fmtLps } from './EventGrid'
import type { EventItem } from './types'

type Dashboard = Awaited<ReturnType<typeof getEventDashboard>>

function Kpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-staff-border bg-staff-surface p-4">
      <p className="text-xs font-medium text-staff-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${tone ?? 'text-staff-fg'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-staff-muted">{sub}</p>}
    </div>
  )
}

/** Anillo de progreso (ingresadas / vendidas). */
function Ring({ pct }: { pct: number }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" strokeWidth="8" className="stroke-staff-raised" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        className="stroke-emerald-500 transition-all duration-700"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
      />
    </svg>
  )
}

const ORIGIN = [
  { key: 'online', label: 'Online', cls: 'bg-sky-500' },
  { key: 'taquilla', label: 'Taquilla', cls: 'bg-primary-500' },
  { key: 'cortesia', label: 'Cortesía', cls: 'bg-amber-500' },
] as const

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-staff-border bg-staff-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-staff-fg">{title}</p>
        {aside && <p className="text-xs text-staff-muted">{aside}</p>}
      </div>
      {children}
    </div>
  )
}

export function EventPanel({
  event,
  canManage,
  onBack,
  onSell,
  onEdit,
}: {
  event: EventItem
  /** Admin: editar, activar, eliminar, dar ingreso. Cliente ticketera: solo ver, vender y exportar. */
  canManage: boolean
  onBack: () => void
  onSell: () => void
  onEdit: () => void
}) {
  const router = useRouter()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(async () => {
    try {
      setData(await getEventDashboard(event.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el evento')
    }
  }, [event.id])

  useEffect(() => {
    setData(null)
    void load()
  }, [load])

  const s = data?.summary
  const cap = data?.capacity && data.capacity >= 1 ? data.capacity : null
  const peak = data?.checkinsByHour.length
    ? data.checkinsByHour.reduce((a, b) => (b.count > a.count ? b : a))
    : null

  const toggleActive = () =>
    startTransition(async () => {
      try {
        await updateEvent(event.id, { isActive: !event.isActive })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo actualizar')
      }
    })

  const remove = () => {
    if (!confirm(`¿Eliminar el evento "${event.name}"?`)) return
    startTransition(async () => {
      try {
        await deleteEvent(event.id)
        router.refresh()
        onBack()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo eliminar')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="overflow-hidden rounded-2xl border border-staff-border bg-staff-surface">
        <div className="relative">
          {event.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverImage} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl" />
          )}
          <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <button
              type="button"
              onClick={onBack}
              className="self-start rounded-lg px-2 py-1 text-sm font-semibold text-staff-muted hover:bg-staff-hover hover:text-staff-fg"
            >
              ← Eventos
            </button>
            {event.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.coverImage} alt="" className="hidden h-20 w-16 rounded-xl object-cover shadow sm:block" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold text-staff-fg">{event.name}</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                    event.isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-staff-raised text-staff-muted'
                  }`}
                >
                  {event.isActive ? 'Activo' : 'Inactivo'}
                </span>
                {event.isFeatured && (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-500">★ Destacado</span>
                )}
              </div>
              <p className="text-sm text-staff-muted">
                {fmtEventDate(event.date, { weekday: 'long', month: 'long', year: 'numeric' })}
                {event.venueName ? ` · ${event.venueName}` : ''}
              </p>
              <p className="mt-1 text-xs text-staff-muted">
                Cover L {event.coverPrice.toFixed(2)}
                {event.paypalPrice ? ` · Online L ${Number(event.paypalPrice).toFixed(2)}` : ''}
                {event.publishOnLcb !== false ? ' · Casa Blanca' : ''}
                {event.publishOnCbtickets ? ' · GCBTickets' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {event.isActive && (
                <button
                  type="button"
                  onClick={onSell}
                  className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  Vender
                </button>
              )}
              <PanelBtn onClick={() => setExporting(true)}>Excel</PanelBtn>
              {canManage && (
                <>
                  <PanelBtn onClick={onEdit}>Editar</PanelBtn>
                  {event.isActive && (
                    <Link
                      href="/taquilla"
                      className="rounded-xl border border-staff-border px-3 py-2 text-sm font-semibold text-staff-fg hover:bg-staff-hover"
                    >
                      Taquilla
                    </Link>
                  )}
                  <PanelBtn onClick={toggleActive} disabled={isPending}>
                    {event.isActive ? 'Desactivar' : 'Activar'}
                  </PanelBtn>
                  {event._count.entries === 0 && (
                    <PanelBtn onClick={remove} disabled={isPending} danger>
                      Eliminar
                    </PanelBtn>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-staff-border bg-staff-surface p-4 lg:col-span-1">
          <Ring pct={s?.usedPct ?? 0} />
          <div>
            <p className="text-xs font-medium text-staff-muted">Ingresaron</p>
            <p className="text-2xl font-bold tabular-nums text-staff-fg">
              {s ? s.used : '—'}
              <span className="ml-1 text-sm font-semibold text-emerald-500">{s ? `${s.usedPct}%` : ''}</span>
            </p>
            <p className="text-xs text-staff-muted">{s ? `${s.pending} faltan` : ''}</p>
          </div>
        </div>
        <Kpi
          label="Vendidas"
          value={s ? s.sold : '—'}
          sub={cap ? `de ${cap} · ${Math.max(0, cap - (s?.sold ?? 0))} disponibles` : 'sin cupo'}
        />
        <Kpi label="Ingreso" value={s ? fmtLps(s.revenue) : '—'} tone="text-primary-500" sub="sin cortesías ni canceladas" />
        <Kpi label="Canceladas" value={s ? s.cancelled : '—'} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Ingreso por hora" aside={peak ? `pico ${peak.label} · ${peak.count}` : undefined}>
          <HourBars buckets={data?.checkinsByHour ?? []} emptyText={data ? 'Aún no hay ingresos' : 'Cargando…'} />
          {data && data.usedWithoutTime > 0 && (
            <p className="mt-2 text-[11px] text-staff-muted">
              {data.usedWithoutTime} ingreso{data.usedWithoutTime !== 1 ? 's' : ''} sin hora registrada
            </p>
          )}
        </Card>
        <Card title="Ventas por día">
          <HourBars buckets={data?.salesByDay ?? []} emptyText={data ? 'Sin ventas' : 'Cargando…'} />
        </Card>
        <Card title="Origen de las entradas">
          {s && s.sold > 0 ? (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-staff-raised">
                {ORIGIN.map((o) => (
                  <div
                    key={o.key}
                    className={o.cls}
                    style={{ width: `${(s.byOrigin[o.key] / s.sold) * 100}%` }}
                    title={`${o.label}: ${s.byOrigin[o.key]}`}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                {ORIGIN.map((o) => (
                  <span key={o.key} className="flex items-center gap-1.5 text-xs text-staff-muted">
                    <span className={`h-2.5 w-2.5 rounded-full ${o.cls}`} />
                    {o.label}
                    <span className="font-semibold tabular-nums text-staff-fg">{s.byOrigin[o.key]}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-xs text-staff-muted">{data ? 'Sin ventas' : 'Cargando…'}</p>
          )}
        </Card>
        <Card title="Escaneos por portero">
          {data?.scanners.length ? (
            <ul className="space-y-2">
              {data.scanners.map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-staff-fg">{p.name}</span>
                    <span className="font-semibold tabular-nums text-staff-fg">{p.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-staff-raised">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(p.count / data.scanners[0].count) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-xs text-staff-muted">{data ? 'Aún no hay escaneos' : 'Cargando…'}</p>
          )}
        </Card>
      </div>

      <EntryList
        event={event}
        canMarkUsed={canManage}
        onChanged={() => {
          void load()
          router.refresh()
        }}
      />

      {exporting && <ExportEntriesDialog event={{ id: event.id, name: event.name }} onClose={() => setExporting(false)} />}
    </div>
  )
}

function PanelBtn({
  children,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        danger ? 'border-red-500/40 text-red-500 hover:bg-red-500/10' : 'border-staff-border text-staff-fg hover:bg-staff-hover'
      }`}
    >
      {children}
    </button>
  )
}
