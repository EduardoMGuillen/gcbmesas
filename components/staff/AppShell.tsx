'use client'

import { useEffect, useState, Suspense } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PushSubscriptionButton } from '@/components/PushSubscriptionButton'
import { RefreshButton } from '@/components/RefreshButton'
import { CleanUrlParams } from '@/components/CleanUrlParams'
import { StaffThemeProvider } from '@/lib/staff-theme'
import {
  adminNavGroups,
  cajeroLinks,
  groupContainsPath,
  homeForRole,
  isNavActive,
  meseroBottomLinks,
  meseroDesktopLinks,
  meseroDesktopOverflow,
  meseroMoreLinks,
  type StaffNavItem,
  type StaffRole,
} from '@/lib/staff-nav'
import { NavIcon, ThemeToggle } from './ui'

function StaffFooter() {
  return (
    <footer className="w-full py-4 text-center border-t border-staff-border mt-auto">
      <p className="text-staff-muted text-sm">
        Powered by{' '}
        <a
          href="https://www.instagram.com/nexus_suministros/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-500 hover:text-primary-400 transition-colors underline"
        >
          Nexus Global Suministros
        </a>
      </p>
    </footer>
  )
}

function NavLink({
  item,
  pathname,
  onClick,
  collapsed,
  dense,
}: {
  item: StaffNavItem
  pathname: string | null
  onClick?: () => void
  collapsed?: boolean
  dense?: boolean
}) {
  const active = isNavActive(pathname, item)
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
        dense ? 'px-3 py-2' : 'px-3 py-2.5'
      } ${
        active
          ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
          : 'text-staff-muted hover:text-staff-fg hover:bg-staff-hover'
      }`}
    >
      <NavIcon d={item.icon} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

function AppShellInner({
  children,
  userRole,
}: {
  children: React.ReactNode
  userRole: StaffRole
}) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const chrome: 'sidebar' | 'topbar' | 'simple' =
    userRole === 'ADMIN' ? 'sidebar' : userRole === 'MESERO' || userRole === 'CAJERO' ? 'topbar' : 'simple'

  useEffect(() => {
    if (
      userRole === 'CLIENTE_TICKETERA' &&
      pathname?.startsWith('/admin') &&
      pathname !== '/admin/entradas'
    ) {
      router.replace('/admin/entradas')
    }
    if (
      (userRole === 'MESERO' || userRole === 'CAJERO') &&
      pathname?.startsWith('/admin') &&
      !pathname?.startsWith('/admin/cuentas')
    ) {
      router.replace(userRole === 'CAJERO' ? '/cajero' : '/mesero')
    }
  }, [userRole, pathname, router])

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      for (const group of adminNavGroups) {
        if (groupContainsPath(group, pathname)) next[group.id] = true
      }
      return next
    })
  }, [pathname])

  const floorLinks = userRole === 'CAJERO' ? cajeroLinks : meseroDesktopLinks
  const overflowLinks = userRole === 'MESERO' ? meseroDesktopOverflow : []
  const moreLinks = userRole === 'MESERO' ? meseroMoreLinks : []
  const bottomLinks = userRole === 'CAJERO' ? cajeroLinks : meseroBottomLinks

  const displayName = session?.user.name || session?.user.username || ''
  const roleLabel =
    userRole === 'ADMIN'
      ? 'Admin'
      : userRole === 'MESERO'
      ? 'Mesero'
      : userRole === 'CAJERO'
      ? 'Cajero'
      : userRole === 'COCINA'
      ? 'Cocina'
      : userRole === 'BAR'
      ? 'Bar'
      : userRole === 'CLIENTE_TICKETERA'
      ? 'Ticketera'
      : 'Taquilla'

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const toggleGroup = (id: string) => {
    const group = adminNavGroups.find((g) => g.id === id)
    setOpenGroups((prev) => {
      const currently = prev[id] ?? (group ? groupContainsPath(group, pathname) : false)
      return { ...prev, [id]: !currently }
    })
  }

  const closeOverlays = () => {
    setMobileMenuOpen(false)
    setMoreOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={null}>
        <CleanUrlParams />
      </Suspense>

      <header className="bg-staff-surface/90 backdrop-blur-md border-b border-staff-border fixed top-0 z-50 w-full left-0 right-0 pt-safe">
        <div className="flex justify-between items-center h-14 sm:h-16 px-3 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {chrome === 'sidebar' && (
              <>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden md:flex p-2 text-staff-muted hover:text-staff-fg hover:bg-staff-hover rounded-xl transition-colors"
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
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-staff-muted hover:text-staff-fg hover:bg-staff-hover rounded-xl"
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
              </>
            )}

            <Link href={homeForRole(userRole)} className="flex items-center gap-2 min-w-0">
              <Image
                src="/LogoCasaBlanca.png"
                alt="Casa Blanca"
                width={36}
                height={36}
                className="h-8 w-auto object-contain"
              />
              <span className="hidden lg:inline text-sm font-semibold text-staff-fg truncate">
                GCB
              </span>
            </Link>

            {chrome === 'topbar' && (
              <nav className="hidden md:flex items-center gap-1 ml-4">
                {floorLinks.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} dense />
                ))}
                {overflowLinks.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMoreOpen((v) => !v)}
                      className="px-3 py-2 rounded-xl text-sm font-medium text-staff-muted hover:text-staff-fg hover:bg-staff-hover"
                    >
                      Más
                    </button>
                    {moreOpen && (
                      <div className="absolute left-0 mt-1 w-48 bg-staff-surface border border-staff-border rounded-xl shadow-lg p-1 z-50">
                        {overflowLinks.map((item) => (
                          <NavLink
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            onClick={() => setMoreOpen(false)}
                            dense
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1.5">
            <ThemeToggle />
            <RefreshButton />
            <PushSubscriptionButton />
            <span className="hidden sm:inline-block text-xs text-staff-muted truncate max-w-[140px] lg:max-w-[220px] px-2">
              {displayName} · {roleLabel}
            </span>
            <button
              onClick={handleLogout}
              className={`${
                chrome === 'simple' ? 'inline-flex' : 'hidden md:inline-flex'
              } px-3 py-2 text-xs sm:text-sm font-medium text-staff-muted hover:text-staff-fg hover:bg-staff-hover rounded-xl transition-colors`}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {chrome === 'sidebar' && mobileMenuOpen && (
          <div className="md:hidden border-t border-staff-border py-3 px-3 space-y-3 max-h-[75vh] overflow-y-auto bg-staff-surface">
            {adminNavGroups.map((group) => (
              <div key={group.id}>
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-staff-muted">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onClick={closeOverlays}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-staff-muted hover:text-staff-fg hover:bg-staff-hover"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {chrome === 'sidebar' && (
        <aside
          className={`hidden md:flex flex-col bg-staff-surface border-r border-staff-border fixed left-0 top-header-safe z-30 h-below-header-safe transition-all duration-200 ${
            sidebarOpen ? 'w-60' : 'w-16'
          }`}
        >
          <nav className="flex-1 py-3 overflow-y-auto px-2">
            {adminNavGroups.map((group) => {
              const isOpen =
                !sidebarOpen ||
                (openGroups[group.id] !== undefined
                  ? openGroups[group.id]
                  : groupContainsPath(group, pathname))
              return (
                <div key={group.id} className="mb-1">
                  {sidebarOpen && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-staff-muted hover:text-staff-fg"
                    >
                      {group.label}
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  {(isOpen || !sidebarOpen) && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.href}
                          item={item}
                          pathname={pathname}
                          collapsed={!sidebarOpen}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </aside>
      )}

      <main
        className={`flex-1 flex flex-col min-h-screen pt-header-safe transition-all duration-200 ${
          chrome === 'sidebar' ? (sidebarOpen ? 'md:pl-60' : 'md:pl-16') : ''
        } ${chrome === 'topbar' ? 'pb-staff-nav md:pb-0' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex-1 w-full">
          {children}
        </div>
        <div className={chrome === 'topbar' ? 'hidden md:block' : ''}>
          <StaffFooter />
        </div>
      </main>

      {chrome === 'topbar' && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-staff-surface/95 backdrop-blur-md border-t border-staff-border h-staff-bottom">
          <div className="grid grid-cols-5 h-full">
            {bottomLinks.map((item) => {
              const active = isNavActive(pathname, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium touch-manipulation ${
                    active ? 'text-primary-500' : 'text-staff-muted'
                  }`}
                >
                  <NavIcon d={item.icon} className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-staff-muted touch-manipulation"
            >
              <NavIcon d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" className="w-5 h-5" />
              Más
            </button>
          </div>
        </nav>
      )}

      {chrome === 'topbar' && moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 inset-x-0 bg-staff-surface border-t border-staff-border rounded-t-2xl p-4 pb-8 space-y-1">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-staff-muted">
              {displayName} · {roleLabel}
            </p>
            {moreLinks.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onClick={() => setMoreOpen(false)}
              />
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-staff-muted hover:text-staff-fg hover:bg-staff-hover"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AppShell({
  children,
  userRole,
}: {
  children: React.ReactNode
  userRole: StaffRole
}) {
  return (
    <StaffThemeProvider>
      <AppShellInner userRole={userRole}>{children}</AppShellInner>
    </StaffThemeProvider>
  )
}

export { AppShell as AdminShell }
