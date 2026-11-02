'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getDoorStats,
  scanEntryAtDoor,
  searchEventEntries,
  type DoorScanResult,
  type EventEntryRow,
} from '@/lib/actions'
import { isRepeatScan, type LastMarked } from '@/lib/entry-scan'
import { QrScanner } from '@/components/entries/QrScanner'
import { HourBars } from '@/components/entries/HourBars'

type ActiveEvent = {
  id: string
  name: string
  date: string | Date
  venueName: string | null
  venueAddress: string | null
}

type DoorStats = Awaited<ReturnType<typeof getDoorStats>>
type ResultKind = DoorScanResult['kind'] | 'repeat' | 'error'
type ScanOutcome = { kind: ResultKind; result?: DoorScanResult; message?: string }

const AUTO_CLOSE_VALID_MS = 2000
const STATS_REFRESH_MS = 30_000

const timeHn = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString('es-HN', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Tegucigalpa' })
    : ''

const OUTCOME_STYLE: Record<ResultKind, { bg: string; icon: string; title: string }> = {
  valid: { bg: 'bg-emerald-600', icon: '✓', title: 'PASA' },
  repeat: { bg: 'bg-amber-500', icon: '↻', title: 'ESCANEO REPETIDO' },
  used: { bg: 'bg-red-600', icon: '✕', title: 'YA USADA' },
  cancelled: { bg: 'bg-red-600', icon: '✕', title: 'CANCELADA' },
  wrong_event: { bg: 'bg-red-600', icon: '✕', title: 'OTRO EVENTO' },
  not_found: { bg: 'bg-red-600', icon: '?', title: 'NO EXISTE' },
  error: { bg: 'bg-zinc-700', icon: '!', title: 'ERROR' },
}

function outcomeDetail(o: ScanOutcome): string {
  const e = o.result?.entry
  switch (o.kind) {
    case 'valid':
      return 'Ingreso registrado'
    case 'repeat':
      return 'Se acaba de marcar en este dispositivo. Si ya pasó, no hay que hacer nada.'
    case 'used':
      return e?.usedAt
        ? `Ingresó a las ${timeHn(e.usedAt)}${e.usedByName ? ` · escaneó ${e.usedByName}` : ''}`
        : 'Esta entrada ya fue utilizada'
    case 'cancelled':
      return 'Entrada cancelada. No permitir ingreso.'
    case 'wrong_event':
      return `Es de "${o.result?.eventName ?? 'otro evento'}"`
    case 'not_found':
      return 'Verifica el código QR'
    default:
      return o.message || 'Intenta de nuevo'
  }
}

function vibrateFor(kind: ResultKind) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  if (kind === 'valid') navigator.vibrate(80)
  else if (kind === 'repeat') navigator.vibrate([60, 60, 60])
  else navigator.vibrate([200, 80, 200, 80, 200])
}

