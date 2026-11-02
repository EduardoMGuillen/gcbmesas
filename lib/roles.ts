import type { UserRole } from '@prisma/client'

/** Página de inicio de cada rol. Fuente única para login, callbacks, redirecciones y menú. */
export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: '/admin',
  CLIENTE_TICKETERA: '/admin/entradas',
  MESERO: '/mesero',
  CAJERO: '/cajero',
  TAQUILLA: '/taquilla',
  COCINA: '/cocina',
  BAR: '/bar',
}

/** Inicio del rol; '/' si el rol no existe o no hay sesión. */
export function roleHome(role: string | null | undefined): string {
  if (!role) return '/'
  return (ROLE_HOME as Record<string, string>)[role] ?? '/'
}
