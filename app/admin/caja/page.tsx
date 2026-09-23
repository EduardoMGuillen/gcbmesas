import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashOpsData } from '@/lib/ops-actions'
import { CashSessionPanel } from '@/components/CashSessionPanel'

export const dynamic = 'force-dynamic'

export default async function AdminCajaPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  const data = await getCashOpsData()
  return (
    <CashSessionPanel
      registers={data.registers}
      openAll={data.openAll}
      recent={data.recent}
      sessionPreviews={data.sessionPreviews}
    />
  )
}
