'use client'

import { useState, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PushNotifyButton } from './PushNotifyButton'
import { Footer } from './Footer'
import { CleanUrlParams } from './CleanUrlParams'

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/admin/mesas', label: 'Mesas', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { href: '/admin/cuentas', label: 'Cuentas', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { href: '/admin/inventario', label: 'Inventario', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { href: '/admin/logs', label: 'Logs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/mesero', label: 'Mesero', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { href: '/mesero/mesas-activas', label: 'Mesas Activas', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/cajero', label: 'Cajero', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
]

type UserRole = 'ADMIN' | 'MESERO' | 'CAJERO'

export function AdminShell({ children, userRole }: { children: React.ReactNode; userRole: UserRole }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Mesero solo puede ver cuentas; redirigir si está en otra ruta admin
  useEffect(() => {
    if (userRole === 'MESERO' && pathname?.startsWith('/admin') && !pathname?.startsWith('/admin/cuentas')) {
      router.replace('/mesero')
    }
  }, [userRole, pathname, router])

  const isMeseroOnCuentas = userRole === 'MESERO' && pathname?.startsWith('/admin/cuentas')

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // Mesero en cuentas: layout simple con Navbar estándar (sin sidebar)
  if (isMeseroOnCuentas) {
    return (
      <div className="min-h-screen flex flex-col">
        <CleanUrlParams />
        <header className="bg-dark-100 border-b border-dark-200 sticky top-0 z-50">
          <div className="flex justify-between items-center h-14 px-4">
            <Link href="/mesero" className="text-lg font-bold text-white">
              La Gran Casa Blanca
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <PushNotifyButton />
              <span className="hidden sm:inline text-sm text-white/80 truncate max-w-[100px]">
                {session?.user.name || session?.user.username}
              </span>
              <Link
                href="/mesero"
                className="px-2 sm:px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-dark-200 rounded-md"
              >
                Panel
              </Link>
              <Link
                href="/mesero/mesas-activas"
                className="px-2 sm:px-3 py-2 text-sm font-medium text-primary-400"
              >
                Mesas Activas
              </Link>
              <button
                onClick={handleLogout}
                className="px-2 sm:px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-dark-200 rounded-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          {children}
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <CleanUrlParams />

      {/* Top bar - always visible */}
      <header className="bg-dark-100 border-b border-dark-200 sticky top-0 z-50 md:z-40 w-full md:absolute md:left-0 md:right-0">
        <div className="flex justify-between items-center h-14 sm:h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle - desktop only */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 text-white/70 hover:text-white hover:bg-dark-200 rounded-lg transition-colors"
              aria-label={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                )}
              </svg>
            </button>
            <Link href="/admin" className="text-lg sm:text-xl font-bold text-white">
              La Gran Casa Blanca
            </Link>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white hover:bg-dark-200 rounded-md"
              aria-label="Menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <PushNotifyButton />
            <span className="hidden sm:inline-block text-xs sm:text-sm text-white/80 truncate max-w-[120px] lg:max-w-none">
              {session?.user.name || session?.user.username} (Admin)
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-dark-200 rounded-md transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-dark-200 py-3 px-4 space-y-1 max-h-[70vh] overflow-y-auto">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  (link.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(link.href))
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-dark-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Sidebar - desktop only */}
      <aside
        className={`hidden md:flex flex-col bg-dark-100 border-r border-dark-200 fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] transition-all duration-200 ${
          sidebarOpen ? 'w-56' : 'w-16'
        }`}
      >
        <nav className="flex-1 py-4 overflow-y-auto">
          {adminLinks.map((link) => {
            const match = link.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                  match
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-dark-200'
                }`}
                title={!sidebarOpen ? link.label : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                </svg>
                {sidebarOpen && <span>{link.label}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 flex flex-col min-h-screen pt-14 md:pt-14 transition-all duration-200 ${
          sidebarOpen ? 'md:pl-56' : 'md:pl-16'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex-1 w-full">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  )
}
