import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReportesClient } from './ReportesClient'

export const dynamic = 'force-dynamic'

export default async function ReportesPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return <ReportesClient />
}
