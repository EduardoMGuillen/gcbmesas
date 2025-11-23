'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-50">
      <div className="max-w-md w-full bg-dark-100 border border-dark-200 rounded-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Error de Aplicación
          </h1>
          <p className="text-dark-400">
            Ha ocurrido un error en el servidor
          </p>
        </div>

        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-400 mb-2">
            {error.message || 'Error desconocido'}
          </p>
          {error.digest && (
            <p className="text-xs text-dark-500">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={reset}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Intentar de Nuevo
          </button>
          <a
            href="/login"
            className="block w-full bg-dark-200 hover:bg-dark-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
          >
            Ir al Login
          </a>
        </div>

        <div className="mt-6 pt-6 border-t border-dark-200">
          <p className="text-xs text-dark-400">
            Si el problema persiste, verifica:
          </p>
          <ul className="text-xs text-dark-500 mt-2 space-y-1 list-disc list-inside">
            <li>Variables de entorno configuradas en Vercel</li>
            <li>Conexión a la base de datos</li>
            <li>Logs del servidor para más detalles</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

