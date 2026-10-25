import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getHalloweenContestants } from '@/lib/contest-actions'
import { ContestPanel } from '@/components/ContestPanel'

export const dynamic = 'force-dynamic'

export default async function ConcursosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  const contestants = await getHalloweenContestants()
  return <ContestPanel contestants={contestants} />
}
