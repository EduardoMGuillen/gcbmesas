import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/staff/AppShell'

export default async function CocinaLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!['COCINA', 'ADMIN'].includes(session.user.role)) redirect('/login')

  return (
    <AppShell userRole={session.user.role === 'ADMIN' ? 'ADMIN' : 'COCINA'}>
      {children}
    </AppShell>
  )
}
