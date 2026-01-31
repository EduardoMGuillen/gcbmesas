// IMPORTANT: Import auth-secret FIRST to ensure NEXTAUTH_SECRET is set in process.env
// This must happen before any NextAuth-related imports
import './auth-secret'
import { NEXTAUTH_SECRET } from './auth-secret'

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

// Guarantee a valid secret even if env is missing (preview safety)
const HARD_FALLBACK_SECRET = 'hard-fallback-secret-32-chars-minimum-string!'
const EFFECTIVE_SECRET =
  (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32
    ? process.env.NEXTAUTH_SECRET
    : NEXTAUTH_SECRET) || HARD_FALLBACK_SECRET

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            console.error('Auth: Missing credentials')
            return null
          }

          // Test database connection
          try {
            await prisma.$connect()
          } catch (dbError) {
            console.error('Auth: Database connection error:', dbError)
            throw new Error('Database connection failed')
          }

          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          })

          if (!user) {
            console.error(`Auth: User not found: ${credentials.username}`)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.error(`Auth: Invalid password for user: ${credentials.username}`)
            return null
          }

          // Log login (don't fail if logging fails)
          try {
            await prisma.log.create({
              data: {
                userId: user.id,
                action: 'LOGIN',
                details: { username: user.username },
              },
            })
          } catch (logError) {
            console.error('Auth: Failed to log login:', logError)
            // Don't fail authentication if logging fails
          }

          console.log(`Auth: Successful login for user: ${user.username}`)

          return {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
          }
        } catch (error: any) {
          console.error('Auth: Error in authorize:', error)
          // Re-throw database errors so NextAuth can handle them properly
          if (error.message?.includes('Database')) {
            throw error
          }
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        console.log('JWT callback - User signed in:', { id: user.id, username: user.username, role: user.role })
        token.id = user.id
        token.role = user.role
        token.username = user.username
        token.name = (user as any).name || null
      }
      // Session update trigger
      if (trigger === 'update') {
        // Optionally refresh user data from database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, username: true, name: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.username = dbUser.username
          token.name = dbUser.name
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.username = (token.username as string) || ''
        session.user.name = (token.name as string) || null
        console.log('Session callback - Session created:', {
          userId: session.user.id,
          username: session.user.username,
          role: session.user.role,
        })
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    // Si NextAuth lanza error de config, redirigir a clientes
    error: '/clientes',
  },
  // Recordar sesión siempre: 1 año. Cookies con maxAge persisten al cerrar webapp (iOS/Android).
  session: {
    strategy: 'jwt',
    maxAge: 365 * 24 * 60 * 60, // 365 días
    updateAge: 24 * 60 * 60,
  },
  // Nombre de cookie debe coincidir con useSecureCookies en producción (__Secure- prefix)
  useSecureCookies: process.env.NODE_ENV === 'production' || (process.env.NEXTAUTH_URL?.startsWith('https') ?? false),
  cookies: {
    sessionToken: {
      name: (process.env.NODE_ENV === 'production' || process.env.NEXTAUTH_URL?.startsWith('https'))
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60, // 365 días - persistente (evita logout al cerrar PWA)
      },
    },
    callbackUrl: {
      name: (process.env.NODE_ENV === 'production' || process.env.NEXTAUTH_URL?.startsWith('https'))
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 días
      },
    },
    csrfToken: {
      name: (process.env.NODE_ENV === 'production' || process.env.NEXTAUTH_URL?.startsWith('https'))
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
      },
    },
  },
  // Use the secret that we've ensured is valid (env, generated, or hard fallback)
  secret: EFFECTIVE_SECRET,
  debug: process.env.NODE_ENV === 'development',
  // Explicitly set NEXTAUTH_URL if provided (helps with cookie domain/secure settings)
  ...(process.env.NEXTAUTH_URL && { url: process.env.NEXTAUTH_URL }),
}

