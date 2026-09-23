'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeCashSession, openCashSession } from '@/lib/ops-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageHeader, Panel, StaffButton, StatCard } from '@/components/staff/ui'
import { venueZoneLabel } from '@/lib/venue-zones'

type Register = {
  id: string
  slug: string
  name: string
  defaultFloat: unknown
  venueZone?: string | null
}
type Session = {
  id: string
  status: string
  openedAt: Date | string
  closedAt?: Date | string | null
  openingFloat: unknown
  salesCash?: unknown
  salesPosFicohsa?: unknown
  salesPosBac?: unknown
  salesTransfer?: unknown
  countedCash?: unknown
  systemTotal?: unknown
  difference?: unknown
  notes?: string | null
  deliveredByName?: string | null
  receivedByName?: string | null
  registerId?: string
  register: { name: string; venueZone?: string | null }
  openedBy?: { name: string | null; username: string }
  closedBy?: { name: string | null; username: string } | null
}

function OpenForm({
  register,
  pending,
  onOpen,
}: {
  register: Register
  pending: boolean
  onOpen: (data: { registerId: string; openingFloat: number; deliveredByName: string; receivedByName: string }) => void
}) {
  const [openingFloat, setOpeningFloat] = useState(String(Number(register.defaultFloat || 4000)))
  const [deliveredByName, setDeliveredByName] = useState('')
  const [receivedByName, setReceivedByName] = useState('')
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-sm text-staff-muted">
        Fondo
        <input
          type="number"
          min={0}
          step="0.01"
          value={openingFloat}
          onChange={(e) => setOpeningFloat(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
        />
      </label>
      <label className="text-sm text-staff-muted">
        Entrega
        <input
          value={deliveredByName}
          onChange={(e) => setDeliveredByName(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
        />
      </label>
      <label className="text-sm text-staff-muted sm:col-span-2">
        Recibe
        <input
          value={receivedByName}
          onChange={(e) => setReceivedByName(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
        />
      </label>
      <div className="sm:col-span-2">
        <StaffButton
          type="button"
          onClick={() =>
            onOpen({
              registerId: register.id,
              openingFloat: Number(openingFloat),
              deliveredByName,
              receivedByName,
            })
          }
          disabled={pending}
        >
          Abrir {register.name}
        </StaffButton>
      </div>
    </div>
  )
}

function CloseForm({
  session,
  preview,
  pending,
  onClose,
}: {
  session: Session
  preview: { systemTotal: number; byMethod: Record<string, number>; accountCount: number } | null
  pending: boolean
  onClose: (data: {
    sessionId: string
    salesCash: number
    salesPosFicohsa: number
    salesPosBac: number
    salesTransfer: number
    countedCash: number
    notes?: string
  }) => void
}) {
  const [salesCash, setSalesCash] = useState('')
  const [salesPosFicohsa, setSalesPosFicohsa] = useState('0')
  const [salesPosBac, setSalesPosBac] = useState('')
  const [salesTransfer, setSalesTransfer] = useState('0')
  const [countedCash, setCountedCash] = useState('')
  const [notes, setNotes] = useState('')
  const opening = Number(session.openingFloat)
  const previewDiff = Number(countedCash || 0) - opening - Number(salesCash || 0)
  const declaredTotal =
    Number(salesCash || 0) +
    Number(salesPosFicohsa || 0) +
    Number(salesPosBac || 0) +
    Number(salesTransfer || 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-staff-muted">
        Abierta {formatDate(session.openedAt)} · Fondo {formatCurrency(opening)}
        {session.deliveredByName ? ` · Entrega ${session.deliveredByName}` : ''}
      </p>
      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total sistema" value={formatCurrency(preview.systemTotal)} accent />
          <StatCard label="Cuentas" value={preview.accountCount} />
          <StatCard label="Efectivo sistema" value={formatCurrency(preview.byMethod.CASH || 0)} />
          <StatCard
            label="POS + transfer"
            value={formatCurrency(
              (preview.byMethod.POS_BAC || 0) +
                (preview.byMethod.POS_FICOHSA || 0) +
                (preview.byMethod.TRANSFER || 0)
            )}
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm text-staff-muted">
          Ventas efectivo
          <input
            type="number"
            min={0}
            step="0.01"
            value={salesCash}
            onChange={(e) => setSalesCash(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
        </label>
        <label className="text-sm text-staff-muted">
          POS Ficohsa
          <input
            type="number"
            min={0}
            step="0.01"
            value={salesPosFicohsa}
            onChange={(e) => setSalesPosFicohsa(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
        </label>
        <label className="text-sm text-staff-muted">
          POS BAC
          <input
            type="number"
            min={0}
            step="0.01"
            value={salesPosBac}
            onChange={(e) => setSalesPosBac(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
        </label>
        <label className="text-sm text-staff-muted">
          Transferencias
          <input
            type="number"
            min={0}
            step="0.01"
            value={salesTransfer}
            onChange={(e) => setSalesTransfer(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
        </label>
        <label className="text-sm text-staff-muted sm:col-span-2">
          Efectivo en gaveta (contado)
          <input
            type="number"
            min={0}
            step="0.01"
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
        </label>
        <label className="text-sm text-staff-muted sm:col-span-2">
          Observaciones
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
            rows={2}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-staff-muted">
          Ventas declaradas: <strong className="text-staff-fg">{formatCurrency(declaredTotal)}</strong>
        </span>
        <span className="text-staff-muted">
          Sobrante / faltante:{' '}
          <strong className={previewDiff === 0 ? 'text-emerald-500' : 'text-amber-500'}>
            {formatCurrency(previewDiff)}
          </strong>
        </span>
      </div>
      <StaffButton
        type="button"
        onClick={() =>
          onClose({
            sessionId: session.id,
            salesCash: Number(salesCash || 0),
            salesPosFicohsa: Number(salesPosFicohsa || 0),
            salesPosBac: Number(salesPosBac || 0),
            salesTransfer: Number(salesTransfer || 0),
            countedCash: Number(countedCash || 0),
            notes,
          })
        }
        disabled={pending || countedCash === ''}
      >
        Cerrar {session.register.name}
      </StaffButton>
    </div>
  )
}

function hnToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function hnDaysAgo(days: number) {
  const now = new Date()
  now.setDate(now.getDate() - days)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function ArqueosExport({ registers }: { registers: Register[] }) {
  const [from, setFrom] = useState(hnDaysAgo(30))
  const [to, setTo] = useState(hnToday())
  const [registerId, setRegisterId] = useState('')
  const [downloading, setDownloading] = useState(false)

  const download = async () => {
    setDownloading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (registerId) params.set('registerId', registerId)
      const res = await fetch(`/api/arqueos?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'No se pudo descargar')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Arqueos_${from}_${to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo descargar')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Panel>
      <h2 className="font-semibold text-staff-fg mb-1">Exportar arqueos</h2>
      <p className="text-sm text-staff-muted mb-4">
        Descarga un Excel con fondo, ventas, POS, efectivo contado y diferencia. Sirve para el cierre de cada noche.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="text-sm text-staff-muted">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
        </label>
        <label className="text-sm text-staff-muted">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
        </label>
        <label className="text-sm text-staff-muted">
          Caja
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          >
            <option value="">Todas</option>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <StaffButton type="button" onClick={() => void download()} disabled={downloading || !from || !to}>
          {downloading ? 'Descargando…' : 'Descargar Excel'}
        </StaffButton>
      </div>
    </Panel>
  )
}

export function CashSessionPanel({
  registers,
  openAll,
  recent,
  sessionPreviews,
}: {
  registers: Register[]
  openAll: Session[]
  recent: Session[]
  sessionPreviews: Record<string, { systemTotal: number; byMethod: Record<string, number>; accountCount: number }>
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  const openByRegister = useMemo(() => {
    const map = new Map<string, Session>()
    for (const session of openAll) {
      map.set(session.registerId || session.register.name, session)
    }
    return map
  }, [openAll])

  const open = (data: {
    registerId: string
    openingFloat: number
    deliveredByName: string
    receivedByName: string
  }) => {
    setError('')
    start(async () => {
      try {
        await openCashSession(data)
        router.refresh()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo abrir')
      }
    })
  }

  const close = (data: {
    sessionId: string
    salesCash: number
    salesPosFicohsa: number
    salesPosBac: number
    salesTransfer: number
    countedCash: number
    notes?: string
  }) => {
    setError('')
    start(async () => {
      try {
        await closeCashSession(data)
        router.refresh()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo cerrar')
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja"
        description="Solo administración abre y cierra. Cada zona (Astro, Studio54, Garden) tiene su caja. Cover y Eventos siguen aparte."
      />
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {registers.map((register) => {
          const openSession =
            openAll.find((s) => s.register.name === register.name) ||
            Array.from(openByRegister.values()).find((s) => s.register.name === register.name)
          const zone = venueZoneLabel(register.venueZone || '')
          return (
            <Panel key={register.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-semibold text-staff-fg">{register.name}</h2>
                  <p className="text-xs text-staff-muted">
                    {zone ? `Zona ${zone}` : 'Sin zona de piso'} · Fondo {formatCurrency(Number(register.defaultFloat))}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    openSession ? 'bg-emerald-500/15 text-emerald-400' : 'bg-staff-raised text-staff-muted'
                  }`}
                >
                  {openSession ? 'Abierta' : 'Cerrada'}
                </span>
              </div>
              {openSession ? (
                <CloseForm
                  session={openSession}
                  preview={sessionPreviews[openSession.id] || null}
                  pending={pending}
                  onClose={close}
                />
              ) : (
                <OpenForm register={register} pending={pending} onOpen={open} />
              )}
            </Panel>
          )
        })}
      </div>

      <ArqueosExport registers={registers} />

      <Panel>
        <h2 className="font-semibold text-staff-fg mb-3">Historial reciente</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-staff-muted">Todavía no hay sesiones.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 text-sm border-b border-staff-border pb-2">
                <span className="text-staff-fg">
                  {s.register.name} · {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                </span>
                <span className="text-staff-muted">
                  {formatDate(s.openedAt)}
                  {s.systemTotal != null ? ` · sistema ${formatCurrency(Number(s.systemTotal))}` : ''}
                  {s.difference != null ? ` · dif. ${formatCurrency(Number(s.difference))}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
