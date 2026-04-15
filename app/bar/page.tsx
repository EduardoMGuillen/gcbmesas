import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getPrepQueue,
  getPrepCategoryKeys,
  getMyPrepCategories,
  getCajerosForBarPickup,
  getMyBarCajeroWatches,
} from '@/lib/actions'
import { ComandasBoard } from '@/components/ComandasBoard'

export const dynamic = 'force-dynamic'

export default async function BarPage() {
  const session = await getServerSession(authOptions)
  if (!session || !['BAR', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'
  const isBarStaff = session.user.role === 'BAR'

  const [queue, keys, mine, cajeroOptions, cajeroMine] = await Promise.all([
    getPrepQueue('BAR'),
    getPrepCategoryKeys(),
    isAdmin ? Promise.resolve([] as string[]) : getMyPrepCategories(),
    !isAdmin && isBarStaff ? getCajerosForBarPickup() : Promise.resolve([] as { id: string; username: string; name: string | null }[]),
    !isAdmin && isBarStaff ? getMyBarCajeroWatches() : Promise.resolve([] as string[]),
  ])

  return (
    <ComandasBoard
      station="BAR"
      title="Comandas — Bar"
      initialOrders={queue.orders as any[]}
      initialNeedsCategories={queue.needsCategories}
      initialNeedsCajeros={queue.needsCajeros}
      initialUseGlobalRouting={queue.useGlobalRouting}
      initialKeys={keys}
      initialMine={mine}
      initialCajeroMine={cajeroMine}
      cajeroOptions={cajeroOptions}
      isAdmin={isAdmin}
    />
  )
}
