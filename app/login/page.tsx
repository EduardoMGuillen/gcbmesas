'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  // Clean up callbackUrl from URL to avoid redirect loops
  useEffect(() => {
    if (searchParams.get('callbackUrl')) {
      // Remove callbackUrl from URL to prevent redirect loops
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Attempting login for user:', username)
      
      // Use redirect: false to handle redirect manually for better mobile compatibility
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: '/auth-callback',
      })
      
      console.log('Login result:', result)

      // Check for errors first
      if (result?.error) {
        console.error('Login error:', result.error)
        setLoading(false)
        // Mostrar mensaje más específico
        if (result.error === 'CredentialsSignin') {
          setError('Usuario o contraseña incorrectos. Verifica tus credenciales.')
        } else if (result.error.includes('database') || result.error.includes('connection')) {
          setError('Error de conexión a la base de datos. Verifica la configuración.')
        } else {
          setError(`Error: ${result.error}. Revisa los logs del servidor.`)
        }
        return
      }

      // Check if login was successful
      if (result?.ok) {
        console.log('Login successful, waiting for session cookie...')
        // Wait a bit for the session cookie to be set (especially important for mobile)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        // Verify session before redirecting
        try {
          const sessionCheck = await fetch('/api/debug-session', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          })
          
          const sessionData = await sessionCheck.json()
          console.log('Session check result:', sessionData)
          
          if (sessionData.hasSession && sessionData.session?.user?.role) {
            console.log('Session verified, redirecting to callback...')
            // Redirect to callback page which will handle final redirect
            window.location.href = '/auth-callback'
          } else {
            console.warn('Session not available yet, redirecting anyway...')
            // Redirect anyway - the callback page will handle retries
            window.location.href = '/auth-callback'
          }
        } catch (sessionError) {
          console.warn('Session check failed, redirecting anyway:', sessionError)
          // Redirect anyway - the callback page will handle retries
          window.location.href = '/auth-callback'
        }
        return
      }

      // If we get here, something unexpected happened
      console.error('Unexpected login result:', result)
      setError('Error desconocido al iniciar sesión. Por favor, intenta nuevamente.')
      setLoading(false)
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err?.message || 'Error al iniciar sesión. Revisa la consola para más detalles.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-100 rounded-2xl shadow-2xl p-8 border border-dark-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">TableControl</h1>
            <p className="text-dark-400">Sistema de Gestión de Mesas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-dark-300 mb-2"
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-dark-300 mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ingresa tu contraseña"
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
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

