'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { StaffThemeProvider } from '@/lib/staff-theme'
import { ThemeToggle, Panel, StaffButton } from '@/components/staff/ui'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionCheckDone, setSessionCheckDone] = useState(false)

  useEffect(() => {
    if (status !== 'loading' && session?.user?.role) {
      const url =
        session.user.role === 'ADMIN'    ? '/admin'    :
        session.user.role === 'CLIENTE_TICKETERA' ? '/admin/entradas' :
        session.user.role === 'MESERO'   ? '/mesero'   :
        session.user.role === 'CAJERO'   ? '/cajero'   :
        session.user.role === 'TAQUILLA' ? '/taquilla' :
        session.user.role === 'COCINA' ? '/cocina'   :
        session.user.role === 'BAR'    ? '/bar'      : '/'
      router.replace(`${url}?from=callback`)
      return
    }
    if (status === 'unauthenticated') {
      const refetchT = setTimeout(async () => {
        const s = await getSession()
        if (s?.user?.role) {
          const url =
            s.user.role === 'ADMIN'    ? '/admin'    :
            s.user.role === 'CLIENTE_TICKETERA' ? '/admin/entradas' :
            s.user.role === 'MESERO'   ? '/mesero'   :
            s.user.role === 'CAJERO'   ? '/cajero'   :
            s.user.role === 'TAQUILLA' ? '/taquilla' :
            s.user.role === 'COCINA' ? '/cocina'   :
            s.user.role === 'BAR'    ? '/bar'      : '/'
          router.replace(`${url}?from=callback`)
        }
      }, 1000)
      const doneT = setTimeout(() => setSessionCheckDone(true), 2500)
      return () => { clearTimeout(refetchT); clearTimeout(doneT) }
    }
    if (status === 'authenticated' && !session?.user?.role) setSessionCheckDone(true)
    if (status === 'loading') {
      const t = setTimeout(() => setSessionCheckDone(true), 4000)
      return () => clearTimeout(t)
    }
  }, [status, session, router])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('error') === 'SessionNotFound') {
        setError('No se pudo establecer la sesión. Por favor, intenta nuevamente.')
        url.searchParams.delete('error')
        window.history.replaceState({}, '', url.pathname)
      }
      if (url.searchParams.get('callbackUrl')) {
        url.searchParams.delete('callbackUrl')
        window.history.replaceState({}, '', url.pathname)
      }
    }
  }, [])

  const checkSessionCookie = (): boolean => {
    if (typeof document === 'undefined') return false
    return document.cookie.split(';').some(c => c.trim().startsWith('next-auth.session-token='))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', { username, password, redirect: false })
      if (result?.error) {
        setLoading(false)
        setError(
          result.error === 'CredentialsSignin'
            ? 'Usuario o contraseña incorrectos.'
            : `Error: ${result.error}`
        )
        return
      }
      if (result?.ok) {
        checkSessionCookie()
        const isIPad = /iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
        await new Promise(r => setTimeout(r, isIPad ? 1500 : 1000))
        window.location.replace('/auth-callback')
      }
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión.')
      setLoading(false)
    }
  }

  if (!sessionCheckDone && (status === 'loading' || status === 'unauthenticated')) {
    return (
      <StaffThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-staff-bg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto mb-4" />
            <p className="text-staff-muted text-sm">Verificando sesión...</p>
          </div>
        </div>
      </StaffThemeProvider>
    )
  }

  return (
    <StaffThemeProvider>
      <div className="min-h-screen flex items-center justify-center px-4 bg-staff-bg relative">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={72} height={72} className="mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-staff-fg mb-1">Acceso de Personal</h1>
            <p className="text-staff-muted text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          <Panel>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-staff-muted mb-2">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="Ingresa tu usuario"
                  className="w-full px-4 py-3 bg-staff-raised border border-staff-border rounded-xl text-staff-fg placeholder:text-staff-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ fontSize: 16 }}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-staff-muted mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  className="w-full px-4 py-3 bg-staff-raised border border-staff-border rounded-xl text-staff-fg placeholder:text-staff-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ fontSize: 16 }}
                />
              </div>

              {error && (
                <div className="bg-red-500/15 border border-red-500/40 rounded-lg px-3.5 py-2.5 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <StaffButton type="submit" disabled={loading} className="w-full py-3 min-h-12 text-base">
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </StaffButton>
            </form>
          </Panel>

          <div className="text-center mt-6">
            <Link href="/" className="text-primary-500 hover:text-primary-400 text-[13px] no-underline">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </StaffThemeProvider>
  )
}
