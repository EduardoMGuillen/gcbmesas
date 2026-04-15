'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { setMyPrepCategories, advancePrepStatus, setBarCajeroWatches } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/utils'

type PrepOrder = {
  id: string
  quantity: number
  price: unknown
  prepStatus: string
  createdAt: Date | string
  product: { name: string; category: string | null }
  servedByUserId?: string | null
  servedBy?: { username: string; name: string | null } | null
  account: {
    id: string
    clientName: string | null
    table: { name: string; shortCode: string; zone: string | null }
  }
}

type CajeroOpt = { id: string; username: string; name: string | null }

export function ComandasBoard({
  station,
  title,
  initialOrders,
  initialNeedsCategories,
  initialNeedsCajeros,
  initialUseGlobalRouting,
  initialKeys,
  initialMine,
  initialCajeroMine,
  cajeroOptions,
  isAdmin,
}: {
  station: 'COCINA' | 'BAR'
  title: string
  initialOrders: PrepOrder[]
  initialNeedsCategories: boolean
  initialNeedsCajeros: boolean
  initialUseGlobalRouting: boolean
  initialKeys: string[]
  initialMine: string[]
  initialCajeroMine: string[]
  cajeroOptions: CajeroOpt[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [orders, setOrders] = useState(initialOrders)
  const [needsCategories, setNeedsCategories] = useState(initialNeedsCategories)
  const [needsCajeros, setNeedsCajeros] = useState(initialNeedsCajeros)
  const [useGlobalRouting, setUseGlobalRouting] = useState(initialUseGlobalRouting)
  const [keys, setKeys] = useState(initialKeys)
  const [mine, setMine] = useState<string[]>(initialMine)
  const [cajeroMine, setCajeroMine] = useState<string[]>(initialCajeroMine)
  const [savingCats, setSavingCats] = useState(false)
  const [savingCaj, setSavingCaj] = useState(false)

  useEffect(() => {
    setOrders(initialOrders)
    setNeedsCategories(initialNeedsCategories)
    setNeedsCajeros(initialNeedsCajeros)
    setUseGlobalRouting(initialUseGlobalRouting)
    setKeys(initialKeys)
    setMine(initialMine)
    setCajeroMine(initialCajeroMine)
  }, [
    initialOrders,
    initialNeedsCategories,
    initialNeedsCajeros,
    initialUseGlobalRouting,
    initialKeys,
    initialMine,
    initialCajeroMine,
  ])

  useAutoRefresh({ interval: 12000 })

  const refresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const toggleCat = (k: string) => {
    setMine((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }

  const toggleCajero = (id: string) => {
    setCajeroMine((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
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

  const saveCajeros = async () => {
    if (isAdmin || station !== 'BAR') return
    setSavingCaj(true)
    try {
      await setBarCajeroWatches(cajeroMine)
      router.refresh()
    } catch (e: any) {
      alert(e?.message || 'Error al guardar cajeros')
    } finally {
      setSavingCaj(false)
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

  const showLegacyCategories = !isAdmin && !useGlobalRouting
  const showBarCajeros = !isAdmin && station === 'BAR' && cajeroOptions.length > 0

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

      {useGlobalRouting && (
        <div className="text-sm text-sky-200/95 bg-sky-500/10 border border-sky-500/35 rounded-xl px-4 py-3">
          <strong className="text-sky-100">Enrutado por categoría (admin):</strong> las categorías y estación (cocina o
          bar) las define el administrador en{' '}
          <span className="text-white font-medium">Admin → Ruta comandas</span>. Aquí solo ves pedidos de tu estación.
        </div>
      )}

      {showLegacyCategories && (
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

      {showBarCajeros && (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-2">Cajeros en tu bar</h2>
          <p className="text-sm text-white/70 mb-3">
            Elige de qué cuentas de caja te llegan las comandas (según el cajero que aceptó el pedido). Puedes marcar
            varios.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {cajeroOptions.map((c) => (
              <label
                key={c.id}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                  cajeroMine.includes(c.id)
                    ? 'border-cyan-500 bg-cyan-600/15 text-cyan-100'
                    : 'border-dark-200 text-white/70'
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded border-dark-200"
                  checked={cajeroMine.includes(c.id)}
                  onChange={() => toggleCajero(c.id)}
                />
                {c.name?.trim() || c.username}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void saveCajeros()}
            disabled={savingCaj}
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500 disabled:opacity-50"
          >
            {savingCaj ? 'Guardando…' : 'Guardar cajeros'}
          </button>
        </div>
      )}

      {isAdmin && (
        <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          Como administrador ves todos los pedidos en cola de esta estación (sin filtro por cajero).
        </p>
      )}

      {needsCategories && !isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-100 rounded-xl p-6">
          Selecciona al menos una categoría arriba y pulsa &quot;Guardar categorías&quot; para ver pedidos aquí.
        </div>
      )}

      {needsCajeros && !isAdmin && station === 'BAR' && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-100 rounded-xl p-6">
          Marca al menos un <strong>cajero</strong> arriba y pulsa &quot;Guardar cajeros&quot; para ver comandas de esas
          cuentas de caja.
        </div>
      )}

      {(() => {
        const blockOrders =
          (!isAdmin && needsCategories) || (!isAdmin && station === 'BAR' && needsCajeros)
        if (blockOrders) return null
        if (orders.length === 0) {
          return (
            <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 text-white/70">No hay pedidos en cola.</div>
          )
        }
        return (
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
                  {o.servedBy && (
                    <p className="text-xs text-cyan-200/90 mt-1">
                      Aceptado en caja: {o.servedBy.name?.trim() || o.servedBy.username}
                    </p>
                  )}
                  {!o.servedBy && o.servedByUserId == null && station === 'BAR' && (
                    <p className="text-xs text-white/45 mt-1">Cajero: no registrado (pedido anterior o automático)</p>
                  )}
                  <p className="text-sm text-primary-300 mt-1">
                    {o.quantity} × {o.product.name}
                  </p>
                  <p className="text-xs text-white/50">{formatDate(o.createdAt)} · {formatCurrency(Number(o.price))}</p>
                  <p className="text-xs text-amber-200/90 mt-1">
                    Estado:{' '}
                    {o.prepStatus === 'QUEUED'
                      ? 'En cola'
                      : o.prepStatus === 'PREPARING'
                        ? 'En preparación'
                        : o.prepStatus}
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
        )
      })()}
    </div>
  )
}
