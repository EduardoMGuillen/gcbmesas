import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    console.log('[TestSession API] Checking session...')
    
    // Check cookies directly
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('next-auth.session-token')
    const secureSessionToken = cookieStore.get('__Secure-next-auth.session-token')
    
    console.log('[TestSession API] Cookies found:', {
      hasSessionToken: !!sessionToken,
      hasSecureSessionToken: !!secureSessionToken,
      sessionTokenValue: sessionToken?.value ? 'exists' : 'missing',
      secureSessionTokenValue: secureSessionToken?.value ? 'exists' : 'missing',
    })
    
    // Try to get session
    const session = await getServerSession(authOptions)
    
    const result = {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasRole: !!session?.user?.role,
      role: session?.user?.role,
      username: session?.user?.username,
      cookies: {
        hasSessionToken: !!sessionToken,
        hasSecureSessionToken: !!secureSessionToken,
        sessionTokenName: sessionToken?.name,
        secureSessionTokenName: secureSessionToken?.name,
      },
      allCookies: cookieStore.getAll().map(c => c.name),
      timestamp: new Date().toISOString(),
    }
    
    console.log('[TestSession API] Result:', result)
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('[TestSession API] Error:', error)
    return NextResponse.json({
      error: error.message,
      hasSession: false,
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  }
}

