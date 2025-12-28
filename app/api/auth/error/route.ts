import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Esta ruta intercepta errores de NextAuth cuando se accede desde URLs de preview de Vercel
// y redirige a /clientes para permitir que los usuarios usen la aplicación sin autenticación
// Esta ruta específica tiene prioridad sobre el catch-all [...nextauth]
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const error = searchParams.get('error')
    
    console.log('[Auth Error Handler] Error received:', error)
    
    // Si es un error de Configuration o NO_SECRET (como cuando se escanea un QR con preview URL),
    // redirigir a /clientes para que el usuario pueda usar la aplicación
    if (error === 'Configuration' || error === 'NO_SECRET') {
      console.log('[Auth Error Handler] Configuration/NO_SECRET error detected, redirecting to /clientes')
      // Construir la URL base correctamente usando el origin de la request
      const clientesUrl = new URL('/clientes', request.nextUrl.origin)
      return NextResponse.redirect(clientesUrl, { status: 307 })
    }
    
    // Para otros casos, redirigir a la página de error de login
    const loginErrorUrl = new URL('/login/error', request.nextUrl.origin)
    searchParams.forEach((value, key) => {
      loginErrorUrl.searchParams.set(key, value)
    })
    
    return NextResponse.redirect(loginErrorUrl, { status: 307 })
  } catch (error) {
    // Si algo falla, simplemente redirigir a /clientes como fallback
    console.error('[Auth Error Handler] Error in error handler:', error)
    const clientesUrl = new URL('/clientes', request.nextUrl.origin)
    return NextResponse.redirect(clientesUrl, { status: 307 })
  }
}
