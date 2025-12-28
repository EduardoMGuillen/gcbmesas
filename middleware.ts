// IMPORTANT: Import auth-secret FIRST to ensure NEXTAUTH_SECRET is set before withAuth initializes
import '@/lib/auth-secret'

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const path = req.nextUrl.pathname

    // Rutas públicas - permitir acceso sin autenticación
    if (path.startsWith('/clientes') || path === '/login' || path === '/auth-callback') {
      return NextResponse.next()
    }

    const token = req.nextauth.token
    const fromCallback = req.nextUrl.searchParams.get('from') === 'callback'

    // If coming from auth-callback, allow access (session was just verified server-side)
    if (fromCallback) {
      return NextResponse.next()
    }

    // Only verify roles if token is available
    if (token) {
      // Admin routes - only allow ADMIN role
      if (path.startsWith('/admin')) {
        if (token.role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/login', req.url))
        }
      }

      // Cajero routes - allow CAJERO and ADMIN roles
      if (path.startsWith('/cajero')) {
        if (!['CAJERO', 'ADMIN'].includes(token.role as string)) {
          return NextResponse.redirect(new URL('/login', req.url))
        }
      }

      // Mesero routes - allow MESERO and ADMIN roles
      if (path.startsWith('/mesero')) {
        if (!['MESERO', 'ADMIN'].includes(token.role as string)) {
          return NextResponse.redirect(new URL('/login', req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }: { token: any; req: NextRequest }) => {
        const path = req.nextUrl.pathname
        
        // For /clientes, login and auth-callback pages, always allow (don't check token)
        if (path.startsWith('/clientes') || path === '/login' || path === '/auth-callback') {
          return true
        }
        
        const fromCallback = req.nextUrl.searchParams.get('from') === 'callback'
        if (fromCallback) {
          return true
        }
        
        return true
      },
    },
  }
)

export const config = {
  // EXCLUIR /mesa completamente del matcher
  // La página del servidor manejará la redirección para /mesa
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|mesa|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
