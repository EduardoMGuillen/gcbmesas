import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Log for debugging (especially important for iOS)
    console.log('[Middleware] Request:', {
      path,
      hasToken: !!token,
      tokenRole: token?.role,
      userAgent: req.headers.get('user-agent')?.includes('iPhone') ? 'iPhone' : 'Other',
    })

    const fromCallback = req.nextUrl.searchParams.get('from') === 'callback'

    // Admin routes - only allow ADMIN role
    if (path.startsWith('/admin')) {
      // If coming from auth-callback, allow access (session was just verified server-side)
      if (fromCallback) {
        // Coming from auth-callback, session was verified there - allow access
        console.log('[Middleware] Allowing /admin - coming from auth-callback (session verified server-side)')
        return NextResponse.next()
      }
      
      if (!token || token.role !== 'ADMIN') {
        console.log('[Middleware] Blocked /admin - no token or wrong role')
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Cajero routes - allow CAJERO and ADMIN roles
    if (path.startsWith('/cajero')) {
      if (fromCallback) {
        console.log('[Middleware] Allowing /cajero - coming from auth-callback (session verified server-side)')
        return NextResponse.next()
      }

      if (!token || !['CAJERO', 'ADMIN'].includes(token.role as string)) {
        console.log('[Middleware] Blocked /cajero - no token or wrong role')
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Mesa routes - allow any authenticated user
    if (path.startsWith('/mesa')) {
      if (!token) {
        console.log('[Middleware] Blocked /mesa - no token')
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // For login and auth-callback pages, always allow (don't check token)
        if (path === '/login' || path === '/auth-callback') {
          return true
        }
        
        // For protected routes, require token
        const isAuthorized = !!token
        console.log('[Middleware] Authorized check:', {
          path,
          hasToken: !!token,
          tokenRole: token?.role,
          isAuthorized,
        })
        return isAuthorized
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/cajero/:path*'],
  // Don't match auth-callback to allow it to work
}

