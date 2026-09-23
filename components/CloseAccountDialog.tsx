'use client'

import { useState } from 'react'
import type { PaymentMethod } from '@prisma/client'
import { closeAccount } from '@/lib/actions'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/lib/ops-constants'
import { StaffButton } from '@/components/staff/ui'

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | ''
  onChange: (v: PaymentMethod) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PAYMENT_METHODS.map((method) => (
        <button
          key={method}
          type="button"
          onClick={() => onChange(method)}
          className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            value === method
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-staff-raised border-staff-border text-staff-fg hover:bg-staff-hover'
          }`}
        >
          {PAYMENT_METHOD_LABELS[method]}
        </button>
      ))}
    </div>
  )
}

export function CloseAccountDialog({
  accountId,
  onDone,
  onCancel,
}: {
  accountId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!method) {
      setError('Elige cómo pagó el cliente')
      return
    }
    setLoading(true)
    setError('')
    try {
      await closeAccount(accountId, method)
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Cerrar" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-staff-surface border border-staff-border rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-staff-fg">Cerrar cuenta</h2>
        <p className="text-sm text-staff-muted">Registra el método de pago. Si tienes caja abierta, entra al arqueo de esa sesión.</p>
        <PaymentMethodPicker value={method} onChange={setMethod} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 justify-end">
          <StaffButton type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </StaffButton>
          <StaffButton type="button" onClick={() => void submit()} disabled={loading}>
            {loading ? 'Cerrando…' : 'Cerrar cuenta'}
          </StaffButton>
        </div>
      </div>
    </div>
  )
}
