'use client'

import { useState } from 'react'
import { CashierOrders } from '@/components/CashierOrders'
import { CashierAccounts } from '@/components/CashierAccounts'

type AccountItem = {
  id: string
  table: { name: string; shortCode: string; zone?: string | null }
  initialBalance: string | number | { toString(): string }
  currentBalance: string | number | { toString(): string }
  createdAt: string | Date
  openedBy?: { name: string | null; username: string } | null
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
  account: { id: string; table: { name: string; shortCode: string; zone?: string | null } }
  user?: { username: string; name?: string | null }
}

interface CajeroDashboardProps {
  accounts: AccountItem[]
  pendingOrders: OrderItem[]
  recentServed: OrderItem[]
}

export function CajeroDashboard({
  accounts,
  pendingOrders,
  recentServed,
}: CajeroDashboardProps) {
  const [selectedZone, setSelectedZone] = useState<string>('')

  const zones = Array.from(
    new Set([
      ...accounts.map((a) => a.table?.zone).filter(Boolean),
      ...pendingOrders.map((o) => o.account.table.zone).filter(Boolean),
      ...recentServed.map((o) => o.account.table.zone).filter(Boolean),
    ])
  ).filter((z): z is string => Boolean(z)).sort()

  return (
    <>
      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Filtrar por zona (pedidos y cuentas)
        </label>
        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas las zonas</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      <section>
        <CashierOrders
          pendingOrders={pendingOrders}
          recentServed={recentServed}
          selectedZone={selectedZone}
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">
          Cuentas abiertas
        </h2>
        <CashierAccounts accounts={accounts} selectedZone={selectedZone} />
      </section>
    </>
  )
}
