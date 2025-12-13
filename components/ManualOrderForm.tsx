'use client'

import { useState } from 'react'
import { createOrder, createAccount } from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface ManualOrderFormProps {
  tables: any[]
  products: any[]
}

export function ManualOrderForm({ tables, products }: ManualOrderFormProps) {
  const [selectedTableId, setSelectedTableId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantityInput, setQuantityInput] = useState('1')
  const [initialBalance, setInitialBalance] = useState('')
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const router = useRouter()

  const selectedTable = tables.find((t) => t.id === selectedTableId)
  const hasOpenAccount = selectedTable?.accounts?.length > 0
  const account = selectedTable?.accounts?.[0]

  // Filtrar productos por término de búsqueda
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  )

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const balance = parseFloat(initialBalance)
      if (isNaN(balance) || balance <= 0) {
        setError('El saldo inicial debe ser mayor a 0')
        setLoading(false)
        return
      }

      await createAccount({
        tableId: selectedTableId,
        initialBalance: balance,
      })

      setShowCreateAccount(false)
      setInitialBalance('')
      setSuccess('Cuenta creada exitosamente')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al crear cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!account) {
        setError('La mesa no tiene cuenta abierta')
        setLoading(false)
        return
      }

      if (!selectedProductId) {
        setError('Selecciona un producto')
        setLoading(false)
        return
      }

      const quantityNumber = parseInt(quantityInput, 10)
      if (!quantityNumber || quantityNumber < 1) {
        setError('La cantidad debe ser un número mayor o igual a 1')
        setLoading(false)
        return
      }

      await createOrder({
        accountId: account.id,
        productId: selectedProductId,
        quantity: quantityNumber,
      })

      setSuccess('Pedido agregado exitosamente')
      setSelectedProductId('')
      setQuantityInput('1')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al agregar pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-dark-100 border border-dark-200 rounded-xl p-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Seleccionar Mesa
          </label>
          <select
            value={selectedTableId}
            onChange={(e) => {
              setSelectedTableId(e.target.value)
              setError('')
              setSuccess('')
            }}
            className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecciona una mesa</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name} {table.zone ? `- ${table.zone}` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedTableId && !hasOpenAccount && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-400 mb-4">
              Esta mesa no tiene cuenta abierta. Crea una cuenta primero.
            </p>
            {!showCreateAccount ? (
              <button
                onClick={() => setShowCreateAccount(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Crear Cuenta
              </button>
            ) : (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Saldo Inicial
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAccount(false)
                      setInitialBalance('')
                    }}
                    className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear Cuenta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {hasOpenAccount && account && (
          <>
            <div className="bg-dark-50 border border-dark-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-dark-400 mb-1">Saldo Inicial</p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(account.initialBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-dark-400 mb-1">Consumido</p>
                  <p className="text-lg font-semibold text-primary-400">
                    {formatCurrency(
                      Number(account.initialBalance) -
                        Number(account.currentBalance)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-dark-400 mb-1">Disponible</p>
                  <p
                    className={`text-lg font-semibold ${
                      Number(account.currentBalance) < 0
                        ? 'text-red-400'
                        : 'text-green-400'
                    }`}
                  >
                    {formatCurrency(account.currentBalance)}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Producto
                </label>
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                />
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecciona un producto</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
                {productSearchTerm && filteredProducts.length === 0 && (
                  <p className="text-sm text-yellow-400 mt-2">
                    No se encontraron productos con "{productSearchTerm}"
                  </p>
                )}
                {productSearchTerm && filteredProducts.length > 0 && (
                  <p className="text-sm text-dark-400 mt-2">
                    {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={quantityInput}
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^\d*$/.test(value)) {
                      setQuantityInput(value)
                    }
                  }}
                  onBlur={() => {
                    if (!quantityInput || quantityInput === '0') {
                      setQuantityInput('1')
                    }
                  }}
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {selectedProductId && (
                <div className="bg-dark-50 border border-dark-200 rounded-lg p-4">
                  <p className="text-sm text-dark-400 mb-1">Total:</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(
                      Number(
                        products.find((p) => p.id === selectedProductId)?.price ||
                          0
                      ) *
                        (parseInt(quantityInput, 10) || 0)
                    )}
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedProductId}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Agregando...' : 'Agregar Pedido'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

