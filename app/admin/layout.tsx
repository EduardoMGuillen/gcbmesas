import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MESERO') redirect('/login')

  return <AdminShell userRole={session.user.role}>{children}</AdminShell>
}
