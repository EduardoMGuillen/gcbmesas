import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMeseroActiveTables } from '@/lib/actions'
import { MesasActivasList } from './MesasActivasList'

export const dynamic = 'force-dynamic'

export default async function MesasActivasPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const accounts = await getMeseroActiveTables()

  return <MesasActivasList accounts={accounts} />
}
