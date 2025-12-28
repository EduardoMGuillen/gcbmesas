'use client'

import { useState } from 'react'
import { createCustomerOrder } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface CustomerOrderViewProps {
  table: {
    id: string
    name: string
    shortCode: string
    zone?: string | null
  }
  account: {
    id: string
    initialBalance: string | number
    currentBalance: string | number
    orders: Array<{
      id: string
      product: { name: string; price: string | number }
      quantity: number
      price: string | number
      createdAt: string | Date
      served: boolean
    }>
  }
  products: Array<{
    id: string
    name: string
    price: string | number
    category?: string | null
  }>
}

export function CustomerOrderView({ table, account, products }: CustomerOrderViewProps) {
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const router = useRouter()

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!selectedProduct) {
        setError('Selecciona un producto')
        setLoading(false)
        return
      }

      const quantityNum = parseInt(quantity, 10)
      if (!quantityNum || quantityNum < 1) {
        setError('La cantidad debe ser un número mayor o igual a 1')
        setLoading(false)
        return
      }

      await createCustomerOrder({
        accountId: account.id,
        productId: selectedProduct,
        quantity: quantityNum,
      })

      // Refresh page to get updated data
      router.refresh()
      
      setShowAddProduct(false)
      setSelectedProduct('')
      setQuantity('1')
      setError('')
    } catch (err: any) {
      setError(err.message || 'Error al agregar pedido')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  )

  const totalConsumed =
    Number(account.initialBalance) - Number(account.currentBalance)

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Mesa: {table.name}</h1>
          <p className="text-dark-100">
            Código: <span className="font-semibold">{table.shortCode}</span>
          </p>
          {table.zone && <p className="text-dark-400">Zona: {table.zone}</p>}
        </div>
        <button
          onClick={() => router.push('/clientes')}
          className="bg-dark-200 hover:bg-dark-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Cambiar Mesa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-dark-400 mb-2">Saldo Disponible</h3>
          <p
            className={`text-2xl font-bold ${
              Number(account.currentBalance) < 0
                ? 'text-red-400'
                : 'text-green-400'
            }`}
          >
            {formatCurrency(account.currentBalance)}
          </p>
        </div>
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-dark-400 mb-2">Total Consumido</h3>
          <p className="text-2xl font-bold text-primary-400">
            {formatCurrency(totalConsumed)}
          </p>
        </div>
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-dark-400 mb-2">Pedidos Pendientes</h3>
          <p className="text-2xl font-bold text-white">
            {account.orders.filter((o) => !o.served).length}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Pedidos</h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Agregar Pedido
              </button>
            </div>

            {account.orders.length === 0 ? (
              <p className="text-dark-400 text-center py-8">
                No hay pedidos registrados
              </p>
            ) : (
              <div className="space-y-3">
                {account.orders.map((order: any) => (
                  <div
                    key={order.id}
                    className="bg-dark-50 border border-dark-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white">
                          {order.product.name}
                        </p>
                        <p className="text-sm text-dark-400">
                          {order.quantity}x {formatCurrency(order.product.price)}
                        </p>
                        <p className="text-xs text-dark-500 mt-1">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {formatCurrency(order.price)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            order.served
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-amber-500/20 text-amber-200'
                          }`}
                        >
                          {order.served ? 'Listo' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Productos</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-dark-50 border border-dark-200 rounded-lg p-3"
                >
                  <p className="font-semibold text-white text-sm">{product.name}</p>
                  <p className="text-primary-400 font-bold">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-white mb-4">Agregar Pedido</h2>
            <form onSubmit={handleAddOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Buscar Producto
                </label>
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Producto
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecciona un producto</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false)
                    setSelectedProduct('')
                    setQuantity('1')
                    setProductSearchTerm('')
                    setError('')
                  }}
                  className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
