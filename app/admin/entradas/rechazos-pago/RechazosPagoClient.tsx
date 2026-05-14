'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { ONLINE_PAYMENT_REJECTION_REASON_LABELS } from '@/lib/online-payment-rejection'

type EventOpt = { id: string; name: string; date: Date }
type Row = {
  id: string
  createdAt: Date | string
  source: string
  httpStatus: number
  reasonCategory: string
  friendlyMessage: string
  rawMessage: string
  eventId: string | null
  paymentReference: string | null
  clientEmail: string | null
  event: EventOpt | null
}

export function RechazosPagoClient({
  rows,
  eventOptions,
  initialMotivo,
  initialEvento,
  initialRef,
}: {
  rows: Row[]
  eventOptions: EventOpt[]
  initialMotivo: string
  initialEvento: string
  initialRef: string
}) {
  const router = useRouter()
  const [motivo, setMotivo] = useState(initialMotivo)
  const [evento, setEvento] = useState(initialEvento)
  const [ref, setRef] = useState(initialRef)

  const applyFilters = useCallback(() => {
    const p = new URLSearchParams()
    if (motivo) p.set('motivo', motivo)
    if (evento) p.set('evento', evento)
    if (ref.trim()) p.set('ref', ref.trim())
    const q = p.toString()
    router.push(q ? `/admin/entradas/rechazos-pago?${q}` : '/admin/entradas/rechazos-pago')
  }, [motivo, evento, ref, router])

  const clearFilters = useCallback(() => {
    setMotivo('')
    setEvento('')
    setRef('')
    router.push('/admin/entradas/rechazos-pago')
  }, [router])

  return (
    <div className="space-y-6">
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4">
        <p className="text-sm text-dark-300 mb-3">
          Filtra por <strong className="text-white">motivo</strong> (clasificación automática), evento o referencia de
          pago. El detalle técnico queda en &quot;Mensaje bruto&quot; para soporte.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1">Motivo (por qué)</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2.5 bg-dark-50 border border-dark-200 rounded-lg text-white text-sm"
            >
              <option value="">Todos</option>
              {Object.entries(ONLINE_PAYMENT_REJECTION_REASON_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1">Evento</label>
            <select
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
              className="w-full px-3 py-2.5 bg-dark-50 border border-dark-200 rounded-lg text-white text-sm"
            >
              <option value="">Todos</option>
              {eventOptions.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1">Referencia (contiene)</label>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="CS-…"
              className="w-full px-3 py-2.5 bg-dark-50 border border-dark-200 rounded-lg text-white text-sm placeholder:text-dark-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2.5 rounded-lg border border-dark-200 text-dark-300 hover:text-white text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-dark-200 bg-dark-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-dark-200 text-left text-dark-400">
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Motivo</th>
              <th className="p-3 font-medium">HTTP</th>
              <th className="p-3 font-medium">Origen</th>
              <th className="p-3 font-medium">Evento</th>
              <th className="p-3 font-medium">Ref.</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium min-w-[220px]">Mensaje al usuario</th>
              <th className="p-3 font-medium min-w-[200px]">Mensaje bruto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-dark-400">
                  No hay rechazos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-dark-200/80 align-top hover:bg-dark-50/50">
                  <td className="p-3 text-dark-300 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="p-3 text-white">
                    {ONLINE_PAYMENT_REJECTION_REASON_LABELS[r.reasonCategory] || r.reasonCategory}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                        r.httpStatus >= 500
                          ? 'bg-red-900/40 text-red-200'
                          : r.httpStatus >= 400
                            ? 'bg-amber-900/40 text-amber-200'
                            : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {r.httpStatus}
                    </span>
                  </td>
                  <td className="p-3 text-dark-300 font-mono text-xs">{r.source}</td>
                  <td className="p-3 text-dark-200 max-w-[160px]">{r.event?.name || '—'}</td>
                  <td className="p-3 text-dark-300 font-mono text-xs break-all max-w-[140px]">
                    {r.paymentReference || '—'}
                  </td>
                  <td className="p-3 text-dark-300 text-xs break-all max-w-[140px]">{r.clientEmail || '—'}</td>
                  <td className="p-3 text-white text-xs leading-relaxed">{r.friendlyMessage}</td>
                  <td className="p-3 text-dark-400 text-xs leading-relaxed max-w-md">{r.rawMessage}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
