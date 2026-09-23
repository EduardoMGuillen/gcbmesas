'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { getReportData } from '@/lib/actions'
import { getCashReportPreview } from '@/lib/ops-actions'
import { formatCurrency, formatDate } from '@/lib/utils'

type ReportData = Awaited<ReturnType<typeof getReportData>>
type CashRow = Awaited<ReturnType<typeof getCashReportPreview>>[number]
type Register = { id: string; name: string }

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function weekAgoStr() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
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

export function ReportesClient({
  registers,
  initialTab = 'ventas',
}: {
  registers: Register[]
  initialTab?: 'ventas' | 'caja'
}) {
  const tab = initialTab

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          {tab === 'caja' ? 'Reportes de Caja' : 'Reportes'}
        </h1>
        <p className="text-sm text-dark-400">
          {tab === 'caja'
            ? 'Arqueos por fecha: fondo, ventas, contado y diferencia. Baja Excel de todo el rango o de un solo cierre.'
            : 'Genera reportes por rango de fechas y descarga en Excel.'}
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Link
          href="/admin/reportes"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'ventas' ? 'bg-primary-600 text-white' : 'bg-dark-100 border border-dark-200 text-white/70 hover:text-white'
          }`}
        >
          Ventas
        </Link>
        <Link
          href="/admin/reportes/caja"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'caja' ? 'bg-primary-600 text-white' : 'bg-dark-100 border border-dark-200 text-white/70 hover:text-white'
          }`}
        >
          Reportes de Caja
        </Link>
      </div>

      {tab === 'ventas' ? <VentasReport /> : <CajaReport registers={registers} />}
    </div>
  )
}

