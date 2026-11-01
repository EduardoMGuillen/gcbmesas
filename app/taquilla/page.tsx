import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deactivateEventsPastGracePeriod, eventDaysPastInHonduras } from '@/lib/public-events'
import { TaquillaScanClient } from './TaquillaScanClient'

export const dynamic = 'force-dynamic'

export default async function TaquillaPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['TAQUILLA', 'ADMIN', 'MESERO', 'CAJERO'].includes(session.user.role)) {
    redirect('/login')
  }

  await deactivateEventsPastGracePeriod()

  const now = new Date()
  const hondurasHour = new Date(now.getTime() - 6 * 60 * 60 * 1000).getUTCHours()

  const candidateEvents = await prisma.event.findMany({
    where: {
      isActive: true,
      date: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      name: true,
      date: true,
      venueName: true,
      venueAddress: true,
    },
  })

  // Día calendario de Honduras (UTC−6); el evento de anoche sigue visible hasta las 08:00 HN.
  const activeEvents = candidateEvents.filter((event) => {
    const daysPast = eventDaysPastInHonduras(event.date, now)
    return daysPast <= 0 || (daysPast === 1 && hondurasHour < 8)
  })

  return <TaquillaScanClient events={activeEvents} />
}
