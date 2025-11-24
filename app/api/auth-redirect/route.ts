import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    console.log('[AuthRedirect API] Checking session...')
    
    const session = await getServerSession(authOptions)
    
    console.log('[AuthRedirect API] Session check result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasRole: !!session?.user?.role,
      role: session?.user?.role,
      username: session?.user?.username,
    })
    
    if (!session || !session.user?.role) {
      return NextResponse.json({ 
        redirectUrl: '/login',
        hasSession: false,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      })
    }
    
    // Determine redirect URL based on role
    const redirectUrl = session.user.role === 'ADMIN' 
      ? '/admin' 
      : session.user.role === 'MESERO' 
      ? '/mesero' 
      : '/'
    
    console.log('[AuthRedirect API] Returning redirect URL:', redirectUrl)
    
    return NextResponse.json({ 
      redirectUrl,
      hasSession: true,
      role: session.user.role,
      username: session.user.username,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('[AuthRedirect API] Error:', error)
    return NextResponse.json({ 
      redirectUrl: '/login',
      hasSession: false,
      error: error.message,
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  }
}

