import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaquillaScanClient } from './TaquillaScanClient'
import { AttendanceMarkCard } from '@/components/AttendanceMarkCard'

export const dynamic = 'force-dynamic'

export default async function TaquillaPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['TAQUILLA', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeEvents = await prisma.event.findMany({
    where: {
      isActive: true,
      date: { gte: today },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      name: true,
      date: true,
    },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <AttendanceMarkCard compact />
      <TaquillaScanClient events={activeEvents} />
    </div>
  )
}

