// IMPORTANT: Import auth-secret FIRST to ensure NEXTAUTH_SECRET is set before NextAuth initializes
// Hard-set NEXTAUTH_SECRET before importing NextAuth to avoid NO_SECRET
const HARDCODED_SECRET = 'hard-fallback-secret-32-chars-minimum-string!'
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
  process.env.NEXTAUTH_SECRET = HARDCODED_SECRET
  console.warn('[NextAuth] NEXTAUTH_SECRET missing, using hardcoded fallback for this route.')
}

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

