'use client'

import { useState } from 'react'
import { createUser, updateUser, deleteUser } from '@/lib/actions'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface UsersListProps {
  initialUsers: any[]
}

export function UsersList({ initialUsers }: UsersListProps) {
  const [users, setUsers] = useState(initialUsers)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'MESERO' as 'ADMIN' | 'MESERO' | 'CAJERO',
    name: '',
  })
  const router = useRouter()
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const newUser = await createUser({
        username: formData.username,
        password: formData.password,
        role: formData.role,
        name: formData.name || undefined,
      })
      setUsers([...users, newUser])
      setShowCreateModal(false)
      setFormData({ username: '', password: '', role: 'MESERO', name: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const updateData: any = {}
      if (formData.username) updateData.username = formData.username
      if (formData.password) updateData.password = formData.password
      if (formData.role) updateData.role = formData.role
      updateData.name = formData.name || null

      const updatedUser = await updateUser(editingUser.id, updateData)
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
      setEditingUser(null)
      setFormData({ username: '', password: '', role: 'MESERO', name: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar usuario')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (user: any) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      name: user.name || '',
    })
  }

  const handleDeleteUser = async (user: any) => {
    if (
      !confirm(
        `¿Seguro que deseas eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`
      )
    ) {
      return
    }

    setError('')
    setDeleteLoadingId(user.id)

    try {
      await deleteUser(user.id)
      setUsers(users.filter((u) => u.id !== user.id))
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario')
    } finally {
      setDeleteLoadingId(null)
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Usuarios</h1>
          <p className="text-sm sm:text-base text-dark-400">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
        >
          Crear Usuario
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="relative -mx-4 sm:mx-0">
        <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="inline-block min-w-full sm:min-w-0 sm:w-full px-4 sm:px-0">
            <div className="bg-dark-100 border border-dark-200 rounded-xl overflow-hidden">
              <table className="w-full min-w-[640px] table-auto">
          <thead className="bg-dark-50 border-b border-dark-200">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Usuario
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Nombre
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Rol
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">
                Creado
              </th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-dark-50">
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">
                    {user.username}
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                  {user.name || '—'}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-400'
                        : user.role === 'MESERO'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-dark-400 hidden sm:table-cell">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 sm:space-x-3">
                  <button
                    onClick={() => openEditModal(user)}
                    className="text-primary-400 hover:text-primary-300"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={deleteLoadingId === user.id}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {deleteLoadingId === user.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Crear Usuario
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'ADMIN' | 'MESERO' | 'CAJERO',
                    })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="MESERO">Mesero</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="CAJERO">Cajero</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError('')
                    setFormData({
                      username: '',
                      password: '',
                      role: 'MESERO',
                      name: '',
                    })
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

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Editar Usuario
            </h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Nueva Contraseña (dejar vacío para no cambiar)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'ADMIN' | 'MESERO' | 'CAJERO',
                    })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="MESERO">Mesero</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="CAJERO">Cajero</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null)
                    setError('')
                    setFormData({
                      username: '',
                      password: '',
                      role: 'MESERO',
                      name: '',
                    })
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

