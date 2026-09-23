import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReportesClient } from '../ReportesClient'
import { getCashRegistersLite } from '@/lib/ops-actions'

export const dynamic = 'force-dynamic'

export default async function ReportesCajaPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }
  const registers = await getCashRegistersLite()
  return <ReportesClient registers={registers} initialTab="caja" />
}
