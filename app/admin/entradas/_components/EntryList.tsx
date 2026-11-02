'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  cancelEntry,
  markEntryUsed,
  markEntryWhatsappSent,
  revertEntryToActive,
  searchEventEntries,
  type EventEntryRow,
} from '@/lib/actions'
import { buildWhatsAppUrl, handlePrintEntry, handleSendEntryEmail } from './entry-delivery'
import type { EventItem } from './types'

type Chip = {
  id: string
  label: string
  status?: 'ACTIVE' | 'USED' | 'CANCELLED'
  origin?: 'online' | 'taquilla' | 'cortesia'
}
const CHIPS: Chip[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Faltan', status: 'ACTIVE' },
  { id: 'used', label: 'Ingresaron', status: 'USED' },
  { id: 'cancelled', label: 'Canceladas', status: 'CANCELLED' },
  { id: 'online', label: 'Online', origin: 'online' },
  { id: 'taquilla', label: 'Taquilla', origin: 'taquilla' },
  { id: 'cortesia', label: 'Cortesía', origin: 'cortesia' },
]

const STATUS = {
  ACTIVE: { label: 'Falta', dot: 'bg-sky-500', pill: 'bg-sky-500/15 text-sky-500' },
  USED: { label: 'Ingresó', dot: 'bg-emerald-500', pill: 'bg-emerald-500/15 text-emerald-500' },
  CANCELLED: { label: 'Cancelada', dot: 'bg-red-500', pill: 'bg-red-500/15 text-red-500' },
} as const

const ORIGIN_LABEL = { online: 'Online', taquilla: 'Taquilla', cortesia: 'Cortesía' } as const

const hnDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-HN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Tegucigalpa',
  })
const hnTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-HN', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Tegucigalpa' })

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function EntryList({
  event,
  canMarkUsed,
  onChanged,
}: {
  event: EventItem
  /** Marcar usada requiere rol de puerta (el cliente ticketera no puede) */
  canMarkUsed: boolean
  onChanged: () => void
}) {
  const [chip, setChip] = useState('all')
  const [q, setQ] = useState('')
  const debounced = useDebounced(q.trim(), 350)
  const [rows, setRows] = useState<EventEntryRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [, startTransition] = useTransition()
  const active = CHIPS.find((c) => c.id === chip) ?? CHIPS[0]

  const fetchPage = useCallback(
    async (after?: string) => {
      setLoading(true)
      try {
        const res = await searchEventEntries({
          eventId: event.id,
          status: active.status ?? 'all',
          origin: active.origin ?? 'all',
          q: debounced || undefined,
          cursor: after,
        })
        setRows((prev) => (after ? [...prev, ...res.rows] : res.rows))
        setCursor(res.nextCursor)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar')
      } finally {
        setLoading(false)
      }
    },
    [event.id, active.status, active.origin, debounced]
  )

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  const run = (id: string, fn: () => Promise<string | void>) => {
    setBusyId(id)
    setError('')
    setMsg('')
    startTransition(async () => {
      try {
        const ok = await fn()
        if (ok) setMsg(ok)
        await fetchPage()
        onChanged()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ocurrió un error')
      } finally {
        setBusyId(null)
      }
    })
  }

  const delivery = (r: EventEntryRow) => ({
    entryId: r.id,
    qrToken: r.qrToken,
    clientName: r.clientName,
    clientEmail: r.clientEmail,
    numberOfEntries: r.numberOfEntries,
    totalPrice: r.totalPrice,
    eventName: event.name,
    eventDate: String(event.date),
  })

  const actions = {
    email: (r: EventEntryRow) =>
      run(r.id, async () => {
        await handleSendEntryEmail({
          ...delivery(r),
          venueName: event.venueName ?? null,
          venueAddress: event.venueAddress ?? null,
        })
        return `Correo enviado a ${r.clientEmail}`
      }),
    whatsapp: (r: EventEntryRow) => {
      if (!r.clientPhone) return
      window.open(
        buildWhatsAppUrl({
          phone: r.clientPhone,
          entries: [{ qrToken: r.qrToken, clientName: r.clientName }],
          eventName: event.name,
          eventDate: String(event.date),
          totalPrice: r.totalPrice,
        }),
        '_blank'
      )
      run(r.id, async () => {
        await markEntryWhatsappSent(r.id)
        return `WhatsApp abierto para ${r.clientPhone}`
      })
    },
    print: (r: EventEntryRow) => run(r.id, async () => void (await handlePrintEntry(delivery(r)))),
    markUsed: (r: EventEntryRow) =>
      run(r.id, async () => {
        await markEntryUsed(r.id)
        return `${r.clientName}: ingreso registrado`
      }),
    revert: (r: EventEntryRow) =>
      run(r.id, async () => {
        await revertEntryToActive(r.id)
        return `${r.clientName}: revertida a activa`
      }),
    cancel: (r: EventEntryRow) => {
      if (!confirm(`¿Cancelar la entrada de ${r.clientName}? Si fue pagada en línea se intentará el reembolso.`)) return
      run(r.id, async () => {
        const result = await cancelEntry(r.id)
        if (!result.ok) throw new Error(result.message)
        return `${r.clientName}: entrada cancelada`
      })
    },
  }

  return (
    <div className="rounded-2xl border border-staff-border bg-staff-surface">
      <div className="space-y-3 border-b border-staff-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-staff-fg">Entradas</p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, correo, teléfono o código…"
            className="w-full rounded-xl border border-staff-border bg-staff-raised px-4 py-2 text-sm text-staff-fg placeholder:text-staff-muted focus:outline-none focus:ring-2 focus:ring-primary-500 sm:max-w-xs"
            inputMode="search"
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChip(c.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                chip === c.id
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-staff-border text-staff-muted hover:text-staff-fg'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {msg && <p className="text-sm text-emerald-500">{msg}</p>}
      </div>

      <ul className="divide-y divide-staff-border">
        {!rows.length && (
          <li className="p-8 text-center text-sm text-staff-muted">{loading ? 'Cargando…' : 'No hay entradas'}</li>
        )}
        {rows.map((r) => {
          const st = STATUS[r.status]
          const open = openId === r.id
          const busy = busyId === r.id
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-staff-hover"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-staff-fg">{r.clientName}</p>
                  <p className="truncate text-xs text-staff-muted">
                    {r.status === 'USED' && r.usedAt
                      ? `Ingresó ${hnTime(r.usedAt)}${r.usedByName ? ` · ${r.usedByName}` : ''}`
                      : r.clientEmail}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs text-staff-muted">{ORIGIN_LABEL[r.origin]}</p>
                  <p className="text-[11px] text-staff-muted">{hnDateTime(r.createdAt)}</p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${st.pill}`}>{st.label}</span>
              </button>

              {open && (
                <div className="space-y-3 bg-staff-raised/50 px-4 pb-4 pt-1">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-staff-muted">Correo</dt>
                      <dd className="truncate text-staff-fg">{r.clientEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-staff-muted">Teléfono</dt>
                      <dd className="text-staff-fg">{r.clientPhone || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-staff-muted">Origen</dt>
                      <dd className="text-staff-fg">
                        {ORIGIN_LABEL[r.origin]}
                        {r.createdByName ? ` · ${r.createdByName}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-staff-muted">Precio</dt>
                      <dd className="text-staff-fg">L {r.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</dd>
                    </div>
                    <div>
                      <dt className="text-staff-muted">Vendida</dt>
                      <dd className="text-staff-fg">{hnDateTime(r.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-staff-muted">Envíos</dt>
                      <dd className="text-staff-fg">
                        {[r.emailSent && 'Correo', r.whatsappSent && 'WhatsApp'].filter(Boolean).join(' · ') || '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    {r.status !== 'CANCELLED' && (
                      <>
                        <ActionBtn onClick={() => actions.email(r)} disabled={busy}>
                          Correo
                        </ActionBtn>
                        {r.clientPhone && (
                          <ActionBtn onClick={() => actions.whatsapp(r)} disabled={busy}>
                            WhatsApp
                          </ActionBtn>
                        )}
                        <ActionBtn onClick={() => actions.print(r)} disabled={busy}>
                          Imprimir
                        </ActionBtn>
                      </>
                    )}
                    {r.status === 'ACTIVE' && canMarkUsed && (
                      <ActionBtn tone="success" onClick={() => actions.markUsed(r)} disabled={busy}>
                        Dar ingreso
                      </ActionBtn>
                    )}
                    {r.status === 'USED' && (
                      <ActionBtn tone="warning" onClick={() => actions.revert(r)} disabled={busy}>
                        Revertir ingreso
                      </ActionBtn>
                    )}
                    {r.status === 'ACTIVE' && (
                      <ActionBtn tone="danger" onClick={() => actions.cancel(r)} disabled={busy}>
                        Cancelar / reembolsar
                      </ActionBtn>
                    )}
                    {busy && <span className="self-center text-xs text-staff-muted">Procesando…</span>}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {cursor && (
        <div className="border-t border-staff-border p-3">
          <button
            type="button"
            onClick={() => void fetchPage(cursor)}
            disabled={loading}
            className="w-full rounded-xl py-2 text-sm font-semibold text-primary-500 hover:bg-staff-hover disabled:opacity-50"
          >
            {loading ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  children,
  tone = 'neutral',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const cls = {
    neutral: 'border-staff-border text-staff-fg hover:bg-staff-hover',
    success: 'border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10',
    warning: 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10',
    danger: 'border-red-500/40 text-red-500 hover:bg-red-500/10',
  }[tone]
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  )
}
