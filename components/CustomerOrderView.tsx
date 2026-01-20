'use client'

import { useState, useEffect, useTransition } from 'react'
import { createCustomerOrder, createOrder, closeAccount, addBalanceToAccount } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

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
    status?: 'OPEN' | 'CLOSED'
    orders: Array<{
      id: string
      product: { name: string; price: string | number }
      quantity: number
      price: string | number
      createdAt: string | Date
      served: boolean
      rejected?: boolean
    }>
  }
  products: Array<{
    id: string
    name: string
    price: string | number
    category?: string | null
    emoji?: string | null
  }>
  // Props opcionales para modo mesero
  tables?: Array<{
    id: string
    name: string
    zone?: string | null
    accounts?: Array<{
      id: string
      initialBalance: string | number
      currentBalance: string | number
    }>
  }>
  initialTableId?: string
  isMesero?: boolean
  onCreateAccount?: (tableId: string, initialBalance: number) => Promise<void>
  onChangeTable?: (tableId: string) => void
  backUrl?: string
}

export function CustomerOrderView({ 
  table: initialTable, 
  account: initialAccount, 
  products,
  tables,
  initialTableId,
  isMesero = false,
  onCreateAccount,
  onChangeTable,
  backUrl = '/clientes'
}: CustomerOrderViewProps) {
  const [selectedTableId, setSelectedTableId] = useState(initialTableId || initialTable.id)
  const [table, setTable] = useState(initialTable)
  const [account, setAccount] = useState(initialAccount)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [initialBalance, setInitialBalance] = useState('')
  const [showAddBalance, setShowAddBalance] = useState(false)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [showConfirmAddBalance, setShowConfirmAddBalance] = useState(false)
  const [pendingBalanceAmount, setPendingBalanceAmount] = useState(0)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Verificar si hay cuenta abierta (convertir a booleano explícitamente)
  const hasOpenAccount = !!(account && account.id)
  
  // Auto-refresh inteligente: solo recarga cuando hay nuevos pedidos
  // Solo activo cuando hay cuenta abierta
  // Esto asegura que cuando un mesero agrega un pedido, el cliente lo vea automáticamente
  // Nota: Usar polling con API para verificar cambios antes de recargar
  // Pausar el autorefresh cuando el usuario está agregando un pedido para no interrumpir su proceso
  const latestOrderId = account.orders[0]?.id || undefined
  const orderCount = account.orders.length
  
  useAutoRefresh({ 
    interval: 5000, 
    enabled: hasOpenAccount,
    forceReload: !isMesero, // Solo forzar recarga para clientes (no meseros)
    pauseWhen: () => loading || showAddProduct, // Pausar si está cargando o mostrando el formulario
    accountId: account.id, // ID de cuenta para verificar nuevos pedidos
    lastOrderId: latestOrderId, // Último ID conocido (convertir null a undefined)
    lastOrderCount: orderCount // Último conteo conocido
  })

  // Actualizar estado cuando cambia initialTableId (refrescar al cambiar mesa)
  useEffect(() => {
    if (initialTableId && initialTableId !== selectedTableId) {
      setSelectedTableId(initialTableId)
      // Si hay una nueva mesa, actualizar table y account
      if (tables) {
        const newTable = tables.find(t => t.id === initialTableId)
        if (newTable) {
          // Actualizar zona seleccionada
          if (newTable.zone) {
            setSelectedZone(newTable.zone)
          }
          setTable({
            id: newTable.id,
            name: newTable.name,
            shortCode: newTable.name,
            zone: newTable.zone || null,
          })
          const newAccount = newTable.accounts?.[0]
          if (newAccount) {
            setAccount({
              id: newAccount.id,
              initialBalance: newAccount.initialBalance,
              currentBalance: newAccount.currentBalance,
              orders: [],
            })
            setShowCreateAccount(false)
          } else {
            setAccount({
              id: '',
              initialBalance: 0,
              currentBalance: 0,
              orders: [],
            })
            if (isMesero) {
              setShowCreateAccount(true)
            }
          }
        }
      }
    } else if (initialTableId === selectedTableId) {
      // Actualizar table y account con los props actuales
      setTable(initialTable)
      setAccount(initialAccount)
      // Actualizar zona si la mesa tiene zona
      if (initialTable.zone) {
        setSelectedZone(initialTable.zone)
      }
    } else if (!initialTableId) {
      // Si no hay mesa seleccionada, resetear zona
      setSelectedZone('')
      setSelectedTableId('')
    }
  }, [initialTableId, initialTable, initialAccount, tables, isMesero, selectedTableId])

  // Si se pasa un initialTableId y no tiene cuenta, mostrar el formulario de crear cuenta automáticamente
  useEffect(() => {
    if (isMesero && initialTableId && selectedTableId === initialTableId && tables) {
      const selectedTable = tables.find(t => t.id === selectedTableId)
      if (selectedTable && !selectedTable.accounts?.length) {
        setShowCreateAccount(true)
      }
    }
  }, [initialTableId, selectedTableId, isMesero, tables])

  // Extraer categorías únicas de los productos
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter((cat): cat is string => cat !== null && cat !== undefined && cat !== '')
    )
  ).sort()

  // Establecer BOTELLAS como categoría por defecto cuando se abre el modal
  useEffect(() => {
    if (showAddProduct && categories.length > 0) {
      if (!selectedCategory) {
        const botellasCategory = categories.find(cat => 
          cat.toUpperCase().includes('BOTELLA') || cat.toUpperCase() === 'BOTELLAS'
        )
        if (botellasCategory) {
          setSelectedCategory(botellasCategory)
        } else if (categories.length > 0) {
          // Si no hay BOTELLAS, usar la primera categoría
          setSelectedCategory(categories[0])
        }
      }
    }
  }, [showAddProduct, categories, selectedCategory])

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

      if (onCreateAccount) {
        await onCreateAccount(selectedTableId, balance)
        setShowCreateAccount(false)
        setInitialBalance('')
        router.refresh()
      }
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

      const quantityNum = parseInt(quantity, 10)
      if (!quantityNum || quantityNum < 1) {
        setError('La cantidad debe ser un número mayor o igual a 1')
        setLoading(false)
        return
      }

      if (isMesero) {
        await createOrder({
          accountId: account.id,
          productId: selectedProduct,
          quantity: quantityNum,
        })
        
        // Cerrar el formulario primero
        setShowAddProduct(false)
        setSelectedProduct('')
        setQuantity('1')
        setError('')
        
        // Refresh inmediato para obtener los datos actualizados del pedido
        startTransition(() => {
          router.refresh()
        })
        
        // Refresh adicional después de un delay para asegurar actualización completa
        setTimeout(() => {
          router.refresh()
        }, 800)
      } else {
        // Para clientes, asegurar que la acción se complete antes de refrescar
        await createCustomerOrder({
          accountId: account.id,
          productId: selectedProduct,
          quantity: quantityNum,
        })
        
        // Cerrar el formulario primero
        setShowAddProduct(false)
        setSelectedProduct('')
        setQuantity('1')
        setError('')
        
        // Para clientes, usar una estrategia más agresiva porque revalidatePath no funciona bien con query params
        // Opción 1: Refresh inmediato con router.refresh
        router.refresh()
        
        // Opción 2: Refresh usando window.location para forzar recarga completa si router.refresh falla
        // Usar un delay más largo para dar tiempo a que router.refresh funcione primero
        setTimeout(() => {
          // Verificar si la página necesita recarga completa
          // Si después de 1000ms no se ha actualizado, forzar recarga
          const currentUrl = window.location.href
          window.location.href = currentUrl // Forzar recarga completa de la página
        }, 1000)
      }
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
      setAccount({ ...account, status: 'CLOSED' as const })
    } catch (err: any) {
      setError(err.message || 'Error al cerrar cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddBalanceModal = () => {
    setShowAddBalance(true)
    setBalanceAmount('')
    setError('')
  }

  const handleConfirmAddBalance = () => {
    const amount = parseFloat(balanceAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }
    setPendingBalanceAmount(amount)
    setShowAddBalance(false)
    setShowConfirmAddBalance(true)
  }

  const handleAddBalance = async () => {
    setLoading(true)
    setError('')
    try {
      await addBalanceToAccount(account.id, pendingBalanceAmount)
      setAccount({
        ...account,
        initialBalance: Number(account.initialBalance) + pendingBalanceAmount,
        currentBalance: Number(account.currentBalance) + pendingBalanceAmount,
      })
      setShowConfirmAddBalance(false)
      setPendingBalanceAmount(0)
      setBalanceAmount('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al agregar saldo')
      setShowConfirmAddBalance(false)
      setShowAddBalance(true)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
    // Siempre filtrar por categoría seleccionada (nunca mostrar todas)
    const matchesCategory = selectedCategory ? product.category === selectedCategory : false
    return matchesSearch && matchesCategory
  })

  const totalConsumed =
    Number(account.initialBalance) - Number(account.currentBalance)

  return (
    <div>
      {/* Selector de mesa para meseros */}
      {isMesero && tables && (
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Seleccionar Zona
            </label>
              <select
                value={selectedZone || ''}
                onChange={(e) => {
                  const newZone = e.target.value
                  setSelectedZone(newZone)
                  setSelectedTableId('')
                  // Si había una mesa seleccionada, limpiar la URL y refrescar
                  if (selectedTableId) {
                    router.push(backUrl)
                    setTimeout(() => {
                      router.refresh()
                    }, 100)
                  }
                }}
                className="w-full px-4 py-3 bg-dark-100 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
              <option value="">Selecciona una zona</option>
              {Array.from(new Set(tables.map(t => t.zone).filter((zone): zone is string => Boolean(zone)))).sort().map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
          {selectedZone && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Seleccionar Mesa
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => {
                  const newTableId = e.target.value
                  setError('')
                  if (newTableId) {
                    router.push(`${backUrl}?tableId=${newTableId}`)
                  } else {
                    setSelectedZone('')
                    router.push(backUrl)
                  }
                  // Forzar refresh para obtener nuevos datos del servidor
                  setTimeout(() => router.refresh(), 100)
                }}
                className="w-full px-4 py-3 bg-dark-100 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecciona una mesa</option>
                {tables.filter(t => t.zone === selectedZone).map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Formulario para crear cuenta si es mesero y no hay cuenta */}
      {isMesero && showCreateAccount && !hasOpenAccount && (
        <div className="mb-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-400 mb-4">
            Esta mesa no tiene cuenta abierta. Crea una cuenta primero.
          </p>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
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
        </div>
      )}

      {/* Mostrar contenido principal solo si hay cuenta abierta */}
      {hasOpenAccount && (
        <>
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mesa: {table.name}</h1>
              <p className="text-white">
                Código: <span className="font-semibold">{table.shortCode || table.id.slice(0, 8)}</span>
              </p>
              {table.zone && <p className="text-white">Zona: {table.zone}</p>}
            </div>
            {!isMesero && (
              <button
                onClick={() => router.push(backUrl)}
                className="bg-dark-200 hover:bg-dark-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Cambiar Mesa
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-2">Saldo Disponible</h3>
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
              <h3 className="text-sm font-medium text-white mb-2">Total Consumido</h3>
              <p className="text-2xl font-bold text-primary-400">
                {formatCurrency(totalConsumed)}
              </p>
            </div>
            <div className="bg-dark-100 border border-dark-200 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-2">Pedidos Pendientes</h3>
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
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-semibold text-white">Pedidos</h2>
                    {!isMesero && (
                      <button
                        onClick={() => setShowAddProduct(true)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm w-full sm:w-auto sm:flex-shrink-0"
                      >
                        Agregar Pedido
                      </button>
                    )}
                  </div>
                  {isMesero && (account.status === 'OPEN' || !account.status) && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <button
                        onClick={() => setShowAddProduct(true)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm w-full sm:w-auto"
                      >
                        Agregar Pedido
                      </button>
                      <button
                        onClick={handleOpenAddBalanceModal}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm w-full sm:w-auto"
                      >
                        Agregar saldo a la cuenta
                      </button>
                      <button
                        onClick={handleCloseAccount}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm w-full sm:w-auto"
                      >
                        Cerrar Cuenta
                      </button>
                    </div>
                  )}
                </div>

                {account.orders.length === 0 ? (
                  <p className="text-white text-center py-8">
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
                            <p className="text-sm text-white">
                              {order.quantity}x {formatCurrency(order.product.price)}
                            </p>
                            <p className="text-xs text-white/70 mt-1">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-white">
                              {formatCurrency(order.price)}
                            </p>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                order.rejected === true
                                  ? 'bg-red-500/20 text-red-400'
                                  : order.served
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-amber-500/20 text-amber-200'
                              }`}
                            >
                              {order.rejected === true ? 'Rechazado' : order.served ? 'Listo' : 'Pendiente'}
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
        </>
      )}

      {showAddProduct && hasOpenAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Agregar Pedido</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddProduct(false)
                  setSelectedProduct('')
                  setQuantity('1')
                  setProductSearchTerm('')
                  setSelectedCategory('')
                  setError('')
                }}
                className="text-white hover:text-red-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Barra de categorías */}
            {categories.length > 0 && (
              <div className="mb-6 pt-4">
                <div 
                  className="category-scrollbar flex gap-2 overflow-x-auto overflow-y-hidden pb-3"
                >
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category)
                      }}
                      className={`px-5 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                        selectedCategory === category
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-dark-50 border border-dark-200 text-white hover:bg-dark-200 hover:border-dark-300'
                      }`}
                      style={{ minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid de productos */}
            <div className="flex-1 overflow-y-auto pr-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white text-lg">No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(product.id)
                        setQuantity('1')
                      }}
                      className="bg-dark-50 border border-dark-200 rounded-lg p-4 cursor-pointer hover:border-primary-500 transition-colors text-left w-full"
                    >
                      {/* Emoji */}
                      {product.emoji && (
                        <div className="text-4xl mb-3 text-center">{product.emoji}</div>
                      )}
                      
                      {/* Nombre del producto */}
                      <h3 className="font-semibold text-white mb-2 text-center text-sm">
                        {product.name}
                      </h3>
                      
                      {/* Categoría tag */}
                      {product.category && (
                        <div className="flex justify-center mb-2">
                          <span className="bg-primary-600/20 text-primary-400 px-2 py-1 rounded text-xs font-medium">
                            {product.category}
                          </span>
                        </div>
                      )}
                      
                      {/* Precio */}
                      <p className="text-primary-400 font-bold text-center">
                        {formatCurrency(product.price)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal de cantidad (se muestra cuando se selecciona un producto) */}
            {selectedProduct && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]">
                <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full">
                  <h3 className="text-xl font-semibold text-white mb-4">Cantidad</h3>
                  <form
                    onSubmit={handleAddOrder}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        autoFocus
                        className="w-full px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    {error && (
                      <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct('')
                          setQuantity('1')
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
        </div>
      )}

      {/* Modal para agregar saldo */}
      {showAddBalance && hasOpenAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overscroll-contain">
          <div className="bg-dark-100 border-t sm:border border-dark-200 rounded-t-2xl sm:rounded-xl p-4 sm:p-6 max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">
              Agregar saldo a la cuenta
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleConfirmAddBalance()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Monto a agregar
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBalance(false)
                    setBalanceAmount('')
                    setError('')
                  }}
                  className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base touch-manipulation"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !balanceAmount || parseFloat(balanceAmount) <= 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 text-base touch-manipulation"
                >
                  Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para agregar saldo */}
      {showConfirmAddBalance && hasOpenAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overscroll-contain">
          <div className="bg-dark-100 border-t sm:border border-dark-200 rounded-t-2xl sm:rounded-xl p-4 sm:p-6 max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">
              Confirmar agregar saldo
            </h2>
            <div className="space-y-4">
              <div className="bg-dark-50 border border-dark-200 rounded-lg p-4">
                <p className="text-sm text-dark-300 mb-2">¿Seguro que quieres agregar saldo a la cuenta?</p>
                <p className="text-lg font-semibold text-white">
                  Monto: {formatCurrency(pendingBalanceAmount)}
                </p>
                <p className="text-sm text-dark-400 mt-2">
                  Saldo actual: {formatCurrency(account.currentBalance)}
                </p>
                <p className="text-sm text-green-400 mt-1 font-semibold">
                  Nuevo saldo: {formatCurrency(Number(account.currentBalance) + pendingBalanceAmount)}
                </p>
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmAddBalance(false)
                    setPendingBalanceAmount(0)
                    setShowAddBalance(true)
                    setError('')
                  }}
                  className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base touch-manipulation"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleAddBalance}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 text-base touch-manipulation"
                >
                  {loading ? 'Agregando...' : 'Sí, agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
