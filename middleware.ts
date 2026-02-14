import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'

// Importing node's crypto in middleware (Edge runtime) can fail, so read the secret directly
const MIDDLEWARE_SECRET =
  (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32
    ? process.env.NEXTAUTH_SECRET
    : process.env.NEXT_PUBLIC_FALLBACK_SECRET) ||
  'hard-fallback-secret-32-chars-minimum-string!'

// Base auth middleware for protected routes
const authMiddleware = withAuth(
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
      // Admin routes - ADMIN always, MESERO/CAJERO for /admin/cuentas, CAJERO also for /admin/entradas
      if (path.startsWith('/admin')) {
        const allowed =
          token.role === 'ADMIN' ||
          ((token.role === 'MESERO' || token.role === 'CAJERO') && path.startsWith('/admin/cuentas')) ||
          (token.role === 'CAJERO' && path.startsWith('/admin/entradas'))
        if (!allowed) {
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

// Wrapper middleware to bypass auth for specific routes before withAuth runs
export default function middleware(req: NextRequest, evt: NextFetchEvent) {
  const path = req.nextUrl.pathname

  // Exclude public redirects and API auth routes from NextAuth/middleware
  // /api/auth/error must never reach NextAuth to avoid NO_SECRET
  if (path === '/api/auth/error' || path.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Let /mesa/* bypass auth entirely (handled by page redirect)
  if (path.startsWith('/mesa')) {
    return NextResponse.next()
  }

  // Let /entradas/validar/* bypass auth (public QR validation page)
  if (path.startsWith('/entradas/validar')) {
    return NextResponse.next()
  }

  // For everything else, run the auth middleware
  return (authMiddleware as any)(req, evt)
}

export const config = {
  // Match everything except static assets; sw.js and manifest.json must be public for PWA/push on Android
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
