import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPrepQueue, getPrepCategoryKeys, getMyPrepCategories } from '@/lib/actions'
import { ComandasBoard } from '@/components/ComandasBoard'

export const dynamic = 'force-dynamic'

export default async function BarPage() {
  const session = await getServerSession(authOptions)
  if (!session || !['BAR', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'

  const [queue, keys, mine] = await Promise.all([
    getPrepQueue('BAR'),
    getPrepCategoryKeys(),
    isAdmin ? Promise.resolve([] as string[]) : getMyPrepCategories(),
  ])

  return (
    <ComandasBoard
      station="BAR"
      title="Comandas — Bar"
      initialOrders={queue.orders as any[]}
      initialNeedsCategories={queue.needsCategories}
      initialKeys={keys}
      initialMine={mine}
      isAdmin={isAdmin}
    />
  )
}
