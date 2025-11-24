import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.role) {
      return NextResponse.json({ 
        redirectUrl: '/login',
        hasSession: false,
      })
    }
    
    // Determine redirect URL based on role
    const redirectUrl = session.user.role === 'ADMIN' 
      ? '/admin' 
      : session.user.role === 'MESERO' 
      ? '/mesero' 
      : '/'
    
    return NextResponse.json({ 
      redirectUrl,
      hasSession: true,
      role: session.user.role,
    })
  } catch (error: any) {
    console.error('Auth redirect error:', error)
    return NextResponse.json({ 
      redirectUrl: '/login',
      hasSession: false,
      error: error.message,
    }, { status: 500 })
  }
}

