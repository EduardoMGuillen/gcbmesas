import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Rutas /mesa - redirigir directamente a /clientes sin intentar autenticar
  // Esto evita que NextAuth falle con errores de configuración
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

  // Para rutas protegidas, verificar token manualmente
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const fromCallback = req.nextUrl.searchParams.get('from') === 'callback'

    // Admin routes - only allow ADMIN role
    if (path.startsWith('/admin')) {
      if (fromCallback) {
        return NextResponse.next()
      }
      
      if (!token || token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Cajero routes - allow CAJERO and ADMIN roles
    if (path.startsWith('/cajero')) {
      if (fromCallback) {
        return NextResponse.next()
      }

      if (!token || !['CAJERO', 'ADMIN'].includes(token.role as string)) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Mesero routes - allow MESERO and ADMIN roles
    if (path.startsWith('/mesero')) {
      if (fromCallback) {
        return NextResponse.next()
      }

      if (!token || !['MESERO', 'ADMIN'].includes(token.role as string)) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return NextResponse.next()
  } catch (error) {
    // Si hay error obteniendo el token, redirigir a login para rutas protegidas
    if (path.startsWith('/admin') || path.startsWith('/cajero') || path.startsWith('/mesero')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }
}

export const config = {
  // Incluir todas las rutas excepto estáticas y API
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
