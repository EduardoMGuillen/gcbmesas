'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeCashSession, openCashSession } from '@/lib/ops-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge, EmptyState, PageHeader, Panel, StaffButton } from '@/components/staff/ui'
import { venueZoneLabel } from '@/lib/venue-zones'

const fieldClass =
  'mt-1 w-full px-3 py-2.5 rounded-xl bg-staff-raised border border-staff-border text-staff-fg'

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

type Preview = { systemTotal: number; byMethod: Record<string, number>; accountCount: number }

function registerLabel(register: { name: string; venueZone?: string | null }) {
  const zone = venueZoneLabel(register.venueZone)
  return zone ? `${register.name} · ${zone}` : register.name
}

async function downloadExcel(url: string, fallbackName: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || 'No se pudo descargar')
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition')
  const match = cd?.match(/filename="([^"]+)"/)
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = match?.[1] || fallbackName
  a.click()
  URL.revokeObjectURL(objectUrl)
}

function OpenForm({
  registers,
  pending,
  onOpen,
}: {
  registers: Register[]
  pending: boolean
  onOpen: (data: { registerId: string; openingFloat: number; deliveredByName: string; receivedByName: string }) => void
}) {
  const [registerId, setRegisterId] = useState(registers[0]?.id || '')
  const selected = registers.find((r) => r.id === registerId) || registers[0]
  const [openingFloat, setOpeningFloat] = useState(String(Number(selected?.defaultFloat || 4000)))
  const [deliveredByName, setDeliveredByName] = useState('')
  const [receivedByName, setReceivedByName] = useState('')

  useEffect(() => {
    if (!registers.some((r) => r.id === registerId)) {
      setRegisterId(registers[0]?.id || '')
    }
  }, [registers, registerId])

  useEffect(() => {
    if (selected) setOpeningFloat(String(Number(selected.defaultFloat || 4000)))
  }, [selected?.id])

  if (registers.length === 0) {
    return (
      <EmptyState
        title="Todas las cajas están abiertas"
        description="Cierra una abajo para poder abrirla de nuevo."
      />
    )
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm text-staff-muted">
        ¿Cuál caja abres?
        <select value={registerId} onChange={(e) => setRegisterId(e.target.value)} className={fieldClass}>
          {registers.map((r) => (
            <option key={r.id} value={r.id}>
              {registerLabel(r)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm text-staff-muted">
          Fondo
          <input
            type="number"
            min={0}
            step="0.01"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-staff-muted">
          Entrega
          <input
            value={deliveredByName}
            onChange={(e) => setDeliveredByName(e.target.value)}
            placeholder="Quién entrega el fondo"
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-staff-muted sm:col-span-2">
          Recibe
          <input
            value={receivedByName}
            onChange={(e) => setReceivedByName(e.target.value)}
            placeholder="Quién recibe el fondo"
            className={fieldClass}
          />
        </label>
      </div>
      <StaffButton
        type="button"
        onClick={() =>
          onOpen({
            registerId,
            openingFloat: Number(openingFloat),
            deliveredByName,
            receivedByName,
          })
        }
        disabled={pending || !registerId}
      >
        Abrir {selected?.name || 'caja'}
      </StaffButton>
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
  preview: Preview | null
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div className="rounded-xl bg-staff-raised border border-staff-border px-3 py-2">
            <p className="text-xs text-staff-muted">Sistema</p>
            <p className="font-semibold text-staff-fg">{formatCurrency(preview.systemTotal)}</p>
          </div>
          <div className="rounded-xl bg-staff-raised border border-staff-border px-3 py-2">
            <p className="text-xs text-staff-muted">Cuentas</p>
            <p className="font-semibold text-staff-fg">{preview.accountCount}</p>
          </div>
          <div className="rounded-xl bg-staff-raised border border-staff-border px-3 py-2">
            <p className="text-xs text-staff-muted">Efectivo sistema</p>
            <p className="font-semibold text-staff-fg">{formatCurrency(preview.byMethod.CASH || 0)}</p>
          </div>
          <div className="rounded-xl bg-staff-raised border border-staff-border px-3 py-2">
            <p className="text-xs text-staff-muted">POS + transfer</p>
            <p className="font-semibold text-staff-fg">
              {formatCurrency(
                (preview.byMethod.POS_BAC || 0) +
                  (preview.byMethod.POS_FICOHSA || 0) +
                  (preview.byMethod.TRANSFER || 0)
              )}
            </p>
          </div>
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
            className={fieldClass}
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
            className={fieldClass}
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
            className={fieldClass}
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
            className={fieldClass}
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
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-staff-muted sm:col-span-2">
          Observaciones
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={fieldClass}
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
      await downloadExcel(`/api/arqueos?${params.toString()}`, `Arqueos_${from}_${to}.xlsx`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo descargar')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Panel>
      <h2 className="font-semibold text-staff-fg mb-1">Excel de varios días</h2>
      <p className="text-sm text-staff-muted mb-4">Baja un reporte con todas las cajas del rango que elijas.</p>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="text-sm text-staff-muted">
          Desde
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm text-staff-muted">
          Hasta
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm text-staff-muted">
          Caja
          <select value={registerId} onChange={(e) => setRegisterId(e.target.value)} className={fieldClass}>
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
  sessionPreviews: Record<string, Preview>
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [closeId, setCloseId] = useState(openAll[0]?.id || '')
  const [downloadingId, setDownloadingId] = useState('')

  const openIds = useMemo(() => new Set(openAll.map((s) => s.registerId || s.register.name)), [openAll])
  const availableToOpen = registers.filter((r) => !openIds.has(r.id) && !openIds.has(r.name))
  const selectedClose = openAll.find((s) => s.id === closeId) || openAll[0] || null

  useEffect(() => {
    if (!openAll.some((s) => s.id === closeId)) {
      setCloseId(openAll[0]?.id || '')
    }
  }, [openAll, closeId])

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

  const downloadOne = async (session: Session) => {
    setDownloadingId(session.id)
    try {
      await downloadExcel(`/api/arqueos?sessionId=${encodeURIComponent(session.id)}`, `Arqueo_${session.register.name}.xlsx`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo descargar')
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja"
        description="Elige una caja para abrirla. Las que ya están abiertas se cierran una por una abajo."
      />
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
      )}

      {openAll.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {openAll.map((s) => (
            <Badge key={s.id} tone="success">
              {s.register.name} abierta
            </Badge>
          ))}
        </div>
      )}

      <Panel>
        <h2 className="font-semibold text-staff-fg mb-1">1. Abrir caja</h2>
        <p className="text-sm text-staff-muted mb-4">
          Puedes tener varias abiertas. Una caja ya abierta no se vuelve a abrir hasta que se cierre.
        </p>
        <OpenForm registers={availableToOpen} pending={pending} onOpen={open} />
      </Panel>

      <Panel>
        <h2 className="font-semibold text-staff-fg mb-1">2. Cerrar caja</h2>
        <p className="text-sm text-staff-muted mb-4">Elige cuál de las abiertas quieres cerrar. Se cierra una por una.</p>
        {openAll.length === 0 || !selectedClose ? (
          <EmptyState title="No hay cajas abiertas" description="Abre una arriba para poder cerrarla aquí." />
        ) : (
          <div className="space-y-4">
            <label className="block text-sm text-staff-muted">
              ¿Cuál caja cierras?
              <select value={selectedClose.id} onChange={(e) => setCloseId(e.target.value)} className={fieldClass}>
                {openAll.map((s) => (
                  <option key={s.id} value={s.id}>
                    {registerLabel(s.register)} · desde {formatDate(s.openedAt)}
                  </option>
                ))}
              </select>
            </label>
            <CloseForm
              key={selectedClose.id}
              session={selectedClose}
              preview={sessionPreviews[selectedClose.id] || null}
              pending={pending}
              onClose={close}
            />
          </div>
        )}
      </Panel>

      <ArqueosExport registers={registers} />

      <Panel>
        <h2 className="font-semibold text-staff-fg mb-1">Historial</h2>
        <p className="text-sm text-staff-muted mb-4">Baja el Excel de un solo arqueo cuando ya esté cerrado.</p>
        {recent.length === 0 ? (
          <p className="text-sm text-staff-muted">Todavía no hay sesiones.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-staff-border pb-2"
              >
                <span className="text-staff-fg">
                  {s.register.name} · {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-staff-muted">
                    {formatDate(s.openedAt)}
                    {s.systemTotal != null ? ` · sistema ${formatCurrency(Number(s.systemTotal))}` : ''}
                    {s.difference != null ? ` · dif. ${formatCurrency(Number(s.difference))}` : ''}
                  </span>
                  <StaffButton
                    type="button"
                    variant="secondary"
                    className="!py-1.5 !px-3 !text-xs"
                    onClick={() => void downloadOne(s)}
                    disabled={downloadingId === s.id}
                  >
                    {downloadingId === s.id ? 'Bajando…' : 'Excel'}
                  </StaffButton>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
