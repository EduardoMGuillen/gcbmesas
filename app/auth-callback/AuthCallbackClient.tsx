'use client'

import { useEffect, useState } from 'react'

interface AuthCallbackClientProps {
  initialRedirectUrl: string | null
}

export default function AuthCallbackClient({ initialRedirectUrl }: AuthCallbackClientProps) {
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'error'>('checking')
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 10

  useEffect(() => {
    // If we already have a redirect URL from server, use it immediately
    if (initialRedirectUrl) {
      console.log('Auth callback - Using server redirect URL:', initialRedirectUrl)
      setStatus('redirecting')
      setTimeout(() => {
        window.location.href = initialRedirectUrl
      }, 300)
      return
    }

    // Otherwise, poll the server for session
    const checkSession = async () => {
      if (attempts >= maxAttempts) {
        console.error('Auth callback - Max attempts reached, redirecting to login')
        setStatus('error')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
        return
      }

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
          
          if (data.hasSession && data.redirectUrl) {
            console.log('Auth callback - Session found, redirecting to:', data.redirectUrl)
            setStatus('redirecting')
            setTimeout(() => {
              window.location.href = data.redirectUrl
            }, 300)
            return
          }
        }

        // Session not ready yet, try again
        setAttempts(prev => prev + 1)
        setTimeout(checkSession, 500)
      } catch (error) {
        console.error('Auth callback - Error checking session:', error)
        setAttempts(prev => prev + 1)
        if (attempts < maxAttempts - 1) {
          setTimeout(checkSession, 500)
        } else {
          setStatus('error')
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
        }
      }
    }

    // Start checking after a short delay to allow cookies to be set
    const timeout = setTimeout(() => {
      checkSession()
    }, 1000)

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

