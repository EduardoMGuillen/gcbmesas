import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CleanUrlParams } from '@/components/CleanUrlParams'
import { Suspense } from 'react'
import Link from 'next/link'
import { closeOldAccounts } from '@/lib/actions'

export default async function MeseroPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  // Cerrar cuentas antiguas en background (no bloquea)
  closeOldAccounts().catch((err) => console.error('[MeseroPage] Error al cerrar cuentas antiguas:', err))

  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={null}>
        <CleanUrlParams />
      </Suspense>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex-1">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            Panel de Mesero
          </h1>
          <p className="text-sm sm:text-base text-dark-400">
            Gestiona pedidos y cuentas de las mesas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Link
            href="/mesero/scan"
            className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 hover:border-primary-500 active:border-primary-500 transition-all hover:shadow-lg group touch-manipulation"
          >
            <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-600/20 rounded-lg mb-3 sm:mb-4 group-hover:bg-primary-600/30 transition-colors">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">
              Escanear QR
            </h2>
            <p className="text-xs sm:text-sm text-dark-400">
              Escanea el código QR de una mesa para ver su estado y agregar
              pedidos
            </p>
          </Link>

          <Link
            href="/mesero/pedidos"
            className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 hover:border-primary-500 active:border-primary-500 transition-all hover:shadow-lg group touch-manipulation"
          >
            <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-600/20 rounded-lg mb-3 sm:mb-4 group-hover:bg-primary-600/30 transition-colors">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">
              Agregar Pedido
            </h2>
            <p className="text-xs sm:text-sm text-dark-400">
              Agrega productos a una cuenta manualmente
            </p>
          </Link>

          <Link
            href="/mesero/mesas-activas"
            className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 hover:border-primary-500 active:border-primary-500 transition-all hover:shadow-lg group touch-manipulation"
          >
            <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-600/20 rounded-lg mb-3 sm:mb-4 group-hover:bg-primary-600/30 transition-colors">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">
              Mesas Activas
            </h2>
            <p className="text-xs sm:text-sm text-dark-400">
              Tus mesas abiertas con acceso rápido
            </p>
          </Link>

          {session.user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="bg-dark-100 border border-dark-200 rounded-xl p-4 sm:p-6 hover:border-primary-500 active:border-primary-500 transition-all hover:shadow-lg group touch-manipulation"
            >
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-600/20 rounded-lg mb-3 sm:mb-4 group-hover:bg-primary-600/30 transition-colors">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">
                Panel Admin
              </h2>
              <p className="text-xs sm:text-sm text-dark-400">
                Accede al panel de administración
              </p>
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

