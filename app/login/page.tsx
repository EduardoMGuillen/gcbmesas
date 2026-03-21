'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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
        session.user.role === 'MESERO'   ? '/mesero'   :
        session.user.role === 'CAJERO'   ? '/cajero'   :
        session.user.role === 'TAQUILLA' ? '/taquilla' : '/'
      router.replace(`${url}?from=callback`)
      return
    }
    if (status === 'unauthenticated') {
      const refetchT = setTimeout(async () => {
        const s = await getSession()
        if (s?.user?.role) {
          const url =
            s.user.role === 'ADMIN'    ? '/admin'    :
            s.user.role === 'MESERO'   ? '/mesero'   :
            s.user.role === 'CAJERO'   ? '/cajero'   :
            s.user.role === 'TAQUILLA' ? '/taquilla' : '/'
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050015' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: '#00ffff' }} />
          <p className="text-white/60 text-sm">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, #050015 0%, #0a0020 100%)' }}>
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,255,255,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={72} height={72} className="mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-white mb-1">Acceso de Personal</h1>
          <p className="text-white/40 text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,255,255,0.15)', borderRadius: 20, padding: '2rem' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white/60 mb-2">
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
                style={{ fontSize: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', padding: '12px 16px', width: '100%', outline: 'none' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,255,255,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/60 mb-2">
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
                style={{ fontSize: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', padding: '12px 16px', width: '100%', outline: 'none' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,255,255,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 14 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(0,255,255,0.2)' : 'linear-gradient(45deg, #00ffff, #0099bb)',
                color: loading ? 'rgba(255,255,255,0.4)' : '#000',
                fontWeight: 700, fontSize: 16, transition: 'all 0.3s', minHeight: 48,
                WebkitTapHighlightColor: 'transparent',
              } as any}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Iniciando sesión...
                </span>
              ) : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link href="/" style={{ color: 'rgba(0,255,255,0.5)', fontSize: 13, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,255,255,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,255,255,0.5)')}
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
