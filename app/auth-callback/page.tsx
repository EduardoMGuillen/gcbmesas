import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AuthCallbackPage() {
  console.log('[AuthCallback] Server-side session check started')
  
  // Try to get session with multiple attempts (important for mobile, especially iOS)
  let session = null
  const maxAttempts = 5 // Increased for iOS
  const baseDelay = 800 // Longer base delay for iOS
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[AuthCallback] Retry attempt ${attempt + 1}/${maxAttempts}`)
        // Progressive delay: 800ms, 1600ms, 2400ms, 3200ms
        const delay = baseDelay * attempt
        await new Promise((resolve) => setTimeout(resolve, delay))
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
    const redirectUrl =
      session.user.role === 'ADMIN'
        ? '/admin'
        : session.user.role === 'MESERO'
        ? '/mesero'
        : session.user.role === 'CAJERO'
        ? '/cajero'
        : '/'
    
    console.log('[AuthCallback] Redirecting to:', redirectUrl)
    // Add a query parameter to indicate we're coming from auth-callback
    // This helps the middleware know the session is valid
    redirect(`${redirectUrl}?from=callback`)
  } else {
    console.warn('[AuthCallback] No session found after server attempts, using client-side fallback (iOS may need more time)')
    // If no session found, use client-side component for polling
    // This is especially important for iOS where cookies can take longer to propagate
    const { default: AuthCallbackClient } = await import('./AuthCallbackClient')
    return <AuthCallbackClient initialRedirectUrl={null} />
  }
}

