'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setEntrySaleNotificationsEnabled } from '@/lib/actions'
import { EventGrid } from './_components/EventGrid'
import { EventPanel } from './_components/EventPanel'
import { EventForm } from './_components/EventForm'
import { SellEntry } from './_components/SellEntry'
import type { EventItem } from './_components/types'

interface EntradasClientProps {
  events: EventItem[]
  /** Cliente externo: sin crear/editar eventos ni dar ingreso */
  isTicketeraClient?: boolean
  /** Preferencia del usuario actual (solo ADMIN gestiona el interruptor) */
  entrySaleNotificationsEnabled?: boolean
  canManageEntrySaleNotifications?: boolean
  /** Abrir directamente el panel de este evento (?evento=<id>) */
  initialEventId?: string
}

type View =
  | { kind: 'grid' }
  | { kind: 'event'; id: string }
  | { kind: 'sell'; eventId?: string; back: View }
  | { kind: 'form'; eventId: string | null; back: View }

export function EntradasClient({
  events,
  isTicketeraClient = false,
  entrySaleNotificationsEnabled = false,
  canManageEntrySaleNotifications = false,
  initialEventId,
}: EntradasClientProps) {
  const router = useRouter()
  const [view, setView] = useState<View>(() =>
    initialEventId && events.some((e) => e.id === initialEventId) ? { kind: 'event', id: initialEventId } : { kind: 'grid' }
  )
  const [notifyPending, setNotifyPending] = useState(false)
  const canManage = !isTicketeraClient
  const activeEvents = events.filter((e) => e.isActive)
  const byId = (id: string) => events.find((e) => e.id === id) ?? null

  // Si el evento abierto desaparece (p. ej. se eliminó), volver a la grilla.
  useEffect(() => {
    if (view.kind === 'event' && !byId(view.id)) setView({ kind: 'grid' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, view])

  // Volver arriba al cambiar de vista
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view.kind])

  const toggleNotify = async () => {
    setNotifyPending(true)
    try {
      await setEntrySaleNotificationsEnabled(!entrySaleNotificationsEnabled)
      router.refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'No se pudo guardar la preferencia')
    } finally {
      setNotifyPending(false)
    }
  }

  if (view.kind === 'sell') {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setView(view.back)} />
        <SellEntry events={activeEvents} initialEventId={view.eventId ?? ''} />
      </div>
    )
  }

  if (view.kind === 'form') {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setView(view.back)} />
        <EventForm
          event={view.eventId ? byId(view.eventId) : null}
          onDone={() => setView(view.back)}
        />
      </div>
    )
  }

  if (view.kind === 'event') {
    const ev = byId(view.id)
    if (!ev) return null
    return (
      <EventPanel
        key={ev.id}
        event={ev}
        canManage={canManage}
        onBack={() => setView({ kind: 'grid' })}
        onSell={() => setView({ kind: 'sell', eventId: ev.id, back: view })}
        onEdit={() => setView({ kind: 'form', eventId: ev.id, back: view })}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView({ kind: 'sell', back: view })}
          disabled={!activeEvents.length}
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          + Vender entrada
        </button>
        {canManage && (
          <>
            <button
              type="button"
              onClick={() => setView({ kind: 'form', eventId: null, back: view })}
              className="rounded-xl border border-staff-border bg-staff-surface px-4 py-2.5 text-sm font-semibold text-staff-fg hover:bg-staff-hover"
            >
              Nuevo evento
            </button>
            <Link
              href="/taquilla"
              className="rounded-xl border border-staff-border bg-staff-surface px-4 py-2.5 text-sm font-semibold text-staff-fg hover:bg-staff-hover"
            >
              Abrir taquilla
            </Link>
          </>
        )}
        {canManageEntrySaleNotifications && (
          <button
            type="button"
            onClick={() => void toggleNotify()}
            disabled={notifyPending}
            title="Notificación push cuando se venda una entrada (en línea o en taquilla)"
            className={`ml-auto flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              entrySaleNotificationsEnabled
                ? 'border-primary-500/50 bg-primary-500/10 text-primary-500'
                : 'border-staff-border text-staff-muted hover:text-staff-fg'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notifyPending ? 'Guardando…' : entrySaleNotificationsEnabled ? 'Alertas activadas' : 'Alertas de venta'}
          </button>
        )}
      </div>

      <EventGrid events={events} onOpen={(id) => setView({ kind: 'event', id })} />
    </div>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2 py-1 text-sm font-semibold text-staff-muted hover:bg-staff-hover hover:text-staff-fg"
    >
      ← Volver
    </button>
  )
}
