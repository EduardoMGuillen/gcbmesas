'use client'

import { useEffect, useState } from 'react'

interface AuthCallbackClientProps {
  initialRedirectUrl: string | null
}

export default function AuthCallbackClient({ initialRedirectUrl }: AuthCallbackClientProps) {
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'error'>('checking')
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 10 // Increased for mobile - cookies can take longer to propagate

  useEffect(() => {
    // If we already have a redirect URL from server, use it immediately
    if (initialRedirectUrl) {
      console.log('[AuthCallback Client] Using server redirect URL:', initialRedirectUrl)
      setStatus('redirecting')
      setTimeout(() => {
        window.location.replace(initialRedirectUrl)
      }, 200)
      return
    }

    // Check session cookie first
    const checkCookie = (): boolean => {
      if (typeof document === 'undefined') return false
      const cookies = document.cookie.split(';')
      return cookies.some(cookie => 
        cookie.trim().startsWith('next-auth.session-token=')
      )
    }

    // Poll the server for session
    const checkSession = async () => {
      if (attempts >= maxAttempts) {
        console.error('[AuthCallback Client] Max attempts reached, redirecting to login')
        setStatus('error')
        setTimeout(() => {
          window.location.replace('/login')
        }, 1500)
        return
      }

      const attemptNum = attempts + 1
      console.log(`[AuthCallback Client] Checking session (attempt ${attemptNum}/${maxAttempts})...`)

      // Check cookie first
      const hasCookie = checkCookie()
      console.log(`[AuthCallback Client] Cookie check: ${hasCookie ? 'found' : 'missing'}`)

      try {
        const response = await fetch('/api/auth-redirect', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log('[AuthCallback Client] Server response:', {
            hasSession: data.hasSession,
            redirectUrl: data.redirectUrl,
            role: data.role,
          })
          
          if (data.hasSession && data.redirectUrl) {
            console.log('[AuthCallback Client] Session found, redirecting to:', data.redirectUrl)
            setStatus('redirecting')
            setTimeout(() => {
              window.location.replace(data.redirectUrl)
            }, 200)
            return
          }
        } else {
          console.warn(`[AuthCallback Client] Server responded with status: ${response.status}`)
        }

        // Session not ready yet, try again with progressive delay
        setAttempts(prev => prev + 1)
        const delay = Math.min(300 * (attemptNum + 1), 2000) // Progressive delay, max 2s
        setTimeout(checkSession, delay)
      } catch (error) {
        console.error('[AuthCallback Client] Error checking session:', error)
        setAttempts(prev => prev + 1)
        if (attemptNum < maxAttempts) {
          const delay = Math.min(300 * (attemptNum + 1), 2000) // Progressive delay
          setTimeout(checkSession, delay)
        } else {
          setStatus('error')
          setTimeout(() => {
            window.location.replace('/login')
          }, 1500)
        }
      }
    }

    // Start checking after a short delay (longer for mobile)
    const timeout = setTimeout(() => {
      checkSession()
    }, 800)

    return () => clearTimeout(timeout)
  }, [initialRedirectUrl, attempts, maxAttempts])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-50">
      <div className="text-center">
        <div className="text-white text-lg mb-4">
          {status === 'checking' && 'Verificando sesión...'}
          {status === 'redirecting' && 'Redirigiendo...'}
          {status === 'error' && 'Error al verificar sesión. Redirigiendo al login...'}
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        {status === 'checking' && attempts > 0 && (
          <div className="text-dark-400 text-sm mt-4">
            Intento {attempts} de {maxAttempts}
          </div>
        )}
      </div>
    </div>
  )
}

