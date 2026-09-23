'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeCashSession, openCashSession } from '@/lib/ops-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageHeader, Panel, StaffButton, StatCard } from '@/components/staff/ui'

type Register = { id: string; slug: string; name: string; defaultFloat: unknown }
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
  register: { name: string }
  openedBy?: { name: string | null; username: string }
  closedBy?: { name: string | null; username: string } | null
}

export function CashSessionPanel({
  registers,
  myOpen,
  openAll,
  recent,
  sessionPreview,
  isAdmin,
}: {
  registers: Register[]
  myOpen: Session | null
  openAll: Session[]
  recent: Session[]
  sessionPreview: { systemTotal: number; byMethod: Record<string, number>; accountCount: number } | null
  isAdmin: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const defaultRegister = registers[0]
  const [registerId, setRegisterId] = useState(defaultRegister?.id || '')
  const selected = registers.find((r) => r.id === registerId) || defaultRegister
  const [openingFloat, setOpeningFloat] = useState(String(Number(selected?.defaultFloat || 4000)))
  const [deliveredByName, setDeliveredByName] = useState('')
  const [receivedByName, setReceivedByName] = useState('')
  const [salesCash, setSalesCash] = useState('')
  const [salesPosFicohsa, setSalesPosFicohsa] = useState('0')
  const [salesPosBac, setSalesPosBac] = useState('')
  const [salesTransfer, setSalesTransfer] = useState('0')
  const [countedCash, setCountedCash] = useState('')
  const [notes, setNotes] = useState('')

  const float = Number(salesCash || 0)
  const counted = Number(countedCash || 0)
  const opening = Number(myOpen ? myOpen.openingFloat : openingFloat)
  const previewDiff = myOpen ? counted - opening - float : 0

  const declaredTotal = useMemo(
    () =>
      Number(salesCash || 0) +
      Number(salesPosFicohsa || 0) +
      Number(salesPosBac || 0) +
      Number(salesTransfer || 0),
    [salesCash, salesPosFicohsa, salesPosBac, salesTransfer]
  )

  const open = () => {
    setError('')
    start(async () => {
      try {
        await openCashSession({
          registerId,
          openingFloat: Number(openingFloat),
          deliveredByName,
          receivedByName,
        })
        router.refresh()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo abrir')
      }
    })
  }

  const close = () => {
    if (!myOpen) return
    setError('')
    start(async () => {
      try {
        await closeCashSession({
          sessionId: myOpen.id,
          salesCash: Number(salesCash || 0),
          salesPosFicohsa: Number(salesPosFicohsa || 0),
          salesPosBac: Number(salesPosBac || 0),
          salesTransfer: Number(salesTransfer || 0),
          countedCash: Number(countedCash || 0),
          notes,
        })
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
        description="Una sesión: apertura del fondo y cierre con arqueo. No son dos procesos distintos."
      />
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
      )}

      {isAdmin && openAll.length > 0 && (
        <Panel>
          <h2 className="font-semibold text-staff-fg mb-3">Sesiones abiertas</h2>
          <ul className="space-y-2 text-sm">
            {openAll.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 text-staff-muted">
                <span>
                  {s.register.name} · {s.openedBy?.name || s.openedBy?.username}
                </span>
                <span>Fondo {formatCurrency(Number(s.openingFloat))}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {!myOpen ? (
        <Panel>
          <h2 className="font-semibold text-staff-fg mb-4">Apertura</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm text-staff-muted">
              Caja
              <select
                className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
                value={registerId}
                onChange={(e) => {
                  setRegisterId(e.target.value)
                  const r = registers.find((x) => x.id === e.target.value)
                  if (r) setOpeningFloat(String(Number(r.defaultFloat)))
                }}
              >
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-staff-muted">
              Fondo asignado
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
            <label className="text-sm text-staff-muted">
              Recibe
              <input
                value={receivedByName}
                onChange={(e) => setReceivedByName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
              />
            </label>
          </div>
          <div className="mt-4">
            <StaffButton type="button" onClick={open} disabled={pending || !registerId}>
              Abrir caja
            </StaffButton>
          </div>
        </Panel>
      ) : (
        <Panel>
          <h2 className="font-semibold text-staff-fg mb-1">Cierre / arqueo — {myOpen.register.name}</h2>
          <p className="text-sm text-staff-muted mb-4">
            Abierta {formatDate(myOpen.openedAt)} · Fondo {formatCurrency(Number(myOpen.openingFloat))}
            {myOpen.deliveredByName ? ` · Entrega ${myOpen.deliveredByName}` : ''}
          </p>
          {sessionPreview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="Total sistema" value={formatCurrency(sessionPreview.systemTotal)} accent />
              <StatCard label="Cuentas en sesión" value={sessionPreview.accountCount} />
              <StatCard label="Efectivo sistema" value={formatCurrency(sessionPreview.byMethod.CASH || 0)} />
              <StatCard
                label="POS + transfer sistema"
                value={formatCurrency(
                  (sessionPreview.byMethod.POS_BAC || 0) +
                    (sessionPreview.byMethod.POS_FICOHSA || 0) +
                    (sessionPreview.byMethod.TRANSFER || 0)
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
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="text-staff-muted">
              Ventas declaradas: <strong className="text-staff-fg">{formatCurrency(declaredTotal)}</strong>
            </span>
            <span className="text-staff-muted">
              Sobrante / faltante (gaveta − fondo − ventas efectivo):{' '}
              <strong className={previewDiff === 0 ? 'text-emerald-500' : 'text-amber-500'}>
                {formatCurrency(previewDiff)}
              </strong>
            </span>
          </div>
          <div className="mt-4">
            <StaffButton type="button" onClick={close} disabled={pending || countedCash === ''}>
              Cerrar caja
            </StaffButton>
          </div>
        </Panel>
      )}

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
