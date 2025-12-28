import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Esta ruta intercepta errores de NextAuth cuando se accede desde URLs de preview de Vercel
// y redirige a /clientes para permitir que los usuarios usen la aplicación sin autenticación
// Esta ruta específica tiene prioridad sobre el catch-all [...nextauth]
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Siempre redirigir a /clientes - esta ruta solo existe para interceptar errores de NextAuth
  // y evitar que se muestre la página de error de NextAuth
  const clientesUrl = new URL('/clientes', request.nextUrl.origin)
  
  // Preservar tableId si viene en los query params (por si alguien intenta acceder desde /mesa)
  const tableId = request.nextUrl.searchParams.get('tableId')
  if (tableId) {
    clientesUrl.searchParams.set('tableId', tableId)
  }
  
  console.log('[Auth Error Handler] Redirecting to /clientes to bypass NextAuth error')
  return NextResponse.redirect(clientesUrl, { status: 307 })
}
