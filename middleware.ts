import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withAuth } from 'next-auth/middleware'

// Crear el middleware con withAuth solo para rutas que lo necesitan
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

// Middleware principal que maneja /mesa antes de pasar a authMiddleware
export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Manejar rutas /mesa PRIMERO - redirigir sin pasar por NextAuth
  if (path.startsWith('/mesa/')) {
    const mesaMatch = path.match(/^\/mesa\/([^/?]+)/)
    const mesaId = mesaMatch ? mesaMatch[1] : null
    if (mesaId) {
      const clientesUrl = new URL(`/clientes?tableId=${mesaId}`, req.url)
      return NextResponse.redirect(clientesUrl, { status: 307 })
    }
    const clientesUrl = new URL('/clientes', req.url)
    return NextResponse.redirect(clientesUrl, { status: 307 })
  }

  // Para todas las demás rutas, usar el middleware con autenticación
  return authMiddleware(req as NextRequest & { nextauth: { token: any } })
}

export const config = {
  // Incluir todas las rutas excepto estáticas, API y /mesa
  // /mesa se maneja manualmente arriba antes de pasar a authMiddleware
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
