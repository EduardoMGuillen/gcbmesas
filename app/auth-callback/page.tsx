import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AuthCallbackPage() {
  console.log('[AuthCallback] Server-side session check started')
  
  // Try to get session with multiple attempts (important for mobile)
  let session = null
  const maxAttempts = 3
  const attemptDelay = 500 // 500ms between attempts
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[AuthCallback] Retry attempt ${attempt + 1}/${maxAttempts}`)
        await new Promise((resolve) => setTimeout(resolve, attemptDelay))
      }
      
      session = await getServerSession(authOptions)
      
      if (session?.user?.role) {
        console.log('[AuthCallback] Session found:', {
          attempt: attempt + 1,
          username: session.user.username,
          role: session.user.role,
        })
        break
      } else {
        console.log(`[AuthCallback] Attempt ${attempt + 1}: No session found yet`)
      }
    } catch (error) {
      console.error(`[AuthCallback] Attempt ${attempt + 1} error:`, error)
    }
  }

  if (session?.user?.role) {
    const redirectUrl = session.user.role === 'ADMIN' 
      ? '/admin' 
      : session.user.role === 'MESERO' 
      ? '/mesero' 
      : '/'
    
    console.log('[AuthCallback] Redirecting to:', redirectUrl)
    redirect(redirectUrl)
  } else {
    console.warn('[AuthCallback] No session found after all attempts, using client-side fallback')
    // If no session found, use client-side component for polling
    const { default: AuthCallbackClient } = await import('./AuthCallbackClient')
    return <AuthCallbackClient initialRedirectUrl={null} />
  }
}

