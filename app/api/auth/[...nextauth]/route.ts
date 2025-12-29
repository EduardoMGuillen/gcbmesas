// IMPORTANT: Import auth-secret FIRST to ensure NEXTAUTH_SECRET is set before NextAuth initializes
import '@/lib/auth-secret'
import { NextResponse } from 'next/server'

// Si no hay NEXTAUTH_SECRET disponible, redirigir a /clientes y no inicializar NextAuth
const hasSecret =
  process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32

export const runtime = 'nodejs'

if (!hasSecret) {
  console.warn('[NextAuth] NEXTAUTH_SECRET missing, bypassing NextAuth and redirecting to /clientes')

  export async function GET(req: Request) {
    return NextResponse.redirect(new URL('/clientes', req.url), { status: 307 })
  }

  export async function POST(req: Request) {
    return NextResponse.redirect(new URL('/clientes', req.url), { status: 307 })
  }
} else {
  const NextAuth = (await import('next-auth')).default
  const { authOptions } = await import('@/lib/auth')
  const handler = NextAuth(authOptions)
  export { handler as GET, handler as POST }
}

