import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/AdminShell'

export default async function CajeroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (!['CAJERO', 'ADMIN'].includes(session.user.role)) redirect('/login')

  // En PC, ADMIN usa el sidebar lateral; CAJERO usa Navbar (renderizado en la página)
  if (session.user.role === 'ADMIN') {
    return <AdminShell userRole="ADMIN">{children}</AdminShell>
  }

  return <>{children}</>
}
