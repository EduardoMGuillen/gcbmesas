'use client'

import { useState } from 'react'
import {
  createProduct,
  updateProduct,
  activateProduct,
  deactivateProduct,
  deleteProduct,
} from '@/lib/actions'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface ProductsListProps {
  initialProducts: any[]
}

export function ProductsList({ initialProducts }: ProductsListProps) {
  const [products, setProducts] = useState(initialProducts)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    emoji: '',
  })
  const router = useRouter()

  // Extraer categorías únicas de los productos
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter((cat): cat is string => cat !== null && cat !== undefined && cat !== '')
    )
  ).sort()

  // Filtrar productos por categoría
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const price = parseFloat(formData.price)
      if (isNaN(price) || price <= 0) {
        setError('El precio debe ser mayor a 0')
        setLoading(false)
        return
      }

      const newProduct = await createProduct({
        name: formData.name,
        price,
        category: formData.category || undefined,
        emoji: formData.emoji.trim() === '' ? undefined : formData.emoji.trim(),
      })
      setProducts([...products, newProduct])
      // Si el nuevo producto tiene categoría y estamos filtrando por esa categoría, se mostrará automáticamente
      setShowCreateModal(false)
      setFormData({ name: '', price: '', category: '', emoji: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al crear producto')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const updateData: any = {}
      if (formData.name) updateData.name = formData.name
      if (formData.price) {
        const price = parseFloat(formData.price)
        if (isNaN(price) || price <= 0) {
          setError('El precio debe ser mayor a 0')
          setLoading(false)
          return
        }
        updateData.price = price
      }
      if (formData.category !== undefined) updateData.category = formData.category
      if (formData.emoji !== undefined) {
        // Si el campo está vacío, establecer como null
        updateData.emoji = formData.emoji.trim() === '' ? null : formData.emoji.trim()
      }

      const updatedProduct = await updateProduct(editingProduct.id, updateData)
      setProducts(
        products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      )
      // Si cambió la categoría y estamos filtrando, ajustar el filtro si es necesario
      setEditingProduct(null)
      setFormData({ name: '', price: '', category: '', emoji: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar producto')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (productId: string) => {
    if (!confirm('¿Estás seguro de desactivar este producto?')) {
      return
    }

    try {
      await deactivateProduct(productId)
      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, isActive: false } : p
        )
      )
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error al desactivar producto')
    }
  }

  const handleActivate = async (productId: string) => {
    try {
      await activateProduct(productId)
      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, isActive: true } : p
        )
      )
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error al activar producto')
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await deleteProduct(productId)
      setProducts(products.filter((p) => p.id !== productId))
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error al eliminar producto')
    }
  }

  const openEditModal = (product: any) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category || '',
      emoji: product.emoji || '',
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Inventario</h1>
          <p className="text-dark-400">
            Gestiona los productos del menú
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Crear Producto
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filtro por categoría */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-dark-300 whitespace-nowrap">
          Filtrar por categoría:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {selectedCategory && (
          <span className="text-sm text-dark-400">
            ({filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center">
          <p className="text-dark-400 text-lg">
            {selectedCategory
              ? `No hay productos en la categoría "${selectedCategory}"`
              : 'No hay productos disponibles'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-dark-100 border rounded-xl p-6 ${
                product.isActive
                  ? 'border-dark-200'
                  : 'border-red-500/50 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {product.name}
                  </h3>
                  {product.category && (
                    <p className="text-sm text-dark-400">
                      {product.category}
                    </p>
                  )}
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    product.isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {product.isActive ? 'Activo' : 'Inactivo'}
                </div>
              </div>

              <p className="text-2xl font-bold text-primary-400 mb-4">
                {formatCurrency(product.price)}
              </p>

              <div className="space-y-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(product)}
                  className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Editar
                </button>
                  {product.isActive ? (
                  <button
                    onClick={() => handleDeactivate(product.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Desactivar
                  </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(product.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Activar
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="w-full bg-red-800 hover:bg-red-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Crear Producto
            </h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Precio
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Categoría (opcional)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Bebidas, Comida, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Emoji (opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) =>
                      setFormData({ ...formData, emoji: e.target.value })
                    }
                    placeholder="🍺 📦 🍕 etc."
                    maxLength={2}
                    className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white text-2xl text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formData.emoji && (
                    <div className="flex items-center justify-center w-16 bg-dark-50 border border-dark-200 rounded-lg text-3xl">
                      {formData.emoji}
                    </div>
                  )}
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  Ingresa un emoji para mostrar en el grid de productos (máx. 2 caracteres)
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError('')
                    setFormData({ name: '', price: '', category: '', emoji: '' })
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
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Editar Producto
            </h2>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Precio
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Categoría
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Emoji (opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) =>
                      setFormData({ ...formData, emoji: e.target.value })
                    }
                    placeholder="🍺 📦 🍕 etc."
                    maxLength={2}
                    className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white text-2xl text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {formData.emoji && (
                    <div className="flex items-center justify-center w-16 bg-dark-50 border border-dark-200 rounded-lg text-3xl">
                      {formData.emoji}
                    </div>
                  )}
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  Ingresa un emoji para mostrar en el grid de productos (máx. 2 caracteres)
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null)
                    setError('')
                    setFormData({ name: '', price: '', category: '', emoji: '' })
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
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

