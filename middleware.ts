import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Crear middleware wrapper que maneja /mesa ANTES de withAuth
function createMiddleware() {
  // Crear el middleware con withAuth para rutas protegidas
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
        authorized: ({ token, req }) => {
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

  // Retornar un middleware wrapper que maneja /mesa primero
  return function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname

    // Manejar rutas /mesa ANTES de cualquier procesamiento de NextAuth
    if (path.startsWith('/mesa/')) {
      const mesaMatch = path.match(/^\/mesa\/([^/?]+)/)
      const mesaId = mesaMatch ? mesaMatch[1] : null
      if (mesaId) {
        return NextResponse.redirect(new URL(`/clientes?tableId=${mesaId}`, req.url))
      }
      return NextResponse.redirect(new URL('/clientes', req.url))
    }

    // Para otras rutas, usar el middleware con withAuth
    return authMiddleware(req)
  }
}

export default createMiddleware()

export const config = {
  // Incluir todas las rutas excepto estáticas y API
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
