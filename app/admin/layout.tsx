import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/staff/AppShell'
import type { StaffRole } from '@/lib/staff-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  const role = session.user.role as StaffRole
  if (!['ADMIN', 'MESERO', 'CAJERO', 'CLIENTE_TICKETERA'].includes(role)) redirect('/login')

  return <AppShell userRole={role}>{children}</AppShell>
}
