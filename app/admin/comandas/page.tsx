import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPrepRoutingAdmin } from '@/lib/actions'
import { ComandasRoutingClient } from './ComandasRoutingClient'

export const dynamic = 'force-dynamic'

export default async function AdminComandasRoutingPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const data = await getPrepRoutingAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Comandas por categoría</h1>
        <p className="text-dark-400 text-sm sm:text-base max-w-2xl">
          Define si cada categoría de inventario va a la cola de <strong className="text-white/90">cocina</strong> o de{' '}
          <strong className="text-white/90">bar</strong>. En bar, cada usuario puede elegir de qué{' '}
          <strong className="text-white/90">cajeros</strong> recibe comandas (en la pantalla Comandas — Bar).
        </p>
      </div>
      <ComandasRoutingClient
        initialKeys={data.keys}
        initialAssignments={data.assignments}
        initialUseGlobal={data.useGlobal}
      />
    </div>
  )
}
