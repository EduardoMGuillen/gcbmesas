'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-dark-50">
          <div className="max-w-md w-full bg-dark-100 border border-dark-200 rounded-xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Error Crítico
              </h1>
              <p className="text-dark-400">
                Ha ocurrido un error crítico en la aplicación
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

            <button
              onClick={reset}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Recargar Página
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

