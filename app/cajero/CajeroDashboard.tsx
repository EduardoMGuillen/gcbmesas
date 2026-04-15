'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CashierOrders } from '@/components/CashierOrders'
import { CashierAccounts } from '@/components/CashierAccounts'
import { CashierFreeInvoiceModal } from '@/components/CashierFreeInvoiceModal'
import { setCajeroMeseroWatches } from '@/lib/actions'
import type { InvoiceSettingsLike } from '@/lib/invoice-print-hn'

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

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">Cuentas abiertas</h2>
          <button
            type="button"
            onClick={() => setFreeInvoiceOpen(true)}
            className="px-4 py-2 rounded-lg bg-dark-200 text-white text-sm hover:bg-dark-100 border border-dark-100 w-full sm:w-auto"
          >
            Factura libre (mostrador)
          </button>
        </div>
        <CashierAccounts
          accounts={accounts}
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
      />
    </>
  )
}
