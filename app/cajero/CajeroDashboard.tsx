'use client'

import { useState } from 'react'
import { CashierOrders } from '@/components/CashierOrders'
import { CashierAccounts } from '@/components/CashierAccounts'

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
    product: { name: string }
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
}

export function CajeroDashboard({
  accounts,
  pendingOrders,
  recentServed,
  activeMeseros,
}: CajeroDashboardProps) {
  // Inicializar con todos los meseros activos seleccionados
  const [selectedMeseroIds, setSelectedMeseroIds] = useState<Set<string>>(
    () => new Set(activeMeseros.map((m) => m.id))
  )

  const toggleMesero = (id: string) => {
    setSelectedMeseroIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () =>
    setSelectedMeseroIds(new Set(activeMeseros.map((m) => m.id)))
  const deselectAll = () => setSelectedMeseroIds(new Set())

  const allSelected = activeMeseros.length > 0 && selectedMeseroIds.size === activeMeseros.length
  const noneSelected = selectedMeseroIds.size === 0

  return (
    <>
      {/* Filtro de meseros activos */}
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-white">
            Filtrar por mesero
          </label>
          <button
            type="button"
            onClick={allSelected ? deselectAll : selectAll}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>
        {activeMeseros.length === 0 ? (
          <p className="text-sm text-white/60">
            No hay meseros con sesión iniciada hoy.
          </p>
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
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-white/30 bg-transparent'
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
          noneSelected={noneSelected}
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">
          Cuentas abiertas
        </h2>
        <CashierAccounts accounts={accounts} selectedMeseroIds={selectedMeseroIds} noneSelected={noneSelected} />
      </section>
    </>
  )
}
