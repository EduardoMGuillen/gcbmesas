import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    console.log('[DebugSession API] Checking session...')
    
    const session = await getServerSession(authOptions)
    
    const result = {
      hasSession: !!session,
      session: session ? {
        user: {
          id: session.user?.id,
          username: session.user?.username,
          role: session.user?.role,
        },
      } : null,
      timestamp: new Date().toISOString(),
    }
    
    console.log('[DebugSession API] Result:', {
      hasSession: result.hasSession,
      role: result.session?.user?.role,
      username: result.session?.user?.username,
    })
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('[DebugSession API] Error:', error)
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

