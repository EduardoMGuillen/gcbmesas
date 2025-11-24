import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AuthCallbackClient from './AuthCallbackClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AuthCallbackPage() {
  // Try to get session on server first
  let initialSession = null
  let redirectUrl = null
  
  try {
    // Wait a bit for the session cookie to be set (especially important for mobile)
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    initialSession = await getServerSession(authOptions)
    
    if (initialSession?.user?.role) {
      redirectUrl = initialSession.user.role === 'ADMIN' 
        ? '/admin' 
        : initialSession.user.role === 'MESERO' 
        ? '/mesero' 
        : '/'
    }
  } catch (error) {
    console.error('Auth callback server error:', error)
  }

  // Render the loading UI and let the client component handle the redirect
  // This works better on mobile because it gives time for cookies to be set
  return <AuthCallbackClient initialRedirectUrl={redirectUrl} />
}

