'use client'

import { useState, useEffect } from 'react'

export default function DiagnosticoPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkDatabase()
  }, [])

  const checkDatabase = async () => {
    try {
      const response = await fetch('/api/check-db')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        success: false,
        error: 'No se pudo conectar al servidor',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-50">
      <div className="max-w-2xl w-full bg-dark-100 border border-dark-200 rounded-xl p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Diagnóstico del Sistema</h1>

        {loading ? (
          <div className="text-dark-400">Verificando...</div>
        ) : status ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border ${
                status.success
                  ? 'bg-green-500/20 border-green-500/50'
                  : 'bg-red-500/20 border-red-500/50'
              }`}
            >
              <p
                className={`font-semibold ${
                  status.success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {status.message}
              </p>
            </div>

            <div className="bg-dark-50 border border-dark-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">
                Estado de la Base de Datos
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Conexión:</span>
                  <span
                    className={`font-semibold ${
                      status.database === 'connected'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {status.database === 'connected' ? '✓ Conectada' : '✗ Error'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Usuario Admin:</span>
                  <span
                    className={`font-semibold ${
                      status.adminExists ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {status.adminExists ? '✓ Existe' : '✗ No existe'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Total Usuarios:</span>
                  <span className="text-white font-semibold">
                    {status.userCount || 0}
                  </span>
                </div>
              </div>
            </div>

            {status.error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-sm text-red-400">
                  <strong>Error:</strong> {status.error}
                </p>
              </div>
            )}

            {!status.adminExists && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                <p className="text-sm text-yellow-400 mb-2">
                  <strong>⚠️ Acción Requerida:</strong>
                </p>
                <p className="text-xs text-dark-400 mb-3">
                  El usuario administrador no existe. Necesitas ejecutar el seed:
                </p>
                <code className="block bg-dark-50 px-4 py-2 rounded text-xs text-primary-400">
                  npm run db:seed
                </code>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={checkDatabase}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Verificar de Nuevo
              </button>
              <a
                href="/login"
                className="flex-1 bg-dark-200 hover:bg-dark-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
              >
                Ir al Login
              </a>
            </div>
          </div>
        ) : (
          <div className="text-red-400">Error al cargar el diagnóstico</div>
        )}
      </div>
    </div>
  )
}

