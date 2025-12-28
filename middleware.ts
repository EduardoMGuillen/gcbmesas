import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const path = req.nextUrl.pathname

    // Rutas /mesa - redirigir directamente a /clientes sin intentar autenticar
    if (path.startsWith('/mesa/')) {
      const mesaMatch = path.match(/^\/mesa\/([^/?]+)/)
      const mesaId = mesaMatch ? mesaMatch[1] : null
      if (mesaId) {
        return NextResponse.redirect(new URL(`/clientes?tableId=${mesaId}`, req.url))
      }
      return NextResponse.redirect(new URL('/clientes', req.url))
    }

    // Rutas públicas - permitir acceso sin autenticación
    if (path.startsWith('/clientes') || path === '/login' || path === '/auth-callback') {
      return NextResponse.next()
    }

    const token = req.nextauth.token
    const fromCallback = req.nextUrl.searchParams.get('from') === 'callback'

    // If coming from auth-callback, allow access (session was just verified server-side)
    // The CleanUrlParams component will handle removing the query parameter client-side
    if (fromCallback) {
      return NextResponse.next()
    }

    // Only verify roles if token is available
    // If token is not available, let pages verify session with getServerSession
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
    // If token is not available, allow the request to proceed
    // Pages will verify session with getServerSession and redirect if needed

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        const fromCallback = req.nextUrl.searchParams.get('from') === 'callback'
        
        // For /mesa, /clientes, login and auth-callback pages, always allow (don't check token)
        // This prevents NextAuth from failing on these routes
        if (path.startsWith('/mesa') || path.startsWith('/clientes') || path === '/login' || path === '/auth-callback') {
          return true
        }
        
        // If coming from auth-callback, allow access (session was just verified server-side)
        if (fromCallback) {
          return true
        }
        
        // For protected routes, allow access even if token is not available
        // Let the pages themselves verify the session with getServerSession
        // This gives pages a chance to check the session even if middleware token is unavailable
        return true
      },
    },
  }
)

export const config = {
  // Incluir todas las rutas excepto estáticas y API
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
