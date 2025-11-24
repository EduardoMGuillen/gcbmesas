'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (status === 'loading') {
      return // Still loading
    }

    if (status === 'authenticated' && session?.user?.role && !redirecting) {
      setRedirecting(true)
      
      // Determine redirect URL based on role
      const redirectUrl = session.user.role === 'ADMIN' 
        ? '/admin' 
        : session.user.role === 'MESERO' 
        ? '/mesero' 
        : '/'
      
      console.log('Auth callback - redirecting to:', redirectUrl)
      
      // Use replace to avoid adding to history
      // For mobile, use href instead of router.push for better compatibility
      if (typeof window !== 'undefined') {
        window.location.replace(redirectUrl)
      }
    } else if (status === 'unauthenticated' && !redirecting) {
      setRedirecting(true)
      console.log('Auth callback - not authenticated, redirecting to login')
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      }
    }
  }, [status, session, redirecting, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-50">
      <div className="text-center">
        <div className="text-white text-lg mb-4">Verificando sesión...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
      </div>
    </div>
  )
}

