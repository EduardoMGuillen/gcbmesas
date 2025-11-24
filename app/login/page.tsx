'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Clean up callbackUrl from URL to avoid redirect loops
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('callbackUrl')) {
        console.log('[Login] Cleaning up callbackUrl from URL')
        url.searchParams.delete('callbackUrl')
        window.history.replaceState({}, '', url.pathname)
      }
    }
  }, [])

  // Helper function to check if session cookie exists
  const checkSessionCookie = (): boolean => {
    if (typeof document === 'undefined') return false
    
    // Check for NextAuth session cookie
    const cookies = document.cookie.split(';')
    const sessionCookie = cookies.find(cookie => 
      cookie.trim().startsWith('next-auth.session-token=')
    )
    
    const hasCookie = !!sessionCookie
    console.log('[Login] Session cookie check:', { hasCookie, cookie: sessionCookie ? 'exists' : 'missing' })
    return hasCookie
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('[Login] Attempting login for user:', username)
      
      // Use redirect: false to handle redirect manually
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })
      
      console.log('[Login] SignIn result:', { ok: result?.ok, error: result?.error })

      // Check for errors first
      if (result?.error) {
        console.error('[Login] Login error:', result.error)
        setLoading(false)
        if (result.error === 'CredentialsSignin') {
          setError('Usuario o contraseña incorrectos. Verifica tus credenciales.')
        } else if (result.error.includes('database') || result.error.includes('connection')) {
          setError('Error de conexión a la base de datos. Verifica la configuración.')
        } else {
          setError(`Error: ${result.error}`)
        }
        return
      }

      // Check if login was successful
      if (result?.ok) {
        console.log('[Login] Login successful, verifying session cookie...')
        
        // Verify cookie was set with retries (important for mobile)
        let cookieVerified = false
        const maxRetries = 5
        const retryDelay = 400 // 400ms between retries
        
        for (let i = 0; i < maxRetries; i++) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
          
          if (checkSessionCookie()) {
            cookieVerified = true
            console.log(`[Login] Cookie verified on attempt ${i + 1}`)
            break
          }
          
          console.log(`[Login] Cookie check attempt ${i + 1}/${maxRetries} - not found yet`)
        }

        if (!cookieVerified) {
          console.warn('[Login] Cookie not found after retries, but proceeding anyway')
          // Still proceed - the callback page will handle it
        }

        // Verify session with server before redirecting
        try {
          console.log('[Login] Verifying session with server...')
          const sessionResponse = await fetch('/api/debug-session', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          })
          
          const sessionData = await sessionResponse.json()
          console.log('[Login] Session verification result:', {
            hasSession: sessionData.hasSession,
            role: sessionData.session?.user?.role,
          })
          
          if (sessionData.hasSession && sessionData.session?.user?.role) {
            const role = sessionData.session.user.role
            const redirectUrl = role === 'ADMIN' ? '/admin' : role === 'MESERO' ? '/mesero' : '/'
            console.log('[Login] Session verified, redirecting to:', redirectUrl)
            
            // Use replace for mobile compatibility
            window.location.replace(redirectUrl)
            return
          } else {
            console.log('[Login] Session not ready, redirecting to callback for retry')
            window.location.replace('/auth-callback')
            return
          }
        } catch (sessionError) {
          console.error('[Login] Session verification error:', sessionError)
          // Fallback: redirect to callback
          window.location.replace('/auth-callback')
          return
        }
      }

      // Unexpected result
      console.error('[Login] Unexpected login result:', result)
      setError('Error desconocido. Por favor, intenta nuevamente.')
      setLoading(false)
    } catch (err: any) {
      console.error('[Login] Login exception:', err)
      setError(err?.message || 'Error al iniciar sesión.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-50">
      <div className="w-full max-w-md">
        <div className="bg-dark-100 rounded-2xl shadow-2xl p-6 sm:p-8 border border-dark-200">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">TableControl</h1>
            <p className="text-sm sm:text-base text-dark-400">Sistema de Gestión de Mesas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                autoComplete="username"
                className="w-full px-4 py-3 text-base sm:text-lg bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                autoComplete="current-password"
                className="w-full px-4 py-3 text-base sm:text-lg bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ingresa tu contraseña"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm sm:text-base">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold py-3 sm:py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

