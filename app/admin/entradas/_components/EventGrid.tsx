'use client'

import { useMemo, useState } from 'react'
import type { EventItem } from './types'

type Scope = 'active' | 'past' | 'all'

export const fmtEventDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(d).toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC', ...opts })

export const fmtLps = (n: number) =>
  `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

function Bar({ value, max, tone }: { value: number; max: number; tone: 'primary' | 'emerald' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-staff-raised">
      <div
        className={`h-full rounded-full ${tone === 'primary' ? 'bg-primary-500' : 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function EventGrid({ events, onOpen }: { events: EventItem[]; onOpen: (id: string) => void }) {
  const [scope, setScope] = useState<Scope>('active')
  const [q, setQ] = useState('')
  const [venue, setVenue] = useState('')

  const venues = useMemo(
    () =>
      Array.from(new Set(events.map((e) => e.venueName?.trim()).filter((v): v is string => !!v))).sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    [events]
  )

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return events
      .filter((e) => (scope === 'active' ? e.isActive : scope === 'past' ? !e.isActive : true))
      .filter((e) => !venue || (e.venueName?.trim() || '') === venue)
      .filter((e) => !needle || e.name.toLowerCase().includes(needle))
      .sort((a, b) => {
        const da = new Date(a.date).getTime()
        const db = new Date(b.date).getTime()
        // Activos: el más próximo primero. Pasados: el más reciente primero.
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return a.isActive ? da - db : db - da
      })
  }, [events, scope, venue, q])

  const counts = {
    active: events.filter((e) => e.isActive).length,
    past: events.filter((e) => !e.isActive).length,
    all: events.length,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-xl bg-staff-raised p-1">
          {(
            [
              ['active', 'Activos'],
              ['past', 'Pasados'],
              ['all', 'Todos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setScope(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                scope === id ? 'bg-staff-surface text-staff-fg shadow-sm' : 'text-staff-muted hover:text-staff-fg'
              }`}
            >
              {label} <span className="ml-0.5 text-xs font-normal opacity-70">{counts[id]}</span>
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar evento…"
          className="flex-1 rounded-xl border border-staff-border bg-staff-surface px-4 py-2 text-sm text-staff-fg placeholder:text-staff-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {venues.length > 1 && (
          <select
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="rounded-xl border border-staff-border bg-staff-surface px-3 py-2 text-sm text-staff-fg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos los lugares</option>
            {venues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-staff-border p-10 text-center text-sm text-staff-muted">
          {events.length ? 'Ningún evento coincide.' : 'Todavía no hay eventos.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((ev) => {
            const sold = ev.entriesSoldSum
            const used = ev.entriesUsedSum ?? 0
            const usedPct = sold ? Math.round((used / sold) * 100) : 0
            const cap = ev.maxEntries != null && ev.maxEntries >= 1 ? ev.maxEntries : null
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onOpen(ev.id)}
                className={`group flex gap-3 rounded-2xl border border-staff-border bg-staff-surface p-3 text-left transition hover:border-primary-500/60 hover:shadow-md ${
                  ev.isActive ? '' : 'opacity-70'
                }`}
              >
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-staff-raised">
                  {ev.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-black text-staff-muted">
                      {ev.name.charAt(0)}
                    </div>
                  )}
                  {ev.isFeatured && (
                    <span className="absolute left-1 top-1 rounded bg-amber-400 px-1 text-[10px] font-bold text-black">★</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-staff-fg group-hover:text-primary-500">{ev.name}</p>
                    {!ev.isActive && (
                      <span className="shrink-0 rounded-md bg-staff-raised px-1.5 py-0.5 text-[10px] font-semibold text-staff-muted">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-staff-muted">
                    {fmtEventDate(ev.date)}
                    {ev.venueName ? ` · ${ev.venueName}` : ''}
                  </p>

                  <div className="mt-2.5 space-y-2">
                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-staff-muted">Vendidas</span>
                        <span className="font-semibold tabular-nums text-staff-fg">
                          {sold}
                          {cap ? <span className="font-normal text-staff-muted"> / {cap}</span> : null}
                        </span>
                      </div>
                      <Bar value={sold} max={cap ?? Math.max(sold, 1)} tone="primary" />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-staff-muted">Ingresaron</span>
                        <span className="font-semibold tabular-nums text-staff-fg">
                          {used} <span className="font-normal text-staff-muted">· {usedPct}%</span>
                        </span>
                      </div>
                      <Bar value={used} max={sold} tone="emerald" />
                    </div>
                  </div>
                  {ev.revenueLps != null && ev.revenueLps > 0 && (
                    <p className="mt-2 text-xs font-semibold text-primary-500">{fmtLps(ev.revenueLps)}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
