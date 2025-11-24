import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      redirect('/login')
    }

    if (session.user.role === 'ADMIN') {
      redirect('/admin')
    }

    redirect('/mesero')
  } catch (error) {
    console.error('Error in home page:', error)
    // Redirect to login on error
    redirect('/login')
  }
}

