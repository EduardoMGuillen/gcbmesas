import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/staff/AppShell'
import { getWaiterZoneAssignment } from '@/lib/ops-actions'
import { WaiterShiftGate } from '@/components/WaiterZonePicker'
import { formatBusinessDayLabel, getBusinessDate } from '@/lib/business-day'

export default async function MeseroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (!['MESERO', 'ADMIN'].includes(session.user.role)) redirect('/login')

  const assignment = session.user.role === 'MESERO' ? await getWaiterZoneAssignment(session.user.id) : null

  return (
    <AppShell userRole={session.user.role === 'ADMIN' ? 'ADMIN' : 'MESERO'}>
      <WaiterShiftGate
        zone={assignment?.zone || null}
        businessDayLabel={formatBusinessDayLabel(getBusinessDate())}
        role={session.user.role}
      >
        {children}
      </WaiterShiftGate>
    </AppShell>
  )
}
