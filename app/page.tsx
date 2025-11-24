import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  try {
    const session = await getServerSession(authOptions)

    console.log('Home page - Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      username: session?.user?.username,
      role: session?.user?.role,
    })

    if (!session) {
      console.log('No session found, redirecting to login')
      redirect('/login')
    }

    if (session.user.role === 'ADMIN') {
      console.log('Admin user, redirecting to /admin')
      redirect('/admin')
    }

    console.log('Mesero user, redirecting to /mesero')
    redirect('/mesero')
  } catch (error) {
    console.error('Error in home page:', error)
    // Redirect to login on error
    redirect('/login')
  }
}

