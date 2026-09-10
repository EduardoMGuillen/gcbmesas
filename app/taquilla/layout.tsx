import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/staff/AppShell'
import type { StaffRole } from '@/lib/staff-nav'

export default async function TaquillaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (!['TAQUILLA', 'ADMIN', 'MESERO', 'CAJERO'].includes(session.user.role)) {
    redirect('/login')
  }

  return <AppShell userRole={session.user.role as StaffRole}>{children}</AppShell>
}
