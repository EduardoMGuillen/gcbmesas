import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Importing node's crypto in middleware (Edge runtime) can fail, so read the secret directly
const MIDDLEWARE_SECRET = process.env.NEXTAUTH_SECRET

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const path = req.nextUrl.pathname

    // Intercept auth error route early to avoid NextAuth secret validation
    if (path === '/api/auth/error') {
      const target = new URL('/clientes', req.url)
      const tableId = req.nextUrl.searchParams.get('tableId')
      if (tableId) target.searchParams.set('tableId', tableId)
      return NextResponse.redirect(target, { status: 307 })
    }

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
    // Use the env-provided secret (middleware runs on Edge, avoid crypto here)
    secret: MIDDLEWARE_SECRET,
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
  // Incluir api/auth/error explícitamente y excluir /mesa del resto
  matcher: [
    '/api/auth/error',
    '/((?!api|_next/static|_next/image|favicon.ico|mesa|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
