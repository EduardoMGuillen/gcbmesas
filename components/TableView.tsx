'use client'

import { useState } from 'react'
import { createOrder, createAccount, closeAccount } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface TableViewProps {
  table: any
  account: any
  products: any[]
}

export function TableView({ table, account: initialAccount, products }: TableViewProps) {
  const [account, setAccount] = useState(initialAccount)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('1') // Cambiar a string para manejar input temporal
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateAccount, setShowCreateAccount] = useState(!account)
  const [initialBalance, setInitialBalance] = useState('')
  const [clientName, setClientName] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const router = useRouter()

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

      const newAccount = await createAccount({
        tableId: table.id,
        initialBalance: balance,
        clientName: clientName.trim() || null,
      })

      setAccount({
        ...newAccount,
        orders: [],
      })
      setShowCreateAccount(false)
      setInitialBalance('')
      setClientName('')
    } catch (err: any) {
      setError(err.message || 'Error al crear cuenta')
    } finally {
      setLoading(false)
    }
  }

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

      // Validar y convertir cantidad
      const quantityNum = parseInt(quantity, 10)
      if (!quantityNum || quantityNum < 1) {
        setError('La cantidad debe ser un número mayor o igual a 1')
        setLoading(false)
        return
      }

      const newOrder = await createOrder({
        accountId: account.id,
        productId: selectedProduct,
        quantity: quantityNum,
      })

      // Refresh account data
      router.refresh()
      
      // Update local state
      const product = products.find((p) => p.id === selectedProduct)
      const totalPrice = Number(product?.price || 0) * quantityNum
      
      setAccount({
        ...account,
        currentBalance: Number(account.currentBalance) - totalPrice,
        orders: [
          {
            id: newOrder.id,
            product: product,
            price: totalPrice,
            quantity,
            createdAt: new Date(),
            user: { username: 'Tú' },
          },
          ...account.orders,
        ],
      })

      setShowAddProduct(false)
      setSelectedProduct('')
      setQuantity('1')
    } catch (err: any) {
      setError(err.message || 'Error al agregar pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseAccount = async () => {
    if (!confirm('¿Estás seguro de cerrar esta cuenta?')) {
      return
    }

    setLoading(true)
    try {
      await closeAccount(account.id)
      router.refresh()
      setAccount({ ...account, status: 'CLOSED' })
    } catch (err: any) {
      setError(err.message || 'Error al cerrar cuenta')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar productos por término de búsqueda
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  )

  if (showCreateAccount) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Mesa: {table.name}
          </h1>
          <p className="text-dark-100">
            Código: <span className="font-semibold">{table.shortCode}</span>
          </p>
          {table.zone && <p className="text-dark-400">Zona: {table.zone}</p>}
        </div>

        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Crear Cuenta
          </h2>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Nombre del cliente (opcional)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ej: Juan Pérez"
              />
            </div>
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
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Cuenta'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Mesa: {table.name}
          </h1>
          <p className="text-dark-100">
            Código: <span className="font-semibold">{table.shortCode}</span>
          </p>
        </div>
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8">
          <p className="text-dark-400">No hay cuenta abierta para esta mesa</p>
        </div>
      </div>
    )
  }

  const totalConsumed =
    Number(account.initialBalance) - Number(account.currentBalance)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Mesa: {table.name}
        </h1>
        <p className="text-dark-100">
          Código: <span className="font-semibold">{table.shortCode}</span>
        </p>
        {table.zone && <p className="text-dark-400">Zona: {table.zone}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-dark-400 mb-2">
            Saldo Inicial
          </h3>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(account.initialBalance)}
          </p>
        </div>
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-dark-400 mb-2">
            Total Consumido
          </h3>
          <p className="text-2xl font-bold text-primary-400">
            {formatCurrency(totalConsumed)}
          </p>
        </div>
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-dark-400 mb-2">
            Saldo Disponible
          </h3>
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
              {account.status === 'OPEN' && (
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Agregar Pedido
                </button>
              )}
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
                          {order.rejected === true && (
                            <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                              Rechazado
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-dark-400">
                          {order.quantity}x {formatCurrency(order.product.price)}
                        </p>
                        <p className="text-xs text-dark-500 mt-1">
                          {formatDate(order.createdAt)} por {order.user.username}
                        </p>
                      </div>
                      <p className="font-semibold text-white">
                        {formatCurrency(order.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Acciones</h2>
            {account.status === 'OPEN' ? (
              <div className="space-y-3">
                <button
                  onClick={handleCloseAccount}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cerrar Cuenta
                </button>
              </div>
            ) : (
              <div className="bg-dark-50 border border-dark-200 rounded-lg p-4">
                <p className="text-sm text-dark-400">
                  Cuenta cerrada el {formatDate(account.closedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Agregar Pedido
            </h2>
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
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
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
                  type="text"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => {
                    const value = e.target.value
                    // Permitir solo números
                    if (/^\d*$/.test(value)) {
                      setQuantity(value)
                    }
                  }}
                  onBlur={() => {
                    // Validar al perder foco
                    const num = parseInt(quantity, 10)
                    if (!num || num < 1) {
                      setQuantity('1')
                    } else {
                      setQuantity(num.toString())
                    }
                  }}
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {selectedProduct && (
                <div className="bg-dark-50 border border-dark-200 rounded-lg p-4">
                  <p className="text-sm text-dark-400 mb-1">Total:</p>
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(
                      Number(
                        products.find((p) => p.id === selectedProduct)?.price ||
                          0
                      ) * (parseInt(quantity, 10) || 1)
                    )}
                  </p>
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false)
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

