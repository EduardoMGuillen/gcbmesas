'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const errorMessages: Record<string, string> = {
  Configuration: 'Hay un problema con la configuración del servidor. Verifica las variables de entorno.',
  AccessDenied: 'No tienes permiso para acceder.',
  Verification: 'El token de verificación ha expirado o ya fue usado.',
  Default: 'Ocurrió un error inesperado durante la autenticación.',
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-50">
      <div className="max-w-md w-full bg-dark-100 border border-red-500/50 rounded-xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error de Autenticación</h1>
          <p className="text-dark-400">{errorMessage}</p>
        </div>

        {error && (
          <div className="bg-dark-50 border border-dark-200 rounded-lg p-4 mb-6">
            <p className="text-xs text-dark-400 mb-1">Código de error:</p>
            <code className="text-sm text-red-400">{error}</code>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
          >
            Intentar de Nuevo
          </Link>
          <Link
            href="/diagnostico"
            className="block w-full bg-dark-200 hover:bg-dark-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
          >
            Ver Diagnóstico
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-dark-200">
          <p className="text-xs text-dark-400 mb-2">Posibles causas:</p>
          <ul className="text-xs text-dark-500 space-y-1 list-disc list-inside">
            <li>Usuario o contraseña incorrectos</li>
            <li>El usuario no existe en la base de datos</li>
            <li>Error de conexión a la base de datos</li>
            <li>Variables de entorno no configuradas</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function LoginError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-dark-50">
        <div className="text-dark-400">Cargando...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}

