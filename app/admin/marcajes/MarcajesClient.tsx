'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type AttendanceMark = {
  id: string
  userId: string
  role: 'ADMIN' | 'MESERO' | 'CAJERO' | 'TAQUILLA'
  type: 'IN' | 'OUT'
  markedAt: string
  latitude: number
  longitude: number
  accuracyMeters: number
  selfieUrl: string
  source: string
  userAgent: string | null
  notes: string | null
  createdAt: string
  user: {
    id: string
    username: string
    name: string | null
    role: string
  }
}

type AdminResponse = {
  ok: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
  marks: AttendanceMark[]
  users: Array<{
    id: string
    username: string
    name: string | null
    role: string
  }>
}

type SettingsResponse = {
  ok: boolean
  settings: {
    id: number
    referenceLatitude: number | null
    referenceLongitude: number | null
    radiusMeters: number
    isActive: boolean
    updatedAt: string | null
  }
}

function todayDateInput() {
  return new Date().toISOString().split('T')[0]
}

export function MarcajesClient() {
  const [marks, setMarks] = useState<AttendanceMark[]>([])
  const [users, setUsers] = useState<AdminResponse['users']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const [from, setFrom] = useState(todayDateInput)
  const [to, setTo] = useState(todayDateInput)
  const [role, setRole] = useState('')
  const [type, setType] = useState('')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [configLat, setConfigLat] = useState('')
  const [configLng, setConfigLng] = useState('')
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('from', from)
    params.set('to', to)
    params.set('page', String(page))
    params.set('pageSize', '50')
    if (role) params.set('role', role)
    if (type) params.set('type', type)
    if (userId) params.set('userId', userId)
    return params.toString()
  }, [from, to, role, type, userId, page])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/attendance/admin?${query}`, { cache: 'no-store' })
      const data = (await res.json()) as AdminResponse | { error?: string }
      if (!res.ok || !('ok' in data)) {
        throw new Error((data as any)?.error || 'No se pudo cargar marcajes')
      }
      setMarks(data.marks)
      setUsers(data.users)
      setMeta({ total: data.total, totalPages: data.totalPages })
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar marcajes')
    } finally {
      setLoading(false)
    }
  }, [query])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/admin-settings', { cache: 'no-store' })
      const data = (await res.json()) as SettingsResponse | { error?: string }
      if (!res.ok || !('ok' in data)) {
        throw new Error((data as any)?.error || 'No se pudo cargar configuración')
      }
      setConfigLat(
        data.settings.referenceLatitude == null ? '' : String(data.settings.referenceLatitude)
      )
      setConfigLng(
        data.settings.referenceLongitude == null ? '' : String(data.settings.referenceLongitude)
      )
      setSettingsUpdatedAt(data.settings.updatedAt)
    } catch (err: any) {
      setSettingsMsg(err?.message || 'No se pudo cargar configuración')
    }
  }, [])

  const saveSettings = useCallback(async () => {
    setSavingSettings(true)
    setSettingsMsg('')
    try {
      const res = await fetch('/api/attendance/admin-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceLatitude: Number(configLat),
          referenceLongitude: Number(configLng),
        }),
      })
      const data = (await res.json()) as SettingsResponse | { error?: string }
      if (!res.ok || !('ok' in data)) {
        throw new Error((data as any)?.error || 'No se pudo guardar coordenadas')
      }
      setSettingsUpdatedAt(data.settings.updatedAt)
      setSettingsMsg('Coordenadas guardadas correctamente.')
    } catch (err: any) {
      setSettingsMsg(err?.message || 'No se pudo guardar coordenadas')
    } finally {
      setSavingSettings(false)
    }
  }, [configLat, configLng])

  useEffect(() => {
    loadData()
    loadSettings()
  }, [loadData, loadSettings])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Marcajes</h1>
        <p className="text-sm text-dark-400">Auditoría de entrada/salida con selfie y geolocalización.</p>
      </div>

      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-white mb-2">Coordenadas de referencia (pruebas)</h2>
        <p className="text-xs text-white/60 mb-3">Radio fijo de validación: 100m (bloquea fuera del radio).</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-white/70">
            Latitud
            <input
              type="number"
              step="any"
              value={configLat}
              onChange={(e) => setConfigLat(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-sm text-white"
              placeholder="14.0818"
            />
          </label>
          <label className="text-xs text-white/70">
            Longitud
            <input
              type="number"
              step="any"
              value={configLng}
              onChange={(e) => setConfigLng(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-sm text-white"
              placeholder="-87.2068"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={savingSettings}
              onClick={saveSettings}
              className="w-full px-3 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60"
            >
              {savingSettings ? 'Guardando...' : 'Guardar coordenadas'}
            </button>
          </div>
        </div>
        {settingsUpdatedAt && (
          <p className="text-xs text-white/60 mt-2">
            Última actualización: {new Date(settingsUpdatedAt).toLocaleString('es-HN')}
          </p>
        )}
        {settingsMsg && <p className="text-xs text-white/80 mt-2">{settingsMsg}</p>}
      </div>

      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <label className="text-xs text-white/70">
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-sm text-white"
            />
          </label>
          <label className="text-xs text-white/70">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-sm text-white"
            />
          </label>
          <label className="text-xs text-white/70">
            Rol
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-sm text-white"
            >
              <option value="">Todos</option>
              <option value="MESERO">Mesero</option>
              <option value="CAJERO">Cajero</option>
              <option value="TAQUILLA">Taquilla</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label className="text-xs text-white/70">
            Tipo
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-sm text-white"
            >
              <option value="">Todos</option>
              <option value="IN">Entrada</option>
              <option value="OUT">Salida</option>
            </select>
          </label>
          <label className="text-xs text-white/70 sm:col-span-2">
            Usuario
            <select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                setPage(1)
              }}
              className="mt-1 w-full px-3 py-2 bg-dark-50 border border-dark-200 rounded-lg text-sm text-white"
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.name || u.username) + ` (${u.role})`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="bg-dark-100 border border-dark-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-white/70">Registros: {meta.total}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 text-xs rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
          >
            Recargar
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-white/70">Cargando marcajes...</p>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : marks.length === 0 ? (
          <p className="text-sm text-white/70">No hay marcajes con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-200">
                  <th className="text-left py-2 px-3 text-white/70 font-medium">Fecha</th>
                  <th className="text-left py-2 px-3 text-white/70 font-medium">Usuario</th>
                  <th className="text-left py-2 px-3 text-white/70 font-medium">Rol</th>
                  <th className="text-left py-2 px-3 text-white/70 font-medium">Tipo</th>
                  <th className="text-left py-2 px-3 text-white/70 font-medium">GPS</th>
                  <th className="text-left py-2 px-3 text-white/70 font-medium">Selfie</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m) => (
                  <tr key={m.id} className="border-b border-dark-200/40">
                    <td className="py-2 px-3 text-white/80">{new Date(m.markedAt).toLocaleString('es-HN')}</td>
                    <td className="py-2 px-3 text-white">{m.user.name || m.user.username}</td>
                    <td className="py-2 px-3 text-white/80">{m.role}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          m.type === 'IN' ? 'bg-green-600/20 text-green-300' : 'bg-orange-600/20 text-orange-300'
                        }`}
                      >
                        {m.type === 'IN' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-white/70">
                      <div>{m.latitude.toFixed(5)}, {m.longitude.toFixed(5)}</div>
                      <div>Precisión: {Math.round(m.accuracyMeters)}m</div>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedImage(m.selfieUrl)}
                        className="px-2 py-1 rounded bg-primary-600 hover:bg-primary-700 text-white text-xs"
                      >
                        Ver selfie
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs rounded bg-dark-200 text-white disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs text-white/70">Página {page} de {meta.totalPages}</span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs rounded bg-dark-200 text-white disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/70 p-4 flex items-center justify-center" onClick={() => setSelectedImage(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Selfie de marcaje" className="w-full max-h-[80vh] object-contain rounded-lg border border-dark-200" />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="mt-3 px-3 py-2 rounded bg-dark-200 text-white text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
