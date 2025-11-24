import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Verify credentials
    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Log login
    try {
      await prisma.log.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: { username: user.username },
        },
      })
    } catch (logError) {
      console.error('[LoginMobile API] Failed to log login:', logError)
    }

    // Create JWT token with same format as NextAuth
    const token = await encode({
      token: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.username,
        email: null,
        picture: null,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    // Determine redirect URL
    const redirectUrl = user.role === 'ADMIN' ? '/admin' : user.role === 'MESERO' ? '/mesero' : '/'

    // Create response
    const response = NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    })

    // Set cookie with exact same name and options as NextAuth
    // NextAuth uses 'next-auth.session-token' in both dev and prod
    // (the __Secure- prefix is added automatically by browsers for secure cookies)
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      // Explicitly don't set domain - let browser handle it (important for mobile)
    })

    console.log('[LoginMobile API] Login successful, cookie set for user:', user.username)

    return response
  } catch (error: any) {
    console.error('[LoginMobile API] Error:', error)
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    )
  }
}

