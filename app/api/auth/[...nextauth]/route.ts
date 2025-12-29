import crypto from 'crypto'

// Hard-set NEXTAUTH_SECRET before importing NextAuth to avoid NO_SECRET
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
  process.env.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex')
  console.warn('[NextAuth] NEXTAUTH_SECRET missing, generated fallback for this route.')
}

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

