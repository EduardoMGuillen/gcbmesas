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
      
      // Use NextAuth signIn directly - most reliable for mobile
      // NextAuth handles cookies correctly across all browsers and devices
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })
      
      console.log('[Login] SignIn result:', { ok: result?.ok, error: result?.error })

      // Check for errors
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
        console.log('[Login] NextAuth login successful, verifying session...')
        
        // Wait a bit for cookie to be set (important for mobile)
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        // Verify session with server - try multiple times for mobile
        let sessionVerified = false
        let redirectUrl = '/'
        const maxAttempts = 5
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            // Wait progressively longer between attempts
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
            }
            
            const sessionResponse = await fetch('/api/auth-redirect', {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
              },
            })
            
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json()
              console.log(`[Login] Session check (attempt ${attempt + 1}/${maxAttempts}):`, {
                hasSession: sessionData.hasSession,
                role: sessionData.role,
                redirectUrl: sessionData.redirectUrl,
              })
              
              if (sessionData.hasSession && sessionData.redirectUrl) {
                sessionVerified = true
                redirectUrl = sessionData.redirectUrl
                console.log('[Login] Session verified, redirecting to:', redirectUrl)
                break
              }
            }
          } catch (sessionError) {
            console.error(`[Login] Session verification error (attempt ${attempt + 1}):`, sessionError)
          }
        }

        if (sessionVerified) {
          // Session verified, redirect immediately
          console.log('[Login] Redirecting to:', redirectUrl)
          window.location.replace(redirectUrl)
          return
        } else {
          // Session not verified, but login was successful
          // Try to get role from debug-session as fallback
          try {
            const debugResponse = await fetch('/api/debug-session', {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            })
            
            if (debugResponse.ok) {
              const debugData = await debugResponse.json()
              if (debugData.hasSession && debugData.session?.user?.role) {
                const role = debugData.session.user.role
                redirectUrl = role === 'ADMIN' ? '/admin' : role === 'MESERO' ? '/mesero' : '/'
                console.log('[Login] Using debug-session, redirecting to:', redirectUrl)
                window.location.replace(redirectUrl)
                return
              }
            }
          } catch (debugError) {
            console.error('[Login] Debug session error:', debugError)
          }
          
          // Last resort: redirect to auth-callback which will handle it
          console.log('[Login] Session not verified, redirecting to auth-callback')
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
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-dark-50 safe-area-inset py-8 sm:py-4">
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="bg-dark-100 rounded-xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 border border-dark-200">
          <div className="text-center mb-5 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">TableControl</h1>
            <p className="text-xs sm:text-sm md:text-base text-dark-400">Sistema de Gestión de Mesas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm sm:text-base font-medium text-dark-300 mb-2"
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
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full px-4 py-3.5 sm:py-4 text-base bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Ingresa tu usuario"
                style={{ fontSize: '16px' }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm sm:text-base font-medium text-dark-300 mb-2"
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
                inputMode="text"
                className="w-full px-4 py-3.5 sm:py-4 text-base bg-dark-50 border border-dark-200 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Ingresa tu contraseña"
                style={{ fontSize: '16px' }}
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
              className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold py-4 sm:py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg touch-manipulation min-h-[48px] shadow-lg active:scale-[0.98]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                  <span className="text-sm sm:text-base">Iniciando sesión...</span>
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

