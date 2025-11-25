'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', match: pathname === '/admin' },
    { href: '/admin/mesas', label: 'Mesas', match: pathname?.startsWith('/admin/mesas') },
    { href: '/admin/cuentas', label: 'Cuentas', match: pathname?.startsWith('/admin/cuentas') },
    { href: '/admin/inventario', label: 'Inventario', match: pathname?.startsWith('/admin/inventario') },
    { href: '/admin/usuarios', label: 'Usuarios', match: pathname?.startsWith('/admin/usuarios') },
    { href: '/admin/logs', label: 'Logs', match: pathname?.startsWith('/admin/logs') },
  ]

  const meseroLinks = [
    { href: '/mesero', label: 'Panel', match: pathname === '/mesero' },
  ]

  const links = session?.user.role === 'ADMIN' ? adminLinks : meseroLinks

  return (
    <nav className="bg-dark-100 border-b border-dark-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Desktop Menu */}
          <div className="flex items-center">
            <Link href="/" className="text-lg sm:text-xl font-bold text-white">
              La Gran Casa Blanca
            </Link>
            {/* Desktop Menu - Hidden on mobile */}
            <div className="hidden md:flex items-center ml-6 lg:ml-8 space-x-2 lg:space-x-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2 lg:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                    link.match
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-100 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Info and Mobile Menu Button */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* User info - Hidden on small mobile */}
            <span className="hidden sm:inline-block text-xs sm:text-sm text-dark-100 truncate max-w-[150px] lg:max-w-none">
              {session?.user.name || session?.user.username} ({session?.user.role})
            </span>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-dark-100 hover:text-white hover:bg-dark-200 rounded-md transition-colors touch-manipulation"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Logout Button - Desktop */}
            <button
              onClick={handleLogout}
              className="hidden md:block px-3 lg:px-4 py-2 text-xs sm:text-sm font-medium text-dark-300 hover:text-white hover:bg-dark-200 rounded-md transition-colors touch-manipulation"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-dark-200 py-4 space-y-2">
            {/* User info in mobile menu */}
            <div className="px-2 py-2 text-sm text-dark-100 border-b border-dark-200 mb-2">
              <div className="font-medium text-white">{session?.user.name || session?.user.username}</div>
              <div className="text-xs">{session?.user.role}</div>
            </div>
            
            {/* Mobile Links */}
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors touch-manipulation ${
                  link.match
                    ? 'bg-primary-600 text-white'
                    : 'text-dark-100 hover:text-white hover:bg-dark-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Logout in mobile menu */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-lg text-base font-medium text-dark-300 hover:text-white hover:bg-dark-200 transition-colors touch-manipulation"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

