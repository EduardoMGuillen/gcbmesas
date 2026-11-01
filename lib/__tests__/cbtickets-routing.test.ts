import { describe, it, expect } from 'vitest'
import { getCbtHosts, resolveCbtRequest } from '@/lib/cbtickets-routing'
import { CBT_HOME, CBT_EVENTS, cbtEventPath } from '@/lib/cbtickets-paths'

const cbtHosts = getCbtHosts('gcbtickets.localhost')
const cbt = (pathname: string, method = 'GET', host = 'gcbtickets.localhost') =>
  resolveCbtRequest({ host, pathname, method, cbtHosts })

describe('getCbtHosts', () => {
  it('incluye los dominios por defecto', () => {
    const hosts = getCbtHosts(undefined)
    expect(hosts).toContain('gcbtickets.com')
    expect(hosts).toContain('www.gcbtickets.com')
  })
  it('agrega hosts del env normalizados', () => {
    expect(getCbtHosts(' A.com , ')).toContain('a.com')
  })
})

describe('cbtickets paths', () => {
  it('expone rutas públicas', () => {
    expect(CBT_HOME).toBe('/')
    expect(CBT_EVENTS).toBe('/eventos')
    expect(cbtEventPath('abc')).toBe('/eventos/abc')
  })
})

describe('resolveCbtRequest', () => {
  it('no toca hosts que no son de GCBTickets', () => {
    expect(resolveCbtRequest({ host: 'lagrancasablanca.com', pathname: '/eventos', method: 'GET', cbtHosts })).toEqual({ kind: 'next' })
    expect(resolveCbtRequest({ host: 'lagrancasablanca.com', pathname: '/cbtickets', method: 'GET', cbtHosts })).toEqual({ kind: 'next' })
  })
  it('/ sirve el landing', () => {
    expect(cbt('/')).toEqual({ kind: 'rewrite', pathname: '/cbtickets' })
  })
  it('/eventos sirve el listado', () => {
    expect(cbt('/eventos')).toEqual({ kind: 'rewrite', pathname: '/cbtickets/eventos' })
    expect(cbt('/eventos/')).toEqual({ kind: 'rewrite', pathname: '/cbtickets/eventos' })
  })
  it('/eventos/:id sirve el detalle', () => {
    expect(cbt('/eventos/abc123')).toEqual({ kind: 'rewrite', pathname: '/cbtickets/abc123' })
  })
  it('/eventos/a/b cae al landing', () => {
    expect(cbt('/eventos/a/b')).toEqual({ kind: 'rewrite', pathname: '/cbtickets' })
  })
  it('redirige rutas viejas /cbtickets', () => {
    expect(cbt('/cbtickets')).toEqual({ kind: 'redirect', pathname: '/' })
    expect(cbt('/cbtickets/')).toEqual({ kind: 'redirect', pathname: '/' })
    expect(cbt('/cbtickets/eventos')).toEqual({ kind: 'redirect', pathname: '/eventos' })
    expect(cbt('/cbtickets/abc123')).toEqual({ kind: 'redirect', pathname: '/eventos/abc123' })
  })
  it('robots y sitemap propios de GCBTickets', () => {
    expect(cbt('/robots.txt')).toEqual({ kind: 'rewrite', pathname: '/cbtickets/robots.txt' })
    expect(cbt('/sitemap.xml')).toEqual({ kind: 'rewrite', pathname: '/cbtickets/sitemap.xml' })
  })
  it('deja pasar assets, api y rutas especiales', () => {
    for (const p of ['/cbtickets/sitemap.xml', '/api/x', '/_next/x', '/rifas', '/rifas/1', '/rifas.html', '/sw.js', '/manifest.json', '/favicon.ico', '/gcbtickets/logo.svg', '/Eventos/1.png']) {
      expect(cbt(p), p).toEqual({ kind: 'next' })
    }
  })
  it('cualquier otra ruta va al landing', () => {
    expect(cbt('/admin')).toEqual({ kind: 'rewrite', pathname: '/cbtickets' })
  })
  it('no reescribe métodos distintos de GET/HEAD', () => {
    expect(cbt('/', 'POST')).toEqual({ kind: 'next' })
    expect(cbt('/', 'HEAD')).toEqual({ kind: 'rewrite', pathname: '/cbtickets' })
  })
  it('acepta host con puerto y mayúsculas', () => {
    expect(cbt('/', 'GET', 'GCBTickets.localhost:3000')).toEqual({ kind: 'rewrite', pathname: '/cbtickets' })
  })
})
