'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CashierOrders } from '@/components/CashierOrders'
import { CashierAccounts } from '@/components/CashierAccounts'
import { CashierFreeInvoiceModal } from '@/components/CashierFreeInvoiceModal'
import { closeAccount, setCajeroMeseroWatches } from '@/lib/actions'
import {
  buildHnInvoiceHtml,
  printHnInvoice,
  type HnInvoiceLine,
  type InvoiceSettingsLike,
} from '@/lib/invoice-print-hn'
import { formatCurrency } from '@/lib/utils'
import { getTableLabel, isWalkInTable } from '@/lib/walk-in-table'

type ActiveMesero = {
  id: string
  name: string | null
  username: string
}

type AccountItem = {
  id: string
  table: { name: string; shortCode: string; zone?: string | null }
  initialBalance: string | number | { toString(): string }
  currentBalance: string | number | { toString(): string }
  createdAt: string | Date
  openedBy?: { id: string; name: string | null; username: string } | null
  clientName?: string | null
  orders: Array<{
    id: string
    createdAt: string | Date
    served: boolean
    rejected?: boolean
    quantity: number
    price: string | number | { toString(): string }
    product: { name: string; price: string | number | { toString(): string }; isTaxExempt?: boolean }
    user?: { username: string; name?: string | null }
  }>
}

type OrderItem = {
  id: string
  createdAt: string | Date
  quantity: number
  served: boolean
  product: { name: string; price: string | number | { toString(): string } }
  account: {
    id: string
    openedByUserId?: string | null
    table: { name: string; shortCode: string; zone?: string | null }
  }
  user?: { username: string; name?: string | null }
}

interface CajeroDashboardProps {
  accounts: AccountItem[]
  pendingOrders: OrderItem[]
  recentServed: OrderItem[]
  activeMeseros: ActiveMesero[]
  userId: string
  watchedMeseroIds: string[]
  isCajero: boolean
  invoiceSettings: InvoiceSettingsLike | null
}

const STORAGE_KEY_PREFIX = 'cajero-meseros-'

function loadSavedSelection(userId: string, activeMeseroIds: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId)
    if (raw) {
      const saved: string[] = JSON.parse(raw)
      const valid = saved.filter((id) => activeMeseroIds.includes(id))
      if (valid.length > 0) return new Set(valid)
    }
  } catch {}
  return new Set(activeMeseroIds)
}

function saveSelection(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(Array.from(ids)))
  } catch {}
}

function buildInitialSelection(
  watchedMeseroIds: string[],
  userId: string,
  activeMeseroIds: string[]
): Set<string> {
  const validServer = watchedMeseroIds.filter((id) => activeMeseroIds.includes(id))
  if (validServer.length > 0) return new Set(validServer)
  return loadSavedSelection(userId, activeMeseroIds)
}

