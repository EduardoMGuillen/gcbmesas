'use client'

import { useState, useEffect, useTransition, useMemo, useCallback, type SVGProps } from 'react'
import { getProductsForCashierInvoice } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { buildHnInvoiceHtml, printHnInvoice, type InvoiceSettingsLike, type HnInvoiceLine } from '@/lib/invoice-print-hn'

type ProductRow = {
  id: string
  name: string
  price: unknown
  category: string | null
  isTaxExempt: boolean
}

type Line = { productId: string; quantity: number }

function IconReceipt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3H5a2 2 0 00-2 2v14l4-2 4 2 4-2 4 2V5a2 2 0 00-2-2h-4M9 3v18M9 3h6"
      />
    </svg>
  )
}

function IconX(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

export function CashierFreeInvoiceModal({
  open,
  onClose,
  invoiceSettings,
}: {
  open: boolean
  onClose: () => void
  invoiceSettings: InvoiceSettingsLike | null
}) {
  const [pending, start] = useTransition()
  const [catalog, setCatalog] = useState<ProductRow[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [receptorName, setReceptorName] = useState('')
  const [receptorRtn, setReceptorRtn] = useState('')

  useEffect(() => {
    if (!open) return
    start(async () => {
      try {
        const p = await getProductsForCashierInvoice()
        setCatalog(p as ProductRow[])
      } catch {
        setCatalog([])
      }
    })
  }, [open])

  useEffect(() => {
    if (!open) {
      setLines([])
      setReceptorName('')
      setReceptorRtn('')
    }
  }, [open])

  useEffect(() => {
    if (catalog.length === 0) return
    setLines((prev) =>
      prev.map((l) => {
        if (!l.productId || !catalog.some((c) => c.id === l.productId)) {
          return { ...l, productId: catalog[0].id }
        }
        return l
      })
    )
  }, [catalog])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const catalogByCategory = useMemo(() => {
    const groups = new Map<string, ProductRow[]>()
    for (const p of catalog) {
      const key = p.category?.trim() || 'Sin categoría'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'es'))
  }, [catalog])

  const addLine = useCallback(() => {
    const first = catalog[0]?.id || ''
    setLines((prev) => [...prev, { productId: first, quantity: 1 }])
  }, [catalog])

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  const removeLine = (i: number) => setLines((prev) => prev.filter((_, j) => j !== i))

  const lineDetails = useMemo(() => {
    return lines.map((ln) => {
      const p = catalog.find((c) => c.id === ln.productId)
      const unit = p ? Number(p.price) : 0
      const qty = Math.max(1, ln.quantity)
      return { product: p, unit, qty, subtotal: unit * qty }
    })
  }, [lines, catalog])

  const grandTotal = useMemo(() => lineDetails.reduce((s, d) => s + d.subtotal, 0), [lineDetails])

  const validLinesCount = useMemo(
    () => lineDetails.filter((d) => d.product && d.qty >= 1).length,
    [lineDetails]
  )

  const print = () => {
    if (typeof window === 'undefined') return
    const origin = window.location.origin
    const hnLines: HnInvoiceLine[] = []
    for (const ln of lines) {
      const p = catalog.find((c) => c.id === ln.productId)
      if (!p || ln.quantity < 1) continue
      const unit = Number(p.price)
      const total = unit * ln.quantity
      hnLines.push({
        description: p.name,
        quantity: ln.quantity,
        unitPrice: unit,
        lineTotal: total,
        taxExempt: p.isTaxExempt === true,
      })
    }
    if (hnLines.length === 0) return
    const ref = `REF-${Date.now().toString(36).toUpperCase()}`
    const receptor: string[] = ['Factura mostrador / venta directa']
    if (receptorName.trim()) receptor.push(`Cliente: ${receptorName.trim()}`)
    if (receptorRtn.trim()) receptor.push(`RTN cliente: ${receptorRtn.trim()}`)

    const html = buildHnInvoiceHtml({
      logoUrl: `${origin}/LogoCasaBlanca.png`,
      documentTitle: 'Factura',
      ref,
      settings: invoiceSettings,
      receptorLines: receptor,
      lines: hnLines,
      footerNote: 'No afecta saldo de mesa. Comprobante interno.',
    })
    printHnInvoice(html)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-invoice-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default sm:cursor-pointer"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-gradient-to-b from-dark-100 to-dark-100 border border-dark-200 shadow-2xl shadow-black/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-dark-200/80 bg-dark-100/95">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/20 text-primary-400">
              <IconReceipt className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="free-invoice-title" className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                Factura libre
              </h2>
              <p className="text-sm text-white/55 mt-0.5 leading-snug">
                Mostrador: arma el detalle e imprime. No abre cuenta ni registra consumo en mesas.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg text-white/50 hover:text-white hover:bg-dark-200 transition-colors"
              aria-label="Cerrar"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5">
            <p className="text-xs text-amber-200/90 leading-relaxed">
              <span className="font-semibold text-amber-100/95">Solo comprobante impreso.</span> Úsala para ventas en
              mostrador que no pasan por una mesa abierta en el sistema.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">Datos en factura (opcional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="free-inv-name" className="block text-xs text-dark-300 mb-1">
                  Nombre o razón social
                </label>
                <input
                  id="free-inv-name"
                  placeholder="Ej. Juan Pérez o Empresa S. de R.L."
                  className="w-full rounded-xl bg-dark-50 border border-dark-200 px-3.5 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/40"
                  value={receptorName}
                  onChange={(e) => setReceptorName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="free-inv-rtn" className="block text-xs text-dark-300 mb-1">
                  RTN
                </label>
                <input
                  id="free-inv-rtn"
                  placeholder="Opcional"
                  className="w-full rounded-xl bg-dark-50 border border-dark-200 px-3.5 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/40"
                  value={receptorRtn}
                  onChange={(e) => setReceptorRtn(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">Artículos</p>
              {lines.length > 0 && (
                <span className="text-xs text-white/45">
                  {lines.length} {lines.length === 1 ? 'línea' : 'líneas'}
                </span>
              )}
            </div>

            {pending && catalog.length === 0 ? (
              <div className="rounded-xl border border-dashed border-dark-200 bg-dark-50/40 py-10 text-center text-sm text-white/45">
                Cargando inventario…
              </div>
            ) : catalog.length === 0 ? (
              <div className="rounded-xl border border-dark-200 bg-dark-50/50 py-10 text-center text-sm text-white/50 px-4">
                No hay productos activos en inventario. Crea productos en Admin → Inventario.
              </div>
            ) : lines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-dark-200 bg-dark-50/30 py-10 px-4 text-center">
                <p className="text-sm text-white/60 mb-4">Añade al menos un artículo para imprimir la factura.</p>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
                >
                  Añadir primer artículo
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {lines.map((ln, i) => {
                  const d = lineDetails[i]
                  const p = d?.product
                  return (
                    <li
                      key={i}
                      className="rounded-xl border border-dark-200 bg-dark-50/40 p-3.5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-medium text-white/35 uppercase tracking-wide">
                            Línea {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            className="shrink-0 p-1.5 rounded-lg text-red-400/90 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            aria-label="Quitar línea"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                        <div>
                          <label className="sr-only" htmlFor={`free-inv-prod-${i}`}>
                            Producto
                          </label>
                          <select
                            id={`free-inv-prod-${i}`}
                            className="w-full rounded-xl bg-dark-100 border border-dark-200 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            value={ln.productId}
                            onChange={(e) => updateLine(i, { productId: e.target.value })}
                          >
                            {catalogByCategory.map(([cat, products]) => (
                              <optgroup key={cat} label={cat}>
                                {products.map((prod) => (
                                  <option key={prod.id} value={prod.id}>
                                    {prod.name} — {formatCurrency(Number(prod.price))}
                                    {prod.isTaxExempt ? ' (ISV exento)' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {p?.isTaxExempt && (
                            <p className="text-[11px] text-emerald-400/90 mt-1.5">Este ítem va exento de ISV en la impresión.</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-dark-300 mr-1">Cant.</span>
                            <button
                              type="button"
                              className="h-9 w-9 rounded-lg border border-dark-200 bg-dark-100 text-white/90 hover:bg-dark-200 text-lg font-medium leading-none"
                              onClick={() => updateLine(i, { quantity: Math.max(1, ln.quantity - 1) })}
                              aria-label="Menos uno"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              className="w-14 text-center rounded-lg bg-dark-100 border border-dark-200 py-2 text-white text-sm tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              value={ln.quantity}
                              onChange={(e) =>
                                updateLine(i, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                              }
                            />
                            <button
                              type="button"
                              className="h-9 w-9 rounded-lg border border-dark-200 bg-dark-100 text-white/90 hover:bg-dark-200 text-lg font-medium leading-none"
                              onClick={() => updateLine(i, { quantity: ln.quantity + 1 })}
                              aria-label="Más uno"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wide text-white/35">Subtotal</p>
                            <p className="text-base font-semibold text-white tabular-nums">
                              {formatCurrency(d?.subtotal ?? 0)}
                            </p>
                            <p className="text-[11px] text-white/40">
                              {formatCurrency(d?.unit ?? 0)} × {d?.qty ?? 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-dark-200 bg-dark-100/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-white/45">Total a imprimir</p>
              <p className="text-2xl font-bold text-white tabular-nums tracking-tight">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={addLine}
                disabled={pending || catalog.length === 0}
                className="order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-dark-200 bg-dark-50 text-white text-sm font-medium hover:bg-dark-200 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                + Añadir artículo
              </button>
              <button
                type="button"
                onClick={print}
                disabled={validLinesCount === 0}
                className="order-1 sm:order-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-500 shadow-lg shadow-primary-900/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Imprimir factura
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
