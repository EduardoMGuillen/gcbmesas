'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { setMyPrepCategories, advancePrepStatus } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/utils'

type PrepOrder = {
  id: string
  quantity: number
  price: unknown
  prepStatus: string
  createdAt: Date | string
  product: { name: string; category: string | null }
  account: {
    id: string
    clientName: string | null
    table: { name: string; shortCode: string; zone: string | null }
  }
}

export function ComandasBoard({
  station,
  title,
  initialOrders,
  initialNeedsCategories,
  initialKeys,
  initialMine,
  isAdmin,
}: {
  station: 'COCINA' | 'BAR'
  title: string
  initialOrders: PrepOrder[]
  initialNeedsCategories: boolean
  initialKeys: string[]
  initialMine: string[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [orders, setOrders] = useState(initialOrders)
  const [needsCategories, setNeedsCategories] = useState(initialNeedsCategories)
  const [keys, setKeys] = useState(initialKeys)
  const [mine, setMine] = useState<string[]>(initialMine)
  const [savingCats, setSavingCats] = useState(false)

  useEffect(() => {
    setOrders(initialOrders)
    setNeedsCategories(initialNeedsCategories)
    setKeys(initialKeys)
    setMine(initialMine)
  }, [initialOrders, initialNeedsCategories, initialKeys, initialMine])

  useAutoRefresh({ interval: 12000 })

  const refresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const toggleCat = (k: string) => {
    setMine((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }

  const saveCategories = async () => {
    if (isAdmin) return
    setSavingCats(true)
    try {
      await setMyPrepCategories(mine)
      router.refresh()
    } catch (e: any) {
      alert(e?.message || 'Error al guardar categorías')
    } finally {
      setSavingCats(false)
    }
  }

  const labelForKey = (k: string) => (k === '__NONE__' ? 'Sin categoría' : k)

  const handleAdvance = (orderId: string, next: 'PREPARING' | 'READY') => {
    startTransition(async () => {
      try {
        await advancePrepStatus(orderId, station, next)
        router.refresh()
      } catch (e: any) {
        alert(e?.message || 'Error')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-dark-200 text-white text-sm hover:bg-dark-100 disabled:opacity-50"
        >
          {isPending ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {!isAdmin && (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-2">Categorías en tu comanda</h2>
          <p className="text-sm text-white/70 mb-3">
            Marca las categorías de pedidos que quieres ver cuando el cajero los acepte.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {keys.map((k) => (
              <label
                key={k}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                  mine.includes(k)
                    ? 'border-primary-500 bg-primary-600/20 text-primary-200'
                    : 'border-dark-200 text-white/70'
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded border-dark-200"
                  checked={mine.includes(k)}
                  onChange={() => toggleCat(k)}
                />
                {labelForKey(k)}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void saveCategories()}
            disabled={savingCats}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 disabled:opacity-50"
          >
            {savingCats ? 'Guardando…' : 'Guardar categorías'}
          </button>
        </div>
      )}

      {isAdmin && (
        <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          Como administrador ves todos los pedidos en cola (sin filtro por categoría).
        </p>
      )}

      {needsCategories && !isAdmin ? (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-100 rounded-xl p-6">
          Selecciona al menos una categoría arriba y pulsa &quot;Guardar categorías&quot; para ver pedidos aquí.
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 text-white/70">No hay pedidos en cola.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="bg-dark-100 border border-dark-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <p className="text-white font-medium">
                  Mesa {o.account.table.shortCode} · {o.account.table.name}
                  {o.account.table.zone ? ` · ${o.account.table.zone}` : ''}
                </p>
                {o.account.clientName && (
                  <p className="text-sm text-white/70">Cliente: {o.account.clientName}</p>
                )}
                <p className="text-sm text-primary-300 mt-1">
                  {o.quantity} × {o.product.name}
                </p>
                <p className="text-xs text-white/50">{formatDate(o.createdAt)} · {formatCurrency(Number(o.price))}</p>
                <p className="text-xs text-amber-200/90 mt-1">
                  Estado: {o.prepStatus === 'QUEUED' ? 'En cola' : o.prepStatus === 'PREPARING' ? 'En preparación' : o.prepStatus}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {o.prepStatus === 'QUEUED' && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAdvance(o.id, 'PREPARING')}
                    className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 disabled:opacity-50"
                  >
                    Iniciar preparación
                  </button>
                )}
                {o.prepStatus === 'PREPARING' && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAdvance(o.id, 'READY')}
                    className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-500 disabled:opacity-50"
                  >
                    Marcar listo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
