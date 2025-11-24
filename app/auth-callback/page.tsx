import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AuthCallbackPage() {
  try {
    // Wait a bit for the session cookie to be set (especially important for mobile)
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    const session = await getServerSession(authOptions)
    
    console.log('Auth callback - Session check:', {
      hasSession: !!session,
      role: session?.user?.role,
    })

    if (!session || !session.user || !session.user.role) {
      console.log('Auth callback - No session, redirecting to login')
      redirect('/login')
      return
    }

    // Determine redirect URL based on role
    const redirectUrl = session.user.role === 'ADMIN' 
      ? '/admin' 
      : session.user.role === 'MESERO' 
      ? '/mesero' 
      : '/'
    
    console.log('Auth callback - Session verified, redirecting to:', redirectUrl)
    redirect(redirectUrl)
  } catch (error: any) {
    console.error('Auth callback error:', error)
    redirect('/login')
  }
}

