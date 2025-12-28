// IMPORTANT: Import auth-secret FIRST to ensure NEXTAUTH_SECRET is set before NextAuth initializes
import '@/lib/auth-secret'

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

export const runtime = 'nodejs'

