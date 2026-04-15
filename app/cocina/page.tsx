import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPrepQueue, getPrepCategoryKeys, getMyPrepCategories } from '@/lib/actions'
import { ComandasBoard } from '@/components/ComandasBoard'

export const dynamic = 'force-dynamic'

export default async function CocinaPage() {
  const session = await getServerSession(authOptions)
  if (!session || !['COCINA', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'

  const [queue, keys, mine] = await Promise.all([
    getPrepQueue('COCINA'),
    getPrepCategoryKeys(),
    isAdmin ? Promise.resolve([] as string[]) : getMyPrepCategories(),
  ])

  return (
    <ComandasBoard
      station="COCINA"
      title="Comandas — Cocina"
      initialOrders={queue.orders as any[]}
      initialNeedsCategories={queue.needsCategories}
      initialNeedsCajeros={queue.needsCajeros}
      initialUseGlobalRouting={queue.useGlobalRouting}
      initialKeys={keys}
      initialMine={mine}
      initialCajeroMine={[]}
      cajeroOptions={[]}
      isAdmin={isAdmin}
    />
  )
}