export function CajeroDashboard({
  accounts,
  pendingOrders,
  recentServed,
  activeMeseros,
  userId,
  watchedMeseroIds,
  isCajero,
  invoiceSettings,
}: CajeroDashboardProps) {
  const router = useRouter()
  const activeMeseroIds = activeMeseros.map((m) => m.id)
  const allMeseroIds = new Set(activeMeseroIds)

  const [selectedMeseroIds, setSelectedMeseroIds] = useState<Set<string>>(() =>
    buildInitialSelection(watchedMeseroIds, userId, activeMeseroIds)
  )

  const migratedRef = useRef(false)
  const skipFirstPersistRef = useRef(true)

  // Primera vez: servidor sin filas → guardar selección inicial (p. ej. desde localStorage) para push
  useEffect(() => {
    if (!isCajero || migratedRef.current) return
    if (watchedMeseroIds.length > 0) return
    migratedRef.current = true
    const ids = Array.from(selectedMeseroIds)
    if (ids.length === 0) return
    void setCajeroMeseroWatches(ids).then(() => router.refresh())
    // Solo en montaje: selectedMeseroIds es el estado inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCajero, watchedMeseroIds.length, userId, router])

  // Sincronizar selección → servidor (notificaciones push usan la misma lista)
  useEffect(() => {
    if (!isCajero) return
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false
      return
    }
    const t = setTimeout(() => {
      void setCajeroMeseroWatches(Array.from(selectedMeseroIds))
    }, 450)
    return () => clearTimeout(t)
  }, [selectedMeseroIds, isCajero])

  useEffect(() => {
    saveSelection(userId, selectedMeseroIds)
  }, [userId, selectedMeseroIds])

  const toggleMesero = useCallback((id: string) => {
    setSelectedMeseroIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = () => setSelectedMeseroIds(new Set(activeMeseroIds))
  const deselectAll = () => setSelectedMeseroIds(new Set())

  const allSelected = activeMeseros.length > 0 && selectedMeseroIds.size === activeMeseros.length
  const noneSelected = selectedMeseroIds.size === 0
  const [freeInvoiceOpen, setFreeInvoiceOpen] = useState(false)
  const [printingWalkInId, setPrintingWalkInId] = useState<string | null>(null)
  const [walkInQuery, setWalkInQuery] = useState('')
  const walkInAccounts = accounts.filter((account) => isWalkInTable(account.table))
  const regularAccounts = accounts.filter((account) => !isWalkInTable(account.table))
  const normalizedWalkInQuery = walkInQuery.trim().toLowerCase()
  const filteredWalkInAccounts = walkInAccounts.filter((account) => {
    if (!normalizedWalkInQuery) return true
    const orderKeywords = account.orders
      .map((order) => order.product?.name || '')
      .join(' ')
      .toLowerCase()
    const searchable = [
      account.id,
      account.clientName || '',
      account.openedBy?.name || '',
      account.openedBy?.username || '',
      getTableLabel(account.table),
      orderKeywords,
    ]
      .join(' ')
      .toLowerCase()
    return searchable.includes(normalizedWalkInQuery)
  })

  const handlePrintWalkIn = useCallback(
    async (account: AccountItem) => {
      if (typeof window === 'undefined') return
      try {
        setPrintingWalkInId(account.id)
        const lines: HnInvoiceLine[] = (account.orders || [])
          .filter((order) => order.rejected !== true)
          .map((order) => {
            const quantity = Math.max(1, Number(order.quantity) || 1)
            const lineTotal = Number(order.price) || 0
            const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal
            return {
              description: order.product?.name || 'Producto',
              quantity,
              unitPrice,
              lineTotal,
              taxExempt: order.product?.isTaxExempt === true,
            }
          })

        if (lines.length === 0) {
          throw new Error('Esta cuenta sin mesa no tiene líneas válidas para imprimir.')
        }

        const ref = `PIE-${String(account.id).slice(-10).toUpperCase()}`
        const receptorLines = [
          getTableLabel(account.table),
          ...(account.clientName ? [`Cliente: ${account.clientName}`] : []),
          `Mesero: ${account.openedBy?.name || account.openedBy?.username || '—'}`,
        ]
        const html = buildHnInvoiceHtml({
          logoUrl: `${window.location.origin.replace(/\/$/, '')}/LogoCasaBlanca.png`,
          documentTitle: 'Factura',
          ref,
          settings: invoiceSettings,
          receptorLines,
          lines,
          footerNote: 'Factura generada desde Cuentas sin mesa.',
        })

        printHnInvoice(html)
        await closeAccount(account.id)
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo imprimir esta cuenta sin mesa.'
        alert(message)
      } finally {
        setPrintingWalkInId(null)
      }
    },
    [invoiceSettings, router]
  )

  return (
    <>
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-white">Filtrar por mesero</label>
            {isCajero && (
              <p className="text-xs text-white/45 mt-1">
                Misma selección para el panel y para las notificaciones push (activa notificaciones arriba).
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={allSelected ? deselectAll : selectAll}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors shrink-0"
          >
            {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>
        {activeMeseros.length === 0 ? (
          <p className="text-sm text-white/60">No hay meseros registrados.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeMeseros.map((mesero) => {
              const isSelected = selectedMeseroIds.has(mesero.id)
              return (
                <button
                  key={mesero.id}
                  type="button"
                  onClick={() => toggleMesero(mesero.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    isSelected
                      ? 'bg-primary-600/20 border-primary-500 text-primary-300'
                      : 'bg-dark-50 border-dark-200 text-white/50 hover:text-white/70 hover:border-dark-100'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                      isSelected ? 'bg-primary-500 border-primary-500' : 'border-white/30 bg-transparent'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {mesero.name || mesero.username}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <section>
        <CashierOrders
          pendingOrders={pendingOrders}
          recentServed={recentServed}
          selectedMeseroIds={selectedMeseroIds}
          allMeseroIds={allMeseroIds}
          noneSelected={noneSelected}
        />
      </section>

      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Cuentas sin mesa</h2>
            <span className="text-xs text-white/55">Pendientes por imprimir: {walkInAccounts.length}</span>
          </div>
          <input
            type="text"
            value={walkInQuery}
            onChange={(e) => setWalkInQuery(e.target.value)}
            placeholder="Buscar por cliente, mesero, producto o ID"
            className="w-full md:w-96 bg-dark-50 border border-dark-200 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
        {filteredWalkInAccounts.length === 0 ? (
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 text-sm text-white/60">
            {walkInAccounts.length === 0
              ? 'No hay cuentas sin mesa pendientes.'
              : 'No hay resultados para esta búsqueda.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWalkInAccounts.slice(0, 20).map((account) => (
              <div
                key={account.id}
                className="bg-dark-100 border border-dark-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="text-white font-medium">{getTableLabel(account.table)}</p>
                  <p className="text-sm text-white/70">
                    {account.clientName || 'Cliente sin nombre'} ·{' '}
                    {account.openedBy?.name || account.openedBy?.username || 'Mesero no asignado'}
                  </p>
                  <p className="text-xs text-white/50">
                    {new Date(account.createdAt).toLocaleString('es-HN')} · {account.orders.length} líneas
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-white font-semibold">
                    Total: {formatCurrency(Number(account.currentBalance) || 0)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handlePrintWalkIn(account)}
                    disabled={printingWalkInId === account.id}
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {printingWalkInId === account.id ? 'Imprimiendo...' : 'Imprimir y cerrar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">Cuentas abiertas</h2>
          <button
            type="button"
            onClick={() => setFreeInvoiceOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-dark-50 text-white text-sm font-medium border border-dark-200 hover:border-primary-500/40 hover:bg-dark-200/80 transition-colors w-full sm:w-auto"
          >
            <svg className="w-4 h-4 text-primary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3H5a2 2 0 00-2 2v14l4-2 4 2 4-2 4 2V5a2 2 0 00-2-2h-4M9 3v18M9 3h6"
              />
            </svg>
            Factura libre
          </button>
        </div>
        <CashierAccounts
          accounts={regularAccounts}
          selectedMeseroIds={selectedMeseroIds}
          allMeseroIds={allMeseroIds}
          noneSelected={noneSelected}
          invoiceSettings={invoiceSettings}
        />
      </section>

      <CashierFreeInvoiceModal
        open={freeInvoiceOpen}
        onClose={() => setFreeInvoiceOpen(false)}
        invoiceSettings={invoiceSettings}
        meseros={activeMeseros}
      />
    </>
  )
}
