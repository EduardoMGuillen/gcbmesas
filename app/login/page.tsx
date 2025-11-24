'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Attempting login for user:', username)
      
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: '/',
      })

      console.log('Login result:', result)

      if (result?.error) {
        console.error('Login error:', result.error)
        // Mostrar mensaje más específico
        if (result.error === 'CredentialsSignin') {
          setError('Usuario o contraseña incorrectos. Verifica tus credenciales.')
        } else if (result.error.includes('database') || result.error.includes('connection')) {
          setError('Error de conexión a la base de datos. Verifica la configuración.')
        } else {
          setError(`Error: ${result.error}. Revisa los logs del servidor.`)
        }
        setLoading(false)
        return
      }

      if (result?.ok) {
        console.log('Login successful, verifying session and redirecting...')
        
        // Wait for cookie to be set (longer wait for iOS/Safari)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        // Multiple redirect strategies for maximum compatibility
        let redirectSuccess = false
        
        // Strategy 1: Try server-side redirect endpoint
        try {
          const redirectResponse = await fetch('/api/auth-redirect', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          })
          
          if (redirectResponse.ok) {
            const redirectData = await redirectResponse.json()
            if (redirectData.redirectUrl) {
              console.log('Server redirect URL:', redirectData.redirectUrl)
              window.location.href = redirectData.redirectUrl
              redirectSuccess = true
            }
          }
        } catch (redirectError) {
          console.warn('Server redirect failed, trying alternative:', redirectError)
        }
        
        // Strategy 2: Verify session and redirect client-side
        if (!redirectSuccess) {
          try {
            const sessionResponse = await fetch('/api/debug-session', {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
              },
            })
            
            const sessionData = await sessionResponse.json()
            console.log('Session check result:', sessionData)
            
            if (sessionData.hasSession && sessionData.session?.user?.role) {
              const role = sessionData.session.user.role
              console.log('Session verified, redirecting to:', role === 'ADMIN' ? '/admin' : '/mesero')
              
              // Redirect based on role
              const redirectUrl = role === 'ADMIN' ? '/admin' : role === 'MESERO' ? '/mesero' : '/'
              
              // Force a full page reload for iOS/Safari compatibility
              window.location.href = redirectUrl
              redirectSuccess = true
            }
          } catch (sessionError) {
            console.warn('Session check failed:', sessionError)
          }
        }
        
        // Strategy 3: Fallback - redirect to home and let server handle it
        if (!redirectSuccess) {
          console.log('Using fallback redirect to home...')
          window.location.href = '/'
        }
      } else {
        console.error('Login failed - unexpected result:', result)
        setError('Error desconocido al iniciar sesión. Por favor, intenta nuevamente.')
        setLoading(false)
      }
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

