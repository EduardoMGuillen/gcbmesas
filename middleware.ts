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

    // Admin routes - only allow ADMIN role
    if (path.startsWith('/admin')) {
      // If coming from auth-callback, allow access (session was just verified server-side)
      const fromCallback = req.nextUrl.searchParams.get('from') === 'callback'
      
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

    // Mesero routes - allow MESERO and ADMIN roles
    if (path.startsWith('/mesero')) {
      // If coming from auth-callback, allow access (session was just verified server-side)
      // This is important for iOS where edge middleware may not read cookies immediately
      const fromCallback = req.nextUrl.searchParams.get('from') === 'callback'
      
      if (fromCallback) {
        // Coming from auth-callback, session was verified there - allow access
        console.log('[Middleware] Allowing /mesero - coming from auth-callback (session verified server-side)')
        return NextResponse.next()
      }
      
      if (!token || !['MESERO', 'ADMIN'].includes(token.role as string)) {
        console.log('[Middleware] Blocked /mesero - no token or wrong role', {
          hasToken: !!token,
          role: token?.role,
        })
        return NextResponse.redirect(new URL('/login', req.url))
      } else {
        console.log('[Middleware] Allowed /mesero - token valid', { role: token.role })
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
  matcher: ['/admin/:path*', '/mesero/:path*', '/mesa/:path*'],
  // Don't match auth-callback to allow it to work
}

