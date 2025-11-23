'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <nav className="bg-dark-100 border-b border-dark-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-white">
              TableControl
            </Link>
            {session?.user.role === 'ADMIN' && (
              <div className="flex space-x-4">
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/admin'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/mesas"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith('/admin/mesas')
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  Mesas
                </Link>
                <Link
                  href="/admin/cuentas"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith('/admin/cuentas')
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  Cuentas
                </Link>
                <Link
                  href="/admin/inventario"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith('/admin/inventario')
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  Inventario
                </Link>
                <Link
                  href="/admin/usuarios"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith('/admin/usuarios')
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  Usuarios
                </Link>
                <Link
                  href="/admin/logs"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith('/admin/logs')
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  Logs
                </Link>
              </div>
            )}
            {session?.user.role === 'MESERO' && (
              <div className="flex space-x-4">
                <Link
                  href="/mesero"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/mesero'
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-300 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  Panel
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-dark-300">
              {session?.user.username} ({session?.user.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-white hover:bg-dark-200 rounded-md transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

