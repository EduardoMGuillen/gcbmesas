'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setPrepRoutingAdmin, clearPrepRoutingAdmin } from '@/lib/actions'

type Row = { category: string; station: 'COCINA' | 'BAR' | null }

export function ComandasRoutingClient({
  initialKeys,
  initialAssignments,
  initialUseGlobal,
}: {
  initialKeys: string[]
  initialAssignments: Row[]
  initialUseGlobal: boolean
}) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(initialAssignments)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

  useEffect(() => {
    setRows(initialAssignments)
  }, [initialAssignments])

  const label = (k: string) => (k === '__NONE__' ? 'Sin categoría' : k)

  const dirty = useMemo(() => {
    return JSON.stringify(rows) !== JSON.stringify(initialAssignments)
  }, [rows, initialAssignments])

  const save = () => {
    start(async () => {
      try {
        setMsg('')
        const assignments = rows
          .filter((r) => r.station !== null)
          .map((r) => ({ category: r.category, station: r.station! }))
        await setPrepRoutingAdmin(assignments)
        setMsg('Guardado. Cocina y bar usan ahora estas rutas.')
        router.refresh()
      } catch (e: any) {
        setMsg(e?.message || 'Error al guardar')
      }
    })
  }

  const clear = () => {
    if (!confirm('¿Quitar el enrutado global? Cocina y bar volverán a elegir categorías por usuario.')) return
    start(async () => {
      try {
        setMsg('')
        await clearPrepRoutingAdmin()
        setRows(initialKeys.map((k) => ({ category: k, station: null })))
        setMsg('Enrutado global desactivado.')
        router.refresh()
      } catch (e: any) {
        setMsg(e?.message || 'Error')
      }
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      {initialUseGlobal && (
        <p className="text-sm text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
          Enrutado global <strong>activo</strong>: cada categoría va solo a cocina o solo a bar. Los usuarios de cocina/bar
          ya no eligen categorías en su pantalla.
        </p>
      )}
      {!initialUseGlobal && (
        <p className="text-sm text-white/60 bg-dark-100 border border-dark-200 rounded-lg px-4 py-3">
          Modo <strong>por usuario</strong>: cocina y bar marcan en su pantalla qué categorías quieren ver (como antes).
          Al guardar al menos una categoría aquí abajo, pasa a enrutado global.
        </p>
      )}

      <div className="bg-dark-100 border border-dark-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Categoría → estación</h2>
          <span className="text-xs text-white/45">{initialKeys.length} categorías</span>
        </div>
        <ul className="divide-y divide-dark-200 max-h-[60vh] overflow-y-auto">
          {rows.map((r, i) => (
            <li key={r.category} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <span className="text-white font-medium flex-1 min-w-0">{label(r.category)}</span>
              <select
                value={r.station ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setRows((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, station: v === '' ? null : (v as 'COCINA' | 'BAR') } : x
                    )
                  )
                }}
                className="sm:w-56 w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white text-sm"
              >
                <option value="">Sin asignar (no aparece en comandas)</option>
                <option value="COCINA">Cocina</option>
                <option value="BAR">Bar</option>
              </select>
            </li>
          ))}
        </ul>
      </div>

      {msg && (
        <p className={`text-sm px-1 ${msg.startsWith('Error') || msg.includes('Error') ? 'text-red-400' : 'text-primary-300'}`}>
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => void save()}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-500 disabled:opacity-40"
        >
          {pending ? 'Guardando…' : 'Guardar enrutado'}
        </button>
        <button
          type="button"
          disabled={pending || !initialUseGlobal}
          onClick={() => void clear()}
          className="px-5 py-2.5 rounded-xl border border-dark-200 text-white/80 text-sm hover:bg-dark-200 disabled:opacity-40"
        >
          Quitar enrutado global
        </button>
      </div>
    </div>
  )
}
