import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin routes - only allow ADMIN role
    if (path.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        // If no token or wrong role, redirect to login
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Mesero routes - allow MESERO and ADMIN roles
    if (path.startsWith('/mesero')) {
      if (!token || !['MESERO', 'ADMIN'].includes(token.role as string)) {
        // If no token or wrong role, redirect to login
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Mesa routes - allow any authenticated user
    if (path.startsWith('/mesa')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // For login and auth-callback pages, always allow (don't check token)
        if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/auth-callback') {
          return true
        }
        // For protected routes, require token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/mesero/:path*', '/mesa/:path*'],
  // Don't match auth-callback to allow it to work
}

