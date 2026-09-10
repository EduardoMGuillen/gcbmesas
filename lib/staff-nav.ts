export type StaffRole =
  | 'ADMIN'
  | 'MESERO'
  | 'CAJERO'
  | 'TAQUILLA'
  | 'COCINA'
  | 'BAR'
  | 'CLIENTE_TICKETERA'

export type StaffNavItem = {
  href: string
  label: string
  icon: string
  exact?: boolean
}

export type StaffNavGroup = {
  id: string
  label: string
  items: StaffNavItem[]
}

export const ICONS = {
  dashboard:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  mesas:
    'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  cuentas:
    'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  inventario:
    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  usuarios:
    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  logs: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  reportes:
    'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  clock:
    'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  mesero:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  mesasActivas:
    'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  ticket:
    'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  cajero:
    'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  scan: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
  pedido:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  cocina:
    'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
  bar: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  ruta: 'M4 6h16M4 12h10M4 18h7',
  config:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  warning:
    'M12 9v2m0 4v.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
}

export const adminNavGroups: StaffNavGroup[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    items: [{ href: '/admin', label: 'Dashboard', icon: ICONS.dashboard, exact: true }],
  },
  {
    id: 'salon',
    label: 'Salón',
    items: [
      { href: '/admin/mesas', label: 'Mesas', icon: ICONS.mesas },
      { href: '/admin/cuentas', label: 'Cuentas', icon: ICONS.cuentas },
      { href: '/admin/inventario', label: 'Inventario', icon: ICONS.inventario },
    ],
  },
  {
    id: 'comandas',
    label: 'Comandas',
    items: [
      { href: '/cocina', label: 'Cocina', icon: ICONS.cocina, exact: true },
      { href: '/bar', label: 'Bar', icon: ICONS.bar, exact: true },
      { href: '/admin/comandas', label: 'Ruta comandas', icon: ICONS.ruta },
    ],
  },
  {
    id: 'piso',
    label: 'Piso',
    items: [
      { href: '/mesero', label: 'Mesero', icon: ICONS.mesero, exact: true },
      { href: '/cajero', label: 'Cajero', icon: ICONS.cajero, exact: true },
      { href: '/taquilla', label: 'Taquilla', icon: ICONS.ticket },
    ],
  },
  {
    id: 'eventos',
    label: 'Eventos',
    items: [
      { href: '/admin/entradas', label: 'Entradas', icon: ICONS.ticket },
      { href: '/admin/entradas/rechazos-pago', label: 'Rechazos pago', icon: ICONS.warning },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    items: [
      { href: '/admin/usuarios', label: 'Usuarios', icon: ICONS.usuarios },
      { href: '/admin/configuracion', label: 'Configuración', icon: ICONS.config },
      { href: '/admin/marcajes', label: 'Marcajes', icon: ICONS.clock },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    items: [
      { href: '/admin/reportes', label: 'Reportes', icon: ICONS.reportes },
      { href: '/admin/logs', label: 'Logs', icon: ICONS.logs },
    ],
  },
]

export const meseroDesktopLinks: StaffNavItem[] = [
  { href: '/mesero', label: 'Panel', icon: ICONS.dashboard, exact: true },
  { href: '/mesero/scan', label: 'Escanear', icon: ICONS.scan },
  { href: '/mesero/pedidos', label: 'Pedido', icon: ICONS.pedido },
  { href: '/mesero/mesas-activas', label: 'Mesas', icon: ICONS.mesasActivas },
  { href: '/admin/cuentas', label: 'Cuentas', icon: ICONS.cuentas },
]

export const meseroDesktopOverflow: StaffNavItem[] = [
  { href: '/mesero/marcajes', label: 'Marcaje', icon: ICONS.clock },
  { href: '/taquilla', label: 'Taquilla', icon: ICONS.ticket },
]

export const meseroMoreLinks: StaffNavItem[] = [
  { href: '/mesero', label: 'Panel', icon: ICONS.dashboard, exact: true },
  { href: '/mesero/marcajes', label: 'Marcaje', icon: ICONS.clock },
  { href: '/taquilla', label: 'Taquilla', icon: ICONS.ticket },
]

export const meseroBottomLinks: StaffNavItem[] = [
  { href: '/mesero/scan', label: 'Escanear', icon: ICONS.scan },
  { href: '/mesero/pedidos', label: 'Pedido', icon: ICONS.pedido },
  { href: '/mesero/mesas-activas', label: 'Mesas', icon: ICONS.mesasActivas },
  { href: '/admin/cuentas', label: 'Cuentas', icon: ICONS.cuentas },
]

export const cajeroLinks: StaffNavItem[] = [
  { href: '/cajero', label: 'Cajero', icon: ICONS.cajero, exact: true },
  { href: '/admin/cuentas', label: 'Cuentas', icon: ICONS.cuentas },
  { href: '/cajero/marcajes', label: 'Marcaje', icon: ICONS.clock },
  { href: '/taquilla', label: 'Taquilla', icon: ICONS.ticket },
]

export function homeForRole(role: StaffRole): string {
  if (role === 'ADMIN') return '/admin'
  if (role === 'MESERO') return '/mesero'
  if (role === 'CAJERO') return '/cajero'
  if (role === 'COCINA') return '/cocina'
  if (role === 'BAR') return '/bar'
  if (role === 'CLIENTE_TICKETERA') return '/admin/entradas'
  return '/taquilla'
}

export function isNavActive(pathname: string | null, item: StaffNavItem): boolean {
  if (!pathname) return false
  if (item.href === '/admin/entradas') {
    return (
      pathname === '/admin/entradas' ||
      (pathname.startsWith('/admin/entradas/') && !pathname.startsWith('/admin/entradas/rechazos-pago'))
    )
  }
  if (
    item.exact ||
    item.href === '/admin' ||
    item.href === '/mesero' ||
    item.href === '/cajero' ||
    item.href === '/cocina' ||
    item.href === '/bar'
  ) {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function groupContainsPath(group: StaffNavGroup, pathname: string | null): boolean {
  return group.items.some((item) => isNavActive(pathname, item))
}
