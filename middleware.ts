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
    // The authorized callback already allowed this, so just continue
    if (fromCallback) {
      return NextResponse.next()
    }

    // Admin routes - only allow ADMIN role
    if (path.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Cajero routes - allow CAJERO and ADMIN roles
    if (path.startsWith('/cajero')) {
      if (!token || !['CAJERO', 'ADMIN'].includes(token.role as string)) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Mesero routes - allow MESERO and ADMIN roles
    if (path.startsWith('/mesero')) {
      if (!token || !['MESERO', 'ADMIN'].includes(token.role as string)) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

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
        
        // For protected routes, require token
        return !!token
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
