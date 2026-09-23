import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExpenses } from '@/lib/ops-actions'
import { ExpensesPanel } from '@/components/ExpensesPanel'

export const dynamic = 'force-dynamic'

export default async function GastosPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const data = await getExpenses(from, to)
  return (
    <ExpensesPanel
      items={data.items}
      total={data.total}
      byCategory={data.byCategory}
      monthFrom={from.toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}
    />
  )
}
