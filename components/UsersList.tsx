'use client'

import { useMemo, useState } from 'react'
import { createUser, updateUser, deleteUser, setUserTicketeraEvents } from '@/lib/actions'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type TicketeraEventOption = { id: string; name: string; date: Date | string; isActive: boolean }
type UserRole = 'ADMIN' | 'MESERO' | 'CAJERO' | 'TAQUILLA' | 'COCINA' | 'BAR' | 'CLIENTE_TICKETERA'
type TicketeraFilter = 'ALL' | 'ONLY_TICKETERA' | 'WITH_EVENTS' | 'WITHOUT_EVENTS'

interface UsersListProps {
  initialUsers: any[]
  ticketeraEvents: TicketeraEventOption[]
}

export function UsersList({ initialUsers, ticketeraEvents }: UsersListProps) {
  const [users, setUsers] = useState(initialUsers)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'MESERO' as 'ADMIN' | 'MESERO' | 'CAJERO' | 'TAQUILLA' | 'COCINA' | 'BAR' | 'CLIENTE_TICKETERA',
    name: '',
  })
  const router = useRouter()
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
  const [selectedTicketeraEventIds, setSelectedTicketeraEventIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL')
  const [ticketeraFilter, setTicketeraFilter] = useState<TicketeraFilter>('ALL')

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((user) => {
      const matchesSearch =
        q.length === 0 ||
        user.username?.toLowerCase().includes(q) ||
        user.name?.toLowerCase().includes(q)
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
      const assignmentsCount = (user.ticketeraEventAssignments || []).length
      const isTicketera = user.role === 'CLIENTE_TICKETERA'
      const matchesTicketera =
        ticketeraFilter === 'ALL' ||
        (ticketeraFilter === 'ONLY_TICKETERA' && isTicketera) ||
        (ticketeraFilter === 'WITH_EVENTS' && isTicketera && assignmentsCount > 0) ||
        (ticketeraFilter === 'WITHOUT_EVENTS' && isTicketera && assignmentsCount === 0)
      return matchesSearch && matchesRole && matchesTicketera
    })
  }, [users, search, roleFilter, ticketeraFilter])

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
      if (formData.role === 'CLIENTE_TICKETERA') {
        await setUserTicketeraEvents(newUser.id, selectedTicketeraEventIds)
      }
      const mergedUser =
        formData.role === 'CLIENTE_TICKETERA'
          ? {
              ...newUser,
              ticketeraEventAssignments: selectedTicketeraEventIds.map((eventId) => ({ eventId })),
            }
          : newUser
      setUsers([...users, mergedUser])
      setShowCreateModal(false)
      setFormData({ username: '', password: '', role: 'MESERO', name: '' })
      setSelectedTicketeraEventIds([])
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
      if (updatedUser.role === 'CLIENTE_TICKETERA') {
        await setUserTicketeraEvents(updatedUser.id, selectedTicketeraEventIds)
      }
      const mergedUpdate =
        updatedUser.role === 'CLIENTE_TICKETERA'
          ? {
              ...updatedUser,
              ticketeraEventAssignments: selectedTicketeraEventIds.map((eventId) => ({ eventId })),
            }
          : updatedUser
      setUsers(users.map((u) => (u.id === mergedUpdate.id ? mergedUpdate : u)))
      setEditingUser(null)
      setFormData({ username: '', password: '', role: 'MESERO', name: '' })
      setSelectedTicketeraEventIds([])
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
    setSelectedTicketeraEventIds(
      (user.ticketeraEventAssignments || []).map((a: { eventId: string }) => a.eventId)
    )
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
          onClick={() => {
            setSelectedTicketeraEventIds([])
            setShowCreateModal(true)
          }}
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

      <div className="mb-6 bg-dark-100 border border-dark-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-dark-400 mb-1">Buscar usuario</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Usuario o nombre"
              className="w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Rol</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
              className="w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="ADMIN">Administrador</option>
              <option value="MESERO">Mesero</option>
              <option value="CAJERO">Cajero</option>
              <option value="TAQUILLA">Taquilla</option>
              <option value="COCINA">Cocina</option>
              <option value="BAR">Bar</option>
              <option value="CLIENTE_TICKETERA">Cliente ticketera</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Filtro ticketera</label>
            <select
              value={ticketeraFilter}
              onChange={(e) => setTicketeraFilter(e.target.value as TicketeraFilter)}
              className="w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="ONLY_TICKETERA">Solo clientes ticketera</option>
              <option value="WITH_EVENTS">Ticketera con eventos</option>
              <option value="WITHOUT_EVENTS">Ticketera sin eventos</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-dark-400">
          <span>
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </span>
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setRoleFilter('ALL')
              setTicketeraFilter('ALL')
            }}
            className="text-primary-400 hover:text-primary-300"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Vista móvil - Cards */}
      <div className="block md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 text-center text-dark-400">
            No hay usuarios que coincidan con los filtros
          </div>
        ) : (
          filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-dark-100 border border-dark-200 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-white mb-1 truncate">
                  {user.username}
                </div>
                {user.name && (
                  <div className="text-sm text-dark-300 mb-2 truncate">
                    {user.name}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-400'
                        : user.role === 'MESERO'
                        ? 'bg-blue-500/20 text-blue-400'
                        : user.role === 'TAQUILLA'
                        ? 'bg-amber-500/20 text-amber-400'
                        : user.role === 'CAJERO'
                        ? 'bg-green-500/20 text-green-400'
                        : user.role === 'COCINA'
                        ? 'bg-rose-500/20 text-rose-300'
                        : user.role === 'BAR'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : user.role === 'CLIENTE_TICKETERA'
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'bg-dark-200 text-white/70'
                    }`}
                  >
                    {user.role === 'CLIENTE_TICKETERA' ? 'Cliente ticketera' : user.role}
                  </span>
                  <span className="text-xs text-dark-400">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-dark-200">
              <button
                onClick={() => openEditModal(user)}
                className="flex-1 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteUser(user)}
                disabled={deleteLoadingId === user.id}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {deleteLoadingId === user.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden md:block relative -mx-4 sm:mx-0">
        <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="inline-block min-w-full sm:min-w-0 sm:w-full px-4 sm:px-0">
            <div className="bg-dark-100 border border-dark-200 rounded-xl overflow-hidden">
              <table className="w-full table-auto">
          <thead className="bg-dark-50 border-b border-dark-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Creado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider whitespace-nowrap">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-dark-400">
                  No hay usuarios que coincidan con los filtros
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-dark-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {user.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                    {user.name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-400'
                          : user.role === 'MESERO'
                          ? 'bg-blue-500/20 text-blue-400'
                          : user.role === 'TAQUILLA'
                          ? 'bg-amber-500/20 text-amber-400'
                          : user.role === 'CAJERO'
                          ? 'bg-green-500/20 text-green-400'
                          : user.role === 'COCINA'
                          ? 'bg-rose-500/20 text-rose-300'
                          : user.role === 'BAR'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : user.role === 'CLIENTE_TICKETERA'
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'bg-dark-200 text-white/70'
                      }`}
                    >
                      {user.role === 'CLIENTE_TICKETERA' ? 'Cliente ticketera' : user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-400">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
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
              ))
            )}
          </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overscroll-contain">
          <div className="bg-dark-100 border-t sm:border border-dark-200 rounded-t-2xl sm:rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="sticky top-0 bg-dark-100 pb-4 mb-4 border-b border-dark-200 sm:border-0 sm:pb-0 sm:mb-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                Crear Usuario
              </h2>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4 pb-4">
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
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  autoComplete="username"
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
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  placeholder="Nombre completo"
                  autoComplete="name"
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
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  autoComplete="new-password"
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
                      role: e.target.value as
                        | 'ADMIN'
                        | 'MESERO'
                        | 'CAJERO'
                        | 'TAQUILLA'
                        | 'COCINA'
                        | 'BAR'
                        | 'CLIENTE_TICKETERA',
                    })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                >
                  <option value="MESERO">Mesero</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="CAJERO">Cajero</option>
                  <option value="TAQUILLA">Taquilla</option>
                  <option value="COCINA">Cocina</option>
                  <option value="BAR">Bar</option>
                  <option value="CLIENTE_TICKETERA">Cliente ticketera</option>
                </select>
              </div>
              {formData.role === 'CLIENTE_TICKETERA' && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Eventos asignados</label>
                  <p className="text-xs text-dark-400 mb-2">
                    Solo verá y venderá entradas de estos eventos en Admin → Entradas.
                  </p>
                  <div className="max-h-40 overflow-y-auto border border-dark-200 rounded-lg p-2 space-y-2 bg-dark-50/50">
                    {ticketeraEvents.length === 0 ? (
                      <p className="text-xs text-dark-400 px-1">No hay eventos creados aún.</p>
                    ) : (
                      ticketeraEvents.map((ev) => (
                        <label key={ev.id} className="flex items-start gap-2 text-sm text-white/90 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-dark-200"
                            checked={selectedTicketeraEventIds.includes(ev.id)}
                            onChange={() => {
                              setSelectedTicketeraEventIds((prev) =>
                                prev.includes(ev.id) ? prev.filter((x) => x !== ev.id) : [...prev, ev.id]
                              )
                            }}
                          />
                          <span>
                            {ev.name}
                            {!ev.isActive ? (
                              <span className="text-amber-500 text-xs ml-1">(inactivo)</span>
                            ) : null}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError('')
                    setSelectedTicketeraEventIds([])
                    setFormData({
                      username: '',
                      password: '',
                      role: 'MESERO',
                      name: '',
                    })
                  }}
                  className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base touch-manipulation"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 text-base touch-manipulation"
                >
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overscroll-contain">
          <div className="bg-dark-100 border-t sm:border border-dark-200 rounded-t-2xl sm:rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="sticky top-0 bg-dark-100 pb-4 mb-4 border-b border-dark-200 sm:border-0 sm:pb-0 sm:mb-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                Editar Usuario
              </h2>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4 pb-4">
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
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  autoComplete="username"
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
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  autoComplete="name"
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
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  autoComplete="new-password"
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
                      role: e.target.value as
                        | 'ADMIN'
                        | 'MESERO'
                        | 'CAJERO'
                        | 'TAQUILLA'
                        | 'COCINA'
                        | 'BAR'
                        | 'CLIENTE_TICKETERA',
                    })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                >
                  <option value="MESERO">Mesero</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="CAJERO">Cajero</option>
                  <option value="TAQUILLA">Taquilla</option>
                  <option value="COCINA">Cocina</option>
                  <option value="BAR">Bar</option>
                  <option value="CLIENTE_TICKETERA">Cliente ticketera</option>
                </select>
              </div>
              {formData.role === 'CLIENTE_TICKETERA' && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Eventos asignados</label>
                  <p className="text-xs text-dark-400 mb-2">
                    Solo verá y venderá entradas de estos eventos en Admin → Entradas.
                  </p>
                  <div className="max-h-40 overflow-y-auto border border-dark-200 rounded-lg p-2 space-y-2 bg-dark-50/50">
                    {ticketeraEvents.length === 0 ? (
                      <p className="text-xs text-dark-400 px-1">No hay eventos creados aún.</p>
                    ) : (
                      ticketeraEvents.map((ev) => (
                        <label key={ev.id} className="flex items-start gap-2 text-sm text-white/90 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-dark-200"
                            checked={selectedTicketeraEventIds.includes(ev.id)}
                            onChange={() => {
                              setSelectedTicketeraEventIds((prev) =>
                                prev.includes(ev.id) ? prev.filter((x) => x !== ev.id) : [...prev, ev.id]
                              )
                            }}
                          />
                          <span>
                            {ev.name}
                            {!ev.isActive ? (
                              <span className="text-amber-500 text-xs ml-1">(inactivo)</span>
                            ) : null}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null)
                    setError('')
                    setSelectedTicketeraEventIds([])
                    setFormData({
                      username: '',
                      password: '',
                      role: 'MESERO',
                      name: '',
                    })
                  }}
                  className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base touch-manipulation"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 text-base touch-manipulation"
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