const STATUS_BADGE: Record<EventEntryRow['status'], { label: string; cls: string }> = {
  ACTIVE: { label: 'Falta', cls: 'bg-sky-500/15 text-sky-500' },
  USED: { label: 'Ingresó', cls: 'bg-emerald-500/15 text-emerald-500' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-red-500/15 text-red-500' },
}

// ─────────────────────────────────────────────────────────────

export function TaquillaScanClient({ events }: { events: ActiveEvent[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [tab, setTab] = useState<'scan' | 'history'>('scan')
  const [stats, setStats] = useState<DoorStats | null>(null)
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null)
  const lastMarkedRef = useRef<LastMarked>(null)
  const event = useMemo(() => events.find((e) => e.id === eventId) ?? null, [events, eventId])

  const refreshStats = useCallback(async () => {
    if (!eventId) return
    try {
      setStats(await getDoorStats(eventId))
    } catch {
      // se reintenta en el próximo ciclo
    }
  }, [eventId])

  useEffect(() => {
    setStats(null)
    void refreshStats()
    const t = setInterval(() => void refreshStats(), STATS_REFRESH_MS)
    return () => clearInterval(t)
  }, [refreshStats])

  // Verde se cierra solo; el resto requiere un toque.
  useEffect(() => {
    if (outcome?.kind !== 'valid') return
    const t = setTimeout(() => setOutcome(null), AUTO_CLOSE_VALID_MS)
    return () => clearTimeout(t)
  }, [outcome])

  /** Procesa un token (de la cámara o de la búsqueda). */
  const processToken = useCallback(
    async (token: string) => {
      if (!eventId) return
      const show = (o: ScanOutcome) => {
        vibrateFor(o.kind)
        setOutcome(o)
      }
      try {
        const result = await scanEntryAtDoor(token, eventId)
        if (result.kind === 'valid' && result.entry) {
          lastMarkedRef.current = { entryId: result.entry.id, at: new Date() }
        }
        const repeat =
          result.kind === 'used' && !!result.entry && isRepeatScan(lastMarkedRef.current, result.entry.id, new Date())
        show({ kind: repeat ? 'repeat' : result.kind, result })
        if (result.kind === 'valid') void refreshStats()
      } catch (err) {
        show({ kind: 'error', message: err instanceof Error ? err.message : 'No se pudo validar' })
      }
    },
    [eventId, refreshStats]
  )

  if (!events.length) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-lg font-semibold text-staff-fg">No hay eventos activos</p>
        <p className="mt-1 text-sm text-staff-muted">Cuando haya un evento hoy o mañana aparecerá aquí.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <DoorHeader events={events} eventId={eventId} onEventChange={setEventId} stats={stats} />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-staff-raised p-1" role="tablist">
        {(
          [
            ['scan', 'Escanear'],
            ['history', 'Historial'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === id ? 'bg-staff-surface text-staff-fg shadow-sm' : 'text-staff-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'scan' ? (
        <div className="space-y-4">
          <QrScanner onDecode={processToken} paused={!!outcome} />
          <QuickSearch eventId={eventId} onMark={(row) => processToken(row.qrToken)} />
        </div>
      ) : (
        event && <HistoryPanel event={event} stats={stats} />
      )}

      {outcome && <OutcomeOverlay outcome={outcome} onClose={() => setOutcome(null)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function DoorHeader({
  events,
  eventId,
  onEventChange,
  stats,
}: {
  events: ActiveEvent[]
  eventId: string
  onEventChange: (id: string) => void
  stats: DoorStats | null
}) {
  const current = events.find((e) => e.id === eventId)
  const pct = stats?.usedPct ?? 0

  return (
    <div className="rounded-2xl border border-staff-border bg-staff-surface p-4">
      {events.length > 1 ? (
        <select
          value={eventId}
          onChange={(e) => onEventChange(e.target.value)}
          className="w-full truncate bg-transparent text-lg font-bold text-staff-fg focus:outline-none"
          aria-label="Evento"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      ) : (
        <p className="truncate text-lg font-bold text-staff-fg">{current?.name}</p>
      )}

      <div className="mt-3 flex items-end justify-between">
        <p className="text-4xl font-black leading-none tabular-nums text-staff-fg">
          {stats ? stats.used : '—'}
          <span className="ml-1 text-lg font-semibold text-staff-muted">/ {stats ? stats.sold : '—'}</span>
        </p>
        <p className="text-sm font-semibold text-primary-500">{stats ? `${pct}%` : ''}</p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-staff-raised">
        <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-staff-muted">
        {stats ? (
          <>
            <span className="font-semibold text-staff-fg">{stats.used}</span> ingresaron ·{' '}
            <span className="font-semibold text-staff-fg">{stats.pending}</span> faltan
            {stats.capacity ? ` · cupo ${stats.capacity}` : ''}
          </>
        ) : (
          'Cargando…'
        )}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function QuickSearch({ eventId, onMark }: { eventId: string; onMark: (row: EventEntryRow) => Promise<void> }) {
  const [q, setQ] = useState('')
  const debounced = useDebounced(q.trim(), 300)
  const [rows, setRows] = useState<EventEntryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (debounced.length < 2) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const res = await searchEventEntries({ eventId, q: debounced })
      setRows(res.rows.slice(0, 8))
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [eventId, debounced])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="rounded-2xl border border-staff-border bg-staff-surface p-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-staff-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setConfirmId(null)
          }}
          placeholder="¿No lee el QR? Busca por nombre, correo o código"
          className="w-full rounded-xl bg-staff-raised py-3 pl-9 pr-9 text-sm text-staff-fg placeholder:text-staff-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
          inputMode="search"
          autoComplete="off"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Limpiar"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-staff-muted"
          >
            ✕
          </button>
        )}
      </div>

      {debounced.length >= 2 && (
        <ul className="mt-2 divide-y divide-staff-border">
          {loading && !rows.length && <li className="py-3 text-center text-xs text-staff-muted">Buscando…</li>}
          {!loading && !rows.length && <li className="py-3 text-center text-xs text-staff-muted">Sin resultados</li>}
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-staff-fg">{r.clientName}</p>
                <p className="truncate text-xs text-staff-muted">
                  {r.status === 'USED' && r.usedAt ? `Ingresó ${timeHn(r.usedAt)}` : r.clientEmail}
                </p>
              </div>
              {r.status === 'ACTIVE' ? (
                confirmId === r.id ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmId(null)
                      await onMark(r)
                      await load()
                    }}
                    className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Confirmar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(r.id)}
                    className="shrink-0 rounded-lg border border-emerald-500/50 px-3 py-2 text-xs font-bold text-emerald-500"
                  >
                    Dar ingreso
                  </button>
                )
              ) : (
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${STATUS_BADGE[r.status].cls}`}>
                  {STATUS_BADGE[r.status].label}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function OutcomeOverlay({ outcome, onClose }: { outcome: ScanOutcome; onClose: () => void }) {
  const st = OUTCOME_STYLE[outcome.kind]
  const entry = outcome.result?.entry
  return (
    <button
      type="button"
      onClick={onClose}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-center text-white ${st.bg}`}
      aria-live="assertive"
    >
      <span className="text-[7rem] font-black leading-none">{st.icon}</span>
      <span className="mt-2 text-4xl font-black tracking-wide">{st.title}</span>
      {entry && <span className="mt-6 max-w-full break-words text-2xl font-bold">{entry.clientName}</span>}
      <span className="mt-2 max-w-sm text-lg font-medium text-white/90">{outcomeDetail(outcome)}</span>
      <span className="absolute bottom-10 text-sm font-semibold text-white/70">
        {outcome.kind === 'valid' ? 'Continúa escaneando…' : 'Toca para continuar'}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────

type Chip = { id: string; label: string; status?: 'ACTIVE' | 'USED' | 'CANCELLED'; origin?: 'online' | 'taquilla' }
const CHIPS: Chip[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Faltan', status: 'ACTIVE' },
  { id: 'used', label: 'Ingresaron', status: 'USED' },
  { id: 'cancelled', label: 'Canceladas', status: 'CANCELLED' },
  { id: 'online', label: 'Online', origin: 'online' },
  { id: 'taquilla', label: 'Taquilla', origin: 'taquilla' },
]

function HistoryPanel({ event, stats }: { event: ActiveEvent; stats: DoorStats | null }) {
  const [chip, setChip] = useState('all')
  const [q, setQ] = useState('')
  const debounced = useDebounced(q.trim(), 350)
  const [rows, setRows] = useState<EventEntryRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [resendingId, setResendingId] = useState<string | null>(null)
  const active = CHIPS.find((c) => c.id === chip) ?? CHIPS[0]

  const fetchPage = useCallback(
    async (after?: string) => {
      setLoading(true)
      setError('')
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

  const resend = async (r: EventEntryRow) => {
    setResendingId(r.id)
    setMsg('')
    setError('')
    try {
      const res = await fetch('/api/send-entry-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [{ entryId: r.id, qrToken: r.qrToken, clientName: r.clientName }],
          clientEmail: r.clientEmail,
          eventName: event.name,
          eventDate: String(event.date),
          totalPrice: r.totalPrice,
          venueName: event.venueName ?? undefined,
          venueAddress: event.venueAddress ?? undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || 'Error al enviar correo')
      setMsg(`QR reenviado a ${r.clientEmail}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reenviar')
    } finally {
      setResendingId(null)
    }
  }

  const peak = stats?.checkinsByHour.length
    ? stats.checkinsByHour.reduce((a, b) => (b.count > a.count ? b : a))
    : null

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-staff-border bg-staff-surface p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-staff-fg">Ingreso por hora</p>
          {peak && <p className="text-xs text-staff-muted">pico: {peak.label}</p>}
        </div>
        <HourBars buckets={stats?.checkinsByHour ?? []} emptyText="Aún no hay ingresos" />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChip(c.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              chip === c.id
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-staff-border bg-staff-surface text-staff-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar nombre, correo, teléfono…"
        className="w-full rounded-xl border border-staff-border bg-staff-surface px-4 py-3 text-sm text-staff-fg placeholder:text-staff-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
        inputMode="search"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
      {msg && <p className="text-sm text-emerald-500">{msg}</p>}

      <ul className="divide-y divide-staff-border overflow-hidden rounded-2xl border border-staff-border bg-staff-surface">
        {!rows.length && !loading && <li className="p-6 text-center text-sm text-staff-muted">No hay entradas</li>}
        {!rows.length && loading && <li className="p-6 text-center text-sm text-staff-muted">Cargando…</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                r.status === 'USED' ? 'bg-emerald-500' : r.status === 'ACTIVE' ? 'bg-sky-500' : 'bg-red-500'
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-staff-fg">{r.clientName}</p>
              <p className="truncate text-xs text-staff-muted">
                {r.status === 'USED'
                  ? `Ingresó ${timeHn(r.usedAt) || '—'}${r.usedByName ? ` · ${r.usedByName}` : ''}`
                  : r.status === 'CANCELLED'
                    ? 'Cancelada'
                    : r.clientEmail}
                {' · '}
                {r.origin === 'online' ? 'Online' : r.origin === 'cortesia' ? 'Cortesía' : 'Taquilla'}
              </p>
            </div>
            {r.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => void resend(r)}
                disabled={resendingId === r.id}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-500 hover:bg-staff-hover disabled:opacity-50"
              >
                {resendingId === r.id ? 'Enviando…' : 'Reenviar'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {cursor && (
        <button
          type="button"
          onClick={() => void fetchPage(cursor)}
          disabled={loading}
          className="w-full rounded-xl border border-staff-border bg-staff-surface py-3 text-sm font-semibold text-staff-fg disabled:opacity-50"
        >
          {loading ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </div>
  )
}
