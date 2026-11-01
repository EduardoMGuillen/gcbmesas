/**
 * Enrutamiento por host de GCBTickets. Lógica pura: el middleware solo aplica la decisión.
 * Las páginas viven en app/cbtickets/*; en gcbtickets.com se exponen como /, /eventos y /eventos/:id.
 */

const DEFAULT_CBT_HOSTS = ['gcbtickets.com', 'www.gcbtickets.com']

export type CbtDecision =
  | { kind: 'next' }
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'redirect'; pathname: string }

export function getCbtHosts(envValue: string | undefined): string[] {
  const extra = (envValue || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set([...DEFAULT_CBT_HOSTS, ...extra]))
}

const PASSTHROUGH_PREFIXES = ['/api/', '/_next/', '/rifas/']
const PASSTHROUGH_EXACT = new Set(['/api', '/_next', '/rifas', '/rifas.html', '/favicon.ico', '/sw.js', '/manifest.json'])
const FILE_EXTENSION = /\.[a-z0-9]+$/i

export function resolveCbtRequest(input: {
  host: string
  pathname: string
  method: string
  cbtHosts: string[]
}): CbtDecision {
  const host = (input.host.split(':')[0] || '').toLowerCase()
  if (!input.cbtHosts.includes(host)) return { kind: 'next' }
  if (input.method !== 'GET' && input.method !== 'HEAD') return { kind: 'next' }

  const raw = input.pathname
  if (PASSTHROUGH_EXACT.has(raw) || PASSTHROUGH_PREFIXES.some((p) => raw.startsWith(p))) {
    return { kind: 'next' }
  }

  const path = raw.length > 1 ? raw.replace(/\/+$/, '') || '/' : raw

  // Rutas antiguas /cbtickets/* → URLs públicas nuevas (el sitemap se queda donde está)
  if (path === '/cbtickets') return { kind: 'redirect', pathname: '/' }
  if (path.startsWith('/cbtickets/')) {
    const rest = path.slice('/cbtickets/'.length)
    if (rest === 'sitemap.xml') return { kind: 'next' }
    if (rest === 'eventos') return { kind: 'redirect', pathname: '/eventos' }
    if (!rest.includes('/')) return { kind: 'redirect', pathname: `/eventos/${rest}` }
    return { kind: 'redirect', pathname: '/' }
  }

  if (FILE_EXTENSION.test(path)) return { kind: 'next' }

  if (path === '/') return { kind: 'rewrite', pathname: '/cbtickets' }
  if (path === '/eventos') return { kind: 'rewrite', pathname: '/cbtickets/eventos' }
  if (path.startsWith('/eventos/')) {
    const id = path.slice('/eventos/'.length)
    if (id && !id.includes('/')) return { kind: 'rewrite', pathname: `/cbtickets/${id}` }
  }
  return { kind: 'rewrite', pathname: '/cbtickets' }
}
