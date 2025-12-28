import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Esta ruta intercepta errores de NextAuth cuando se accede desde URLs de preview de Vercel
// y redirige a /clientes para permitir que los usuarios usen la aplicación sin autenticación
// Esta ruta específica tiene prioridad sobre el catch-all [...nextauth]
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const error = searchParams.get('error')
  
  // Si es un error de Configuration (como cuando se escanea un QR con preview URL),
  // redirigir a /clientes para que el usuario pueda usar la aplicación
  if (error === 'Configuration') {
    console.log('[Auth Error Handler] Configuration error detected, redirecting to /clientes')
    return NextResponse.redirect(new URL('/clientes', request.url))
  }
  
  // Para otros casos, redirigir a la página de error de login
  const loginErrorUrl = new URL('/login/error', request.url)
  searchParams.forEach((value, key) => {
    loginErrorUrl.searchParams.set(key, value)
  })
  
  return NextResponse.redirect(loginErrorUrl)
}
