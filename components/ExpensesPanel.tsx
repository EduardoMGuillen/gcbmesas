'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense, deleteExpense } from '@/lib/ops-actions'
import { EXPENSE_CATEGORIES } from '@/lib/ops-constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageHeader, Panel, StaffButton, StatCard } from '@/components/staff/ui'

type ExpenseRow = {
  id: string
  date: Date | string
  category: string
  vendor: string | null
  amount: unknown
  notes: string | null
  createdBy: { name: string | null; username: string }
}

export function ExpensesPanel({
  items,
  total,
  byCategory,
  monthFrom,
}: {
  items: ExpenseRow[]
  total: number
  byCategory: Record<string, number>
  monthFrom: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    start(async () => {
      try {
        await createExpense({
          date,
          category,
          vendor,
          amount: Number(amount),
          notes,
        })
        setAmount('')
        setVendor('')
        setNotes('')
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar')
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos del mes"
        description="Personal, proveedores y operación. No mezclar con el stock."
      />
      <StatCard label={`Total ${monthFrom}`} value={formatCurrency(total)} accent />

      {Object.keys(byCategory).length > 0 && (
        <Panel>
          <h2 className="font-semibold text-staff-fg mb-3">Por categoría</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => (
                <li key={cat} className="flex justify-between text-staff-muted">
                  <span>{cat}</span>
                  <span className="text-staff-fg">{formatCurrency(n)}</span>
                </li>
              ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <h2 className="font-semibold text-staff-fg mb-3">Registrar gasto</h2>
        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Proveedor / persona"
            className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
          <input
            type="number"
            min={0.01}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Monto"
            className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota"
            className="px-3 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <StaffButton type="submit" disabled={pending}>
              Guardar gasto
            </StaffButton>
          </div>
        </form>
      </Panel>

      <Panel padding={false}>
        <div className="divide-y divide-staff-border">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-staff-muted">No hay gastos en este mes.</p>
          ) : (
            items.map((e) => (
              <div key={e.id} className="p-4 flex justify-between gap-3 items-start">
                <div>
                  <p className="font-medium text-staff-fg">
                    {e.category}
                    {e.vendor ? ` · ${e.vendor}` : ''}
                  </p>
                  <p className="text-xs text-staff-muted">
                    {formatDate(e.date)} · {e.createdBy.name || e.createdBy.username}
                    {e.notes ? ` · ${e.notes}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-staff-fg">{formatCurrency(Number(e.amount))}</p>
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={() => {
                      if (!confirm('¿Eliminar este gasto?')) return
                      start(async () => {
                        await deleteExpense(e.id)
                        router.refresh()
                      })
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  )
}
