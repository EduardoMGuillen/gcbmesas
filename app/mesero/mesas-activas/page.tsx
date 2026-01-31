import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { getMeseroActiveTables } from '@/lib/actions'
import { MesasActivasList } from './MesasActivasList'

export const dynamic = 'force-dynamic'

export default async function MesasActivasPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const accounts = await getMeseroActiveTables()
  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <Navbar />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            Mesas Activas
          </h1>
          <p className="text-dark-400">
            Mesas que has abierto con cuentas activas
          </p>
        </div>

        <MesasActivasList accounts={accounts} />
      </main>
      {!isAdmin && <Footer />}
    </div>
  )
}