function VentasReport() {
  const [from, setFrom] = useState(weekAgoStr)
  const [to, setTo] = useState(todayStr)
  const [data, setData] = useState<ReportData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [downloading, setDownloading] = useState(false)

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const result = await getReportData(from, to)
        setData(result)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al generar reporte')
      }
    })
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadExcel(`/api/reportes?from=${from}&to=${to}`, `Reporte_${from}_${to}.xlsx`)
    } catch {
      alert('Error al descargar el reporte')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {isPending ? 'Generando...' : 'Generar reporte'}
          </button>
          {data && (
            <button
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {downloading ? 'Descargando...' : 'Descargar Excel'}
            </button>
          )}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <StatCard label="Total Ventas" value={formatCurrency(data.summary.totalSales)} highlight />
            <StatCard label="Pedidos" value={String(data.summary.totalOrders)} />
            <StatCard label="Rechazados" value={String(data.summary.rejectedOrders)} />
            <StatCard label="Cuentas Abiertas" value={String(data.summary.accountsOpened)} />
            <StatCard label="Cuentas Cerradas" value={String(data.summary.accountsClosed)} />
            <StatCard label="Promedio/Mesa" value={formatCurrency(data.summary.avgConsumption)} />
          </div>

          {data.dailyData.length > 0 && (
            <Section title="Ventas por Dia">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-2 px-3 text-white/70 font-medium">Fecha</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Ventas</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Pedidos</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Mesas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyData.map((d) => (
                      <tr key={d.date} className="border-b border-dark-200/50">
                        <td className="py-2 px-3 text-white">{d.date}</td>
                        <td className="py-2 px-3 text-primary-400 text-right font-medium">{formatCurrency(d.sales)}</td>
                        <td className="py-2 px-3 text-white/80 text-right">{d.orders}</td>
                        <td className="py-2 px-3 text-white/80 text-right">{d.tables}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {data.meseroData.length > 0 && (
            <Section title="Meseros">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-2 px-3 text-white/70 font-medium">#</th>
                      <th className="text-left py-2 px-3 text-white/70 font-medium">Mesero</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Mesas</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Ventas</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.meseroData.map((m, i) => (
                      <tr key={m.name + i} className="border-b border-dark-200/50">
                        <td className="py-2 px-3 text-white/50">{i + 1}</td>
                        <td className="py-2 px-3 text-white font-medium">{m.name}</td>
                        <td className="py-2 px-3 text-white/80 text-right">{m.tables}</td>
                        <td className="py-2 px-3 text-primary-400 text-right font-medium">{formatCurrency(m.sales)}</td>
                        <td className="py-2 px-3 text-white/80 text-right">{m.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {data.productData.length > 0 && (
            <Section title="Productos Mas Vendidos">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-2 px-3 text-white/70 font-medium">#</th>
                      <th className="text-left py-2 px-3 text-white/70 font-medium">Producto</th>
                      <th className="text-left py-2 px-3 text-white/70 font-medium">Categoria</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Cantidad</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.productData.map((p, i) => (
                      <tr key={p.name + i} className="border-b border-dark-200/50">
                        <td className="py-2 px-3 text-white/50">{i + 1}</td>
                        <td className="py-2 px-3 text-white font-medium">{p.name}</td>
                        <td className="py-2 px-3 text-white/60">{p.category}</td>
                        <td className="py-2 px-3 text-white/80 text-right">{p.quantity}</td>
                        <td className="py-2 px-3 text-primary-400 text-right font-medium">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {data.categoryData.length > 0 && (
            <Section title="Ventas por Categoria">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-2 px-3 text-white/70 font-medium">Categoria</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Cantidad</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categoryData.map((c) => (
                      <tr key={c.category} className="border-b border-dark-200/50">
                        <td className="py-2 px-3 text-white font-medium">{c.category}</td>
                        <td className="py-2 px-3 text-white/80 text-right">{c.quantity}</td>
                        <td className="py-2 px-3 text-primary-400 text-right font-medium">{formatCurrency(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {data.hourData.length > 0 && (
            <Section title="Horarios Pico">
              <div className="flex flex-wrap gap-2">
                {data.hourData.map((h) => {
                  const maxOrders = Math.max(...data.hourData.map((x) => x.orders))
                  const intensity = maxOrders > 0 ? h.orders / maxOrders : 0
                  return (
                    <div
                      key={h.hour}
                      className="flex flex-col items-center bg-dark-50 border border-dark-200 rounded-lg px-3 py-2 min-w-[60px]"
                    >
                      <span className="text-xs text-white/60">{String(h.hour).padStart(2, '0')}:00</span>
                      <span
                        className="text-lg font-bold"
                        style={{ color: `rgba(168, 130, 72, ${0.4 + intensity * 0.6})` }}
                      >
                        {h.orders}
                      </span>
                      <span className="text-[10px] text-white/40">pedidos</span>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </div>
      )}
    </>
  )
}

function CajaReport({ registers }: { registers: Register[] }) {
  const [from, setFrom] = useState(weekAgoStr)
  const [to, setTo] = useState(todayStr)
  const [registerId, setRegisterId] = useState('')
  const [rows, setRows] = useState<CashRow[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const [downloading, setDownloading] = useState('')

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const result = await getCashReportPreview(from, to, registerId || undefined)
        setRows(result)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'No se pudo cargar caja')
      }
    })
  }

  const downloadRange = async () => {
    setDownloading('range')
    try {
      const params = new URLSearchParams({ from, to })
      if (registerId) params.set('registerId', registerId)
      await downloadExcel(`/api/arqueos?${params.toString()}`, `Arqueos_${from}_${to}.xlsx`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo descargar')
    } finally {
      setDownloading('')
    }
  }

  const downloadOne = async (id: string, name: string) => {
    setDownloading(id)
    try {
      await downloadExcel(`/api/arqueos?sessionId=${encodeURIComponent(id)}`, `Arqueo_${name}.xlsx`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo descargar')
    } finally {
      setDownloading('')
    }
  }

  const closed = rows?.filter((r) => r.status !== 'OPEN') || []
  const declared = closed.reduce((s, r) => s + r.declaredTotal, 0)
  const system = closed.reduce((s, r) => s + (r.systemTotal || 0), 0)
  const diff = closed.reduce((s, r) => s + (r.difference || 0), 0)

  return (
    <>
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Caja</label>
            <select
              value={registerId}
              onChange={(e) => setRegisterId(e.target.value)}
              className="px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[160px]"
            >
              <option value="">Todas</option>
              {registers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || !from || !to}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {isPending ? 'Cargando...' : 'Ver arqueos'}
          </button>
          <button
            type="button"
            onClick={() => void downloadRange()}
            disabled={downloading === 'range' || !from || !to}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {downloading === 'range' ? 'Descargando...' : 'Excel del rango'}
          </button>
        </div>
      </div>

      {rows && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Cierres" value={String(closed.length)} />
            <StatCard label="Declarado" value={formatCurrency(declared)} highlight />
            <StatCard label="Sistema" value={formatCurrency(system)} />
            <StatCard label="Sobrante / faltante" value={formatCurrency(diff)} />
          </div>

          {rows.length === 0 ? (
            <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center text-white/40">
              No hay sesiones de caja en ese rango.
            </div>
          ) : (
            <Section title="Arqueos">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-2 px-3 text-white/70 font-medium">Caja</th>
                      <th className="text-left py-2 px-3 text-white/70 font-medium">Estado</th>
                      <th className="text-left py-2 px-3 text-white/70 font-medium">Apertura</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Fondo</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Declarado</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Sistema</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Dif.</th>
                      <th className="text-right py-2 px-3 text-white/70 font-medium">Cuentas</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-dark-200/50">
                        <td className="py-2 px-3 text-white font-medium">{r.registerName}</td>
                        <td className="py-2 px-3 text-white/80">{r.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</td>
                        <td className="py-2 px-3 text-white/80 whitespace-nowrap">{formatDate(r.openedAt)}</td>
                        <td className="py-2 px-3 text-white/80 text-right">{formatCurrency(r.openingFloat)}</td>
                        <td className="py-2 px-3 text-primary-400 text-right font-medium">
                          {formatCurrency(r.declaredTotal)}
                        </td>
                        <td className="py-2 px-3 text-white/80 text-right">
                          {r.systemTotal == null ? '—' : formatCurrency(r.systemTotal)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-medium ${
                            r.difference == null
                              ? 'text-white/40'
                              : r.difference === 0
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                          }`}
                        >
                          {r.difference == null ? '—' : formatCurrency(r.difference)}
                        </td>
                        <td className="py-2 px-3 text-white/80 text-right">{r.accounts}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            disabled={downloading === r.id}
                            onClick={() => void downloadOne(r.id, r.registerName)}
                            className="text-xs px-3 py-1.5 bg-dark-50 hover:bg-dark-200 text-white/70 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {downloading === r.id ? 'Bajando…' : 'Excel'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </div>
      )}
    </>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-dark-100 border border-dark-200 rounded-xl p-3 sm:p-4">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className={`text-lg sm:text-xl font-bold ${highlight ? 'text-primary-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}
