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
  const role = session.user.role as 'ADMIN' | 'MESERO' | 'CAJERO'
  if (role !== 'ADMIN' && role !== 'MESERO' && role !== 'CAJERO') redirect('/login')

  return <AdminShell userRole={role}>{children}</AdminShell>
}
