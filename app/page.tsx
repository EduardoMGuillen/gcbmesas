import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      redirect('/login')
      return
    }

    // Validate session has required fields
    if (!session.user || !session.user.role) {
      console.error('Invalid session data:', session)
      redirect('/login')
      return
    }

    // Redirect based on role
    if (session.user.role === 'ADMIN') {
      redirect('/admin')
      return
    }

    if (session.user.role === 'MESERO') {
      redirect('/mesero')
      return
    }

    // Unknown role, redirect to login
    redirect('/login')
  } catch (error: any) {
    console.error('Error in home page:', error)
    // Redirect to login on error
    redirect('/login')
  }
}

