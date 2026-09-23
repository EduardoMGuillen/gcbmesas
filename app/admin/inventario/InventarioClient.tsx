'use client'

import { useMemo, useState, useTransition } from 'react'
import type { StockItem, StockLocation } from '@prisma/client'
import {
  adjustStock,
  importStockFromExcelSnapshot,
  transferStock,
  upsertStockItem,
} from '@/lib/ops-actions'
import { STOCK_CATEGORIES, STOCK_LOCATION_LABELS } from '@/lib/ops-constants'
import { Badge, PageHeader, Panel, StaffButton, StaffTabs } from '@/components/staff/ui'
import { ProductsList } from '@/components/ProductsList'
import { useRouter } from 'next/navigation'

type StockForm = {
  id?: string
  name: string
  presentation?: string | null
  category?: string | null
  supplier?: string | null
  supplierPhone?: string | null
  location: StockLocation
  quantity: number
  cost?: number | null
  expiresAt?: string | null
  notes?: string | null
}

const LOCATIONS = Object.keys(STOCK_LOCATION_LABELS) as StockLocation[]

function qty(v: unknown) {
  return Number(v || 0)
}

function toDateInput(d: Date | string | null | undefined) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 10)
}

export function InventarioClient({
  products,
  stock,
}: {
  products: unknown[]
  stock: StockItem[]
}) {
  const [tab, setTab] = useState<'menu' | 'stock'>('stock')
  const [filter, setFilter] = useState<StockLocation | 'ALL'>('ALL')
  const [q, setQ] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<StockForm | null>(null)
  const router = useRouter()

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return stock.filter((s) => {
      if (filter !== 'ALL' && s.location !== filter) return false
      if (!term) return true
      return [s.name, s.presentation, s.supplier, s.category, s.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [stock, filter, q])

  const merma = stock.filter((s) => s.location === 'MERMA')
  const expiring = stock.filter((s) => {
    if (!s.expiresAt || s.location === 'MERMA') return false
    return new Date(s.expiresAt).getTime() <= Date.now() + 14 * 86400000
  })

  const importSeed = () => {
    setError('')
    start(async () => {
      try {
        const r = await importStockFromExcelSnapshot()
        alert(`Se cargaron ${r.imported} ítems del Excel.`)
        router.refresh()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo importar')
      }
    })
  }

  const saveItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing?.name || editing.location == null) return
    setError('')
    start(async () => {
      try {
        await upsertStockItem({
          id: editing.id,
          name: editing.name,
          presentation: editing.presentation,
          category: editing.category,
          supplier: editing.supplier,
          supplierPhone: editing.supplierPhone,
          location: editing.location,
          quantity: Number(editing.quantity ?? 0),
          cost: editing.cost ?? null,
          expiresAt: editing.expiresAt || null,
          notes: editing.notes,
        })
        setEditing(null)
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar')
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="El menú es lo que se vende. El stock es lo que hay en bodega, barra, abierto y merma."
      />
      <StaffTabs
        tabs={[
          { id: 'stock', label: 'Stock' },
          { id: 'menu', label: 'Menú de venta' },
        ]}
        value={tab}
        onChange={setTab}
        columns={4}
      />

      {tab === 'menu' && <ProductsList initialProducts={products} />}

      {tab === 'stock' && (
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            {stock.length === 0 && (
              <StaffButton type="button" onClick={importSeed} disabled={pending}>
                Cargar Excel de Astro
              </StaffButton>
            )}
            <StaffButton
              type="button"
              variant="secondary"
              onClick={() =>
                setEditing({
                  name: '',
                  location: 'BODEGA',
                  quantity: 0,
                  category: 'Licores',
                })
              }
            >
              Nuevo ítem
            </StaffButton>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto, proveedor…"
              className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg text-sm min-w-[200px] flex-1"
            />
          </div>

          {(merma.length > 0 || expiring.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {merma.length > 0 && (
                <Badge tone="danger">{merma.length} ítems en merma</Badge>
              )}
              {expiring.length > 0 && (
                <Badge tone="warning">{expiring.length} por vencer (14 días)</Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === 'ALL' ? 'bg-primary-600 text-white' : 'text-staff-muted hover:bg-staff-hover'}`}
            >
              Todas
            </button>
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setFilter(loc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === loc ? 'bg-primary-600 text-white' : 'text-staff-muted hover:bg-staff-hover'}`}
              >
                {STOCK_LOCATION_LABELS[loc]}
              </button>
            ))}
          </div>

          {editing && (
            <Panel>
              <form onSubmit={saveItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Nombre"
                  className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
                />
                <input
                  value={editing.presentation || ''}
                  onChange={(e) => setEditing({ ...editing, presentation: e.target.value })}
                  placeholder="Presentación (750 ml, 1 L)"
                  className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
                />
                <select
                  value={editing.category || ''}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
                >
                  {STOCK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={editing.location || 'BODEGA'}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value as StockLocation })}
                  className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {STOCK_LOCATION_LABELS[loc]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editing.quantity ?? 0}
                  onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })}
                  className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
                />
                <input
                  type="date"
                  value={editing.expiresAt || ''}
                  onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value || null })}
                  className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
                />
                <input
                  value={editing.supplier || ''}
                  onChange={(e) => setEditing({ ...editing, supplier: e.target.value })}
                  placeholder="Proveedor"
                  className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
                />
                <input
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Notas"
                  className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg sm:col-span-2"
                />
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <StaffButton type="button" variant="ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </StaffButton>
                  <StaffButton type="submit" disabled={pending}>
                    Guardar
                  </StaffButton>
                </div>
              </form>
            </Panel>
          )}

          {stock.length === 0 ? (
            <Panel>
              <p className="text-staff-muted text-sm">
                Aún no hay stock. Carga el Excel de Astro o crea el primer ítem.
              </p>
            </Panel>
          ) : (
            <div className="overflow-x-auto border border-staff-border rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-staff-raised text-staff-muted text-left">
                  <tr>
                    <th className="p-3 font-medium">Producto</th>
                    <th className="p-3 font-medium">Ubicación</th>
                    <th className="p-3 font-medium text-right">Qty</th>
                    <th className="p-3 font-medium">Caduca</th>
                    <th className="p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const expired = s.expiresAt && new Date(s.expiresAt).getTime() < Date.now()
                    return (
                      <tr key={s.id} className="border-t border-staff-border">
                        <td className="p-3">
                          <p className="font-medium text-staff-fg">{s.name}</p>
                          <p className="text-xs text-staff-muted">
                            {[s.presentation, s.category, s.supplier].filter(Boolean).join(' · ')}
                          </p>
                        </td>
                        <td className="p-3">
                          <Badge tone={s.location === 'MERMA' ? 'danger' : s.location === 'ABIERTO' ? 'warning' : 'neutral'}>
                            {STOCK_LOCATION_LABELS[s.location]}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-semibold text-staff-fg">{qty(s.quantity)}</td>
                        <td className="p-3 text-staff-muted">
                          {s.expiresAt ? (
                            <span className={expired ? 'text-red-400' : ''}>
                              {new Date(s.expiresAt).toLocaleDateString('es-HN')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              className="text-xs text-primary-500 hover:underline"
                              onClick={() =>
                                setEditing({
                                  id: s.id,
                                  name: s.name,
                                  presentation: s.presentation,
                                  category: s.category,
                                  supplier: s.supplier,
                                  supplierPhone: s.supplierPhone,
                                  location: s.location,
                                  quantity: qty(s.quantity),
                                  cost: s.cost != null ? Number(s.cost) : null,
                                  expiresAt: toDateInput(s.expiresAt),
                                  notes: s.notes,
                                })
                              }
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="text-xs text-staff-muted hover:underline"
                              onClick={() => {
                                const n = Number(window.prompt('Sumar (+) o restar (−) unidades', '1'))
                                if (!Number.isFinite(n) || n === 0) return
                                start(async () => {
                                  try {
                                    await adjustStock(s.id, n)
                                    router.refresh()
                                  } catch (err: unknown) {
                                    alert(err instanceof Error ? err.message : 'Error')
                                  }
                                })
                              }}
                            >
                              Ajuste
                            </button>
                            {s.location === 'BODEGA' && (
                              <button
                                type="button"
                                className="text-xs text-staff-muted hover:underline"
                                onClick={() => {
                                  const n = Number(window.prompt('¿Cuántas pasan a barra?', '1'))
                                  if (!Number.isFinite(n) || n <= 0) return
                                  start(async () => {
                                    try {
                                      await transferStock(s.id, 'BARRA', n)
                                      router.refresh()
                                    } catch (err: unknown) {
                                      alert(err instanceof Error ? err.message : 'Error')
                                    }
                                  })
                                }}
                              >
                                A barra
                              </button>
                            )}
                            {s.location !== 'MERMA' && (
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:underline"
                                onClick={() => {
                                  const n = Number(window.prompt('¿Cuántas van a merma?', '1'))
                                  if (!Number.isFinite(n) || n <= 0) return
                                  start(async () => {
                                    try {
                                      await transferStock(s.id, 'MERMA', n)
                                      router.refresh()
                                    } catch (err: unknown) {
                                      alert(err instanceof Error ? err.message : 'Error')
                                    }
                                  })
                                }}
                              >
                                Merma
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
