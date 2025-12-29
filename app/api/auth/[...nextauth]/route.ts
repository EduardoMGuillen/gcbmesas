// IMPORTANT: Import auth-secret FIRST to ensure NEXTAUTH_SECRET is set before NextAuth initializes
import '@/lib/auth-secret'
import { NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Runtime enforced to nodejs
export const runtime = 'nodejs'

// Pre-create NextAuth handler with safe secret (authOptions already contains fallback)
const nextAuthHandler = NextAuth(authOptions)

export async function GET(req: Request) {
  const hasSecret =
    process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32

  if (!hasSecret) {
    console.warn('[NextAuth] NEXTAUTH_SECRET missing, redirecting to /clientes (GET)')
    return NextResponse.redirect(new URL('/clientes', req.url), { status: 307 })
  }

  return nextAuthHandler(req)
}

export async function POST(req: Request) {
  const hasSecret =
    process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32

  if (!hasSecret) {
    console.warn('[NextAuth] NEXTAUTH_SECRET missing, redirecting to /clientes (POST)')
    return NextResponse.redirect(new URL('/clientes', req.url), { status: 307 })
  }

  return nextAuthHandler(req)
}

