import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/AdminShell'

export default async function MeseroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (!['MESERO', 'ADMIN'].includes(session.user.role)) redirect('/login')

  // En PC, ADMIN usa el sidebar lateral; MESERO usa Navbar (renderizado en cada página)
  if (session.user.role === 'ADMIN') {
    return <AdminShell userRole="ADMIN">{children}</AdminShell>
  }

  return <>{children}</>
}
