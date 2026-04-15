'use client'

import { useState, useEffect, useTransition } from 'react'
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

  const addLine = () => setLines((prev) => [...prev, { productId: catalog[0]?.id || '', quantity: 1 }])

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  const removeLine = (i: number) => setLines((prev) => prev.filter((_, j) => j !== i))

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-dark-100 border border-dark-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Factura libre (mostrador)</h2>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white">
            Cerrar
          </button>
        </div>
        <p className="text-sm text-white/60 mb-4">
          Arma líneas desde el inventario e imprime. No registra venta en el sistema.
        </p>
        <div className="space-y-3 mb-4">
          <input
            placeholder="Nombre cliente (opcional)"
            className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white text-sm"
            value={receptorName}
            onChange={(e) => setReceptorName(e.target.value)}
          />
          <input
            placeholder="RTN cliente (opcional)"
            className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white text-sm"
            value={receptorRtn}
            onChange={(e) => setReceptorRtn(e.target.value)}
          />
        </div>
        <div className="space-y-3 mb-4">
          {lines.map((ln, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <select
                className="flex-1 min-w-[140px] rounded-lg bg-dark-50 border border-dark-200 px-2 py-2 text-white text-sm"
                value={ln.productId}
                onChange={(e) => updateLine(i, { productId: e.target.value })}
              >
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(Number(p.price))}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="w-20 rounded-lg bg-dark-50 border border-dark-200 px-2 py-2 text-white text-sm"
                value={ln.quantity}
                onChange={(e) => updateLine(i, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              />
              <button type="button" onClick={() => removeLine(i)} className="text-red-400 text-sm">
                Quitar
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addLine}
            disabled={pending || catalog.length === 0}
            className="px-3 py-2 rounded-lg bg-dark-200 text-white text-sm hover:bg-dark-50 disabled:opacity-50"
          >
            Añadir línea
          </button>
          <button
            type="button"
            onClick={print}
            disabled={lines.length === 0}
            className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 disabled:opacity-50"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
